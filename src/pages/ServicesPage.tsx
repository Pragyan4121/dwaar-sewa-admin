import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  Build,
  Category as CategoryIcon,
  Close,
  Delete,
  Edit,
  Refresh,
  Search,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { clearAdminSession } from "../api/session";

interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
}

interface Service {
  id: number;
  name: string;
  description: string | null;
  base_price: string;
  duration_minutes: number | null;
  is_active: boolean;
  category_id: number | null;
  created_at: string;
  updated_at: string;
  service_categories: ServiceCategory | null;
}

interface ServicesResponse {
  message: string;
  services: Service[];
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  services_count: number;
}

interface CategoriesResponse {
  message: string;
  categories: Category[];
}

type StatusFilter = "all" | "active" | "inactive";

const formatMoney = (value: string | number) => {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "NPR 0.00";
  }

  return `NPR ${numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function ServicesPage() {
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isStatusUpdating, setIsStatusUpdating] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  const [searchInput, setSearchInput] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const handleAuthenticationError = useCallback(
    (status?: number) => {
      if (status === 401 || status === 403) {
        clearAdminSession();

        navigate("/login");

        return true;
      }

      return false;
    },
    [navigate],
  );

  const getApiErrorMessage = useCallback(
    (error: unknown, fallbackMessage: string): string | null => {
      if (typeof error === "object" && error !== null && "response" in error) {
        const apiError = error as {
          response?: {
            status?: number;

            data?: {
              message?: string;
            };
          };
        };

        if (handleAuthenticationError(apiError.response?.status)) {
          return null;
        }

        return apiError.response?.data?.message || fallbackMessage;
      }

      return fallbackMessage;
    },
    [handleAuthenticationError],
  );

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get<CategoriesResponse>(
        "/api/categories/admin/all",
      );

      setCategories(response.data.categories);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load service categories.",
      );

      if (message) {
        setErrorMessage(message);
      }
    }
  }, [getApiErrorMessage]);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const searchParams = new URLSearchParams();

      if (categoryFilter !== "all") {
        searchParams.set("categoryId", categoryFilter);
      }

      searchParams.set("status", statusFilter);

      if (appliedSearch.trim().length > 0) {
        searchParams.set("search", appliedSearch.trim());
      }

      const queryString = searchParams.toString();

      const response = await api.get<ServicesResponse>(
        `/api/services/admin/all${queryString ? `?${queryString}` : ""}`,
      );

      setServices(response.data.services);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load services.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getApiErrorMessage, categoryFilter, statusFilter, appliedSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCategories();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchServices();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchServices]);

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const handleToggleStatus = async (service: Service) => {
    setIsStatusUpdating(service.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(`/api/services/${service.id}`, {
        isActive: !service.is_active,
      });

      setSuccessMessage(
        service.is_active
          ? "Service disabled successfully."
          : "Service enabled successfully.",
      );

      await fetchServices();
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not update service status.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsStatusUpdating(null);
    }
  };

  const handleOpenDeleteDialog = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) {
      return;
    }

    setDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.delete(`/api/services/admin/${serviceToDelete.id}`);

      setSuccessMessage("Service deleted successfully.");

      setDeleteDialogOpen(false);
      setServiceToDelete(null);

      await fetchServices();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not delete service.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters =
    Boolean(appliedSearch) ||
    categoryFilter !== "all" ||
    statusFilter !== "all";

  const activeServices = services.filter((service) => service.is_active).length;

  const inactiveServices = services.length - activeServices;

  const uncategorizedServices = services.filter(
    (service) => !service.service_categories,
  ).length;

  return (
    <AdminLayout title="Services">
      {/* HEADER */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          flexDirection: {
            xs: "column",
            sm: "row",
          },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: {
                xs: 26,
                md: 30,
              },
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.035em",
            }}
          >
            Service Management
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Add, organize, price and control customer services.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => void fetchServices()}
            disabled={isLoading}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#334155",
              borderColor: "#e2e8f0",
              bgcolor: "#ffffff",

              "&:hover": {
                borderColor: "#cbd5e1",
                bgcolor: "#f8fafc",
              },
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate("/services/add")}
            sx={{
              px: 2.2,
              py: 1,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",

              "&:hover": {
                boxShadow: "none",
              },
            }}
          >
            Add Service
          </Button>
        </Box>
      </Box>

      {errorMessage && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 3,
          }}
          onClose={() => setErrorMessage("")}
        >
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert
          severity="success"
          sx={{
            mb: 3,
            borderRadius: 3,
          }}
          onClose={() => setSuccessMessage("")}
        >
          {successMessage}
        </Alert>
      )}

      {/* SUMMARY */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1.5,
          mb: 3,
        }}
      >
        {[
          {
            label: "Total Services",
            value: services.length,
            color: "#2563eb",
            background: "#eff6ff",
          },
          {
            label: "Active",
            value: activeServices,
            color: "#15803d",
            background: "#f0fdf4",
          },
          {
            label: "Inactive",
            value: inactiveServices,
            color: "#64748b",
            background: "#f1f5f9",
          },
          {
            label: "Uncategorized",
            value: uncategorizedServices,
            color: "#dc2626",
            background: "#fef2f2",
          },
        ].map((item) => (
          <Paper
            key={item.label}
            elevation={0}
            sx={{
              p: 2.2,
              minHeight: 112,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",

              transition: "transform 180ms ease, box-shadow 180ms ease",

              "&:hover": {
                transform: "translateY(-2px)",

                boxShadow: "0 12px 26px rgba(15,23,42,0.07)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 10.5,
                    fontWeight: 750,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.055em",
                  }}
                >
                  {item.label}
                </Typography>

                <Typography
                  sx={{
                    mt: 1.2,
                    fontSize: 29,
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1,
                  }}
                >
                  {item.value}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  bgcolor: item.background,
                  color: item.color,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Build
                  sx={{
                    fontSize: 21,
                  }}
                />
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* FILTERS */}
      <Paper
        elevation={0}
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },
          mb: 2.5,
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
        }}
      >
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Search & filters
            </Typography>

            <Typography
              sx={{
                mt: 0.2,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Search by service name, description or category.
            </Typography>
          </Box>

          {hasActiveFilters && (
            <Button
              size="small"
              onClick={handleClearFilters}
              sx={{
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Clear all
            </Button>
          )}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(280px, 2fr) minmax(170px, 1fr) minmax(150px, 1fr) auto",
            },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            label="Search services"
            placeholder="Name, description or category"
            size="small"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    sx={{
                      mr: 1,
                      fontSize: 20,
                      color: "#94a3b8",
                    }}
                  />
                ),
              },
            }}
          />

          <FormControl fullWidth size="small">
            <InputLabel id="category-filter-label">Category</InputLabel>

            <Select
              labelId="category-filter-label"
              label="Category"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(String(event.target.value))
              }
            >
              <MenuItem value="all">All Categories</MenuItem>

              {categories.map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="status-filter-label">Status</InputLabel>

            <Select
              labelId="status-filter-label"
              label="Status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
            >
              <MenuItem value="all">All Statuses</MenuItem>

              <MenuItem value="active">Active</MenuItem>

              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={handleSearch}
            sx={{
              minHeight: 40,
              px: 2.2,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",

              "&:hover": {
                boxShadow: "none",
              },
            }}
          >
            Search
          </Button>
        </Box>

        <Typography
          sx={{
            mt: 1.8,
            textAlign: {
              xs: "left",
              md: "right",
            },
            fontSize: 11.5,
            color: "#64748b",
          }}
        >
          {services.length} service
          {services.length === 1 ? "" : "s"} found
        </Typography>
      </Paper>

      {/* TABLE */}
      {isLoading ? (
        <Box
          sx={{
            minHeight: 350,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
          <CircularProgress size={34} />

          <Typography
            sx={{
              fontSize: 13,
              color: "#64748b",
            }}
          >
            Loading services...
          </Typography>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3.5,
            overflowX: "auto",
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",

            "& .MuiTableCell-head": {
              bgcolor: "#f8fafc",
              color: "#475569",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.045em",
              borderBottom: "1px solid #e2e8f0",
              whiteSpace: "nowrap",
            },

            "& .MuiTableCell-body": {
              borderBottom: "1px solid #f1f5f9",
              py: 1.7,
            },
          }}
        >
          <Table
            sx={{
              minWidth: 1200,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>

                <TableCell>Service</TableCell>

                <TableCell>Category</TableCell>

                <TableCell>Description</TableCell>

                <TableCell>Base Price</TableCell>

                <TableCell>Duration</TableCell>

                <TableCell>Status</TableCell>

                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {services.map((service) => (
                <TableRow
                  key={service.id}
                  hover
                  sx={{
                    "&:hover": {
                      bgcolor: "#f8fafc",
                    },
                  }}
                >
                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 750,
                        color: "#64748b",
                      }}
                    >
                      #{service.id}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        fontWeight: 750,
                        color: "#0f172a",
                      }}
                    >
                      {service.name}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {service.service_categories ? (
                      <Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.6,
                          }}
                        >
                          <CategoryIcon
                            sx={{
                              fontSize: 15,
                              color: "#64748b",
                            }}
                          />

                          <Typography
                            sx={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "#334155",
                            }}
                          >
                            {service.service_categories.name}
                          </Typography>
                        </Box>

                        {!service.service_categories.is_active && (
                          <Chip
                            label="Category inactive"
                            size="small"
                            sx={{
                              mt: 0.6,
                              height: 22,
                              fontSize: 9.5,
                              fontWeight: 700,
                              bgcolor: "#fffbeb",
                              color: "#b45309",
                            }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Chip
                        label="Uncategorized"
                        size="small"
                        sx={{
                          height: 25,
                          bgcolor: "#fef2f2",
                          color: "#b91c1c",
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </TableCell>

                  <TableCell
                    sx={{
                      maxWidth: 330,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: service.description ? "#475569" : "#94a3b8",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {service.description || "No description"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: "#15803d",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMoney(service.base_price)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: service.duration_minutes ? "#334155" : "#94a3b8",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {service.duration_minutes
                        ? `${service.duration_minutes} min`
                        : "Not set"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={service.is_active ? "Active" : "Inactive"}
                      size="small"
                      sx={{
                        height: 27,
                        fontSize: 11,
                        fontWeight: 700,

                        color: service.is_active ? "#15803d" : "#64748b",

                        bgcolor: service.is_active ? "#f0fdf4" : "#f1f5f9",

                        border: service.is_active
                          ? "1px solid #bbf7d0"
                          : "1px solid #e2e8f0",
                      }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <Tooltip
                        title={
                          service.is_active
                            ? "Disable service"
                            : "Enable service"
                        }
                      >
                        <span>
                          <Switch
                            checked={service.is_active}
                            disabled={isStatusUpdating === service.id}
                            onChange={() => void handleToggleStatus(service)}
                            size="small"
                            color="success"
                          />
                        </span>
                      </Tooltip>

                      <Tooltip title="Edit service">
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(`/services/${service.id}/edit`)
                          }
                          sx={{
                            border: "1px solid #bfdbfe",
                            borderRadius: 2,
                            color: "#2563eb",

                            "&:hover": {
                              bgcolor: "#eff6ff",
                            },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete service">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDeleteDialog(service)}
                          sx={{
                            border: "1px solid #fecaca",
                            borderRadius: 2,
                            color: "#dc2626",

                            "&:hover": {
                              bgcolor: "#fef2f2",
                            },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {services.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{
                      py: 8,
                    }}
                  >
                    <Build
                      sx={{
                        fontSize: 42,
                        color: "#cbd5e1",
                      }}
                    />

                    <Typography
                      sx={{
                        mt: 1,
                        fontSize: 14,
                        fontWeight: 750,
                        color: "#334155",
                      }}
                    >
                      No services found
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.3,
                        fontSize: 12,
                        color: "#94a3b8",
                      }}
                    >
                      Try changing your search or filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* DELETE DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              overflow: "hidden",
            },
          },
        }}
      >
        <DialogTitle sx={{ p: 0 }}>
          <Box
            sx={{
              px: 3,
              py: 2.4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Delete Service
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Permanent deletion
              </Typography>
            </Box>

            <IconButton
              size="small"
              disabled={isDeleting}
              onClick={handleCloseDeleteDialog}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            pt: "24px !important",
          }}
        >
          <Alert
            severity="warning"
            sx={{
              mb: 2,
              borderRadius: 2.5,
            }}
          >
            A service can only be deleted if it has never been used in a
            booking.
          </Alert>

          <Typography
            sx={{
              fontSize: 13.5,
              color: "#334155",
              lineHeight: 1.7,
            }}
          >
            Are you sure you want to permanently delete{" "}
            <strong>{serviceToDelete?.name}</strong>?
          </Typography>

          <Typography
            sx={{
              mt: 1,
              fontSize: 11.5,
              lineHeight: 1.6,
              color: "#64748b",
            }}
          >
            If this service already has booking history, the backend will
            prevent deletion. You can disable the service instead.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
          }}
        >
          <Button
            onClick={handleCloseDeleteDialog}
            disabled={isDeleting}
            sx={{
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            startIcon={<Delete />}
            onClick={() => void handleDeleteService()}
            disabled={isDeleting}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isDeleting ? "Deleting..." : "Delete Service"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}

export default ServicesPage;
