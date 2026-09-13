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
  FormControlLabel,
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
  Close,
  Delete,
  Edit,
  Psychology,
  Refresh,
  Search,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { clearAdminSession } from "../api/session";

interface ExperienceType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  providers_count: number;
  categories_count: number;
  created_at: string;
  updated_at: string;
}

interface ExperienceTypesResponse {
  message: string;
  experience_types: ExperienceType[];
}

interface ExperienceTypeFormState {
  name: string;
  slug: string;
  description: string;
  displayOrder: string;
  isActive: boolean;
}

type StatusFilter = "all" | "active" | "inactive";

const emptyForm: ExperienceTypeFormState = {
  name: "",
  slug: "",
  description: "",
  displayOrder: "0",
  isActive: true,
};

function ExperienceTypesPage() {
  const navigate = useNavigate();

  const [experienceTypes, setExperienceTypes] = useState<ExperienceType[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [formOpen, setFormOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedExperienceType, setSelectedExperienceType] =
    useState<ExperienceType | null>(null);

  const [form, setForm] = useState<ExperienceTypeFormState>(emptyForm);

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

  const fetchExperienceTypes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const parameters = new URLSearchParams();

      parameters.set("status", statusFilter);

      if (appliedSearch) {
        parameters.set("search", appliedSearch);
      }

      const response = await api.get<ExperienceTypesResponse>(
        `/api/experience-types/admin/all?${parameters.toString()}`,
      );

      setExperienceTypes(response.data.experience_types);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load experience types.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch, statusFilter, getApiErrorMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchExperienceTypes();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchExperienceTypes]);

  const handleFormChange = (
    field: keyof ExperienceTypeFormState,
    value: string | boolean,
  ) => {
    if (field === "displayOrder" && typeof value === "string") {
      if (value === "") {
        setForm((currentForm) => ({
          ...currentForm,
          displayOrder: "",
        }));
        return;
      }

      const numericValue = Number(value);

      if (!Number.isInteger(numericValue) || numericValue < 0) {
        return;
      }
    }

    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleOpenCreate = () => {
    setSelectedExperienceType(null);
    setForm(emptyForm);
    setErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  };

  const handleOpenEdit = (experienceType: ExperienceType) => {
    setSelectedExperienceType(experienceType);

    setForm({
      name: experienceType.name,
      slug: experienceType.slug,
      description: experienceType.description ?? "",
      displayOrder: String(experienceType.display_order),
      isActive: experienceType.is_active,
    });

    setErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSaving) {
      return;
    }

    setFormOpen(false);
    setSelectedExperienceType(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (form.name.trim().length < 2) {
      setErrorMessage(
        "Experience type name must contain at least 2 characters.",
      );

      return;
    }

    const displayOrder = Number(form.displayOrder);

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setErrorMessage("Display order must be a non-negative whole number.");

      return;
    }

    setIsSaving(true);

    const requestBody = {
      name: form.name.trim(),

      slug: form.slug.trim().length > 0 ? form.slug.trim() : undefined,

      description:
        form.description.trim().length > 0 ? form.description.trim() : null,

      displayOrder,

      isActive: form.isActive,
    };

    try {
      if (selectedExperienceType) {
        await api.patch(
          `/api/experience-types/admin/${selectedExperienceType.id}`,
          requestBody,
        );

        setSuccessMessage("Experience type updated successfully.");
      } else {
        await api.post("/api/experience-types/admin", requestBody);

        setSuccessMessage("Experience type created successfully.");
      }

      setFormOpen(false);
      setSelectedExperienceType(null);
      setForm(emptyForm);

      await fetchExperienceTypes();
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not save experience type.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (experienceType: ExperienceType) => {
    setStatusUpdatingId(experienceType.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(`/api/experience-types/admin/${experienceType.id}`, {
        isActive: !experienceType.is_active,
      });

      setSuccessMessage(
        experienceType.is_active
          ? "Experience type disabled successfully."
          : "Experience type enabled successfully.",
      );

      await fetchExperienceTypes();
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not update experience type status.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleOpenDelete = (experienceType: ExperienceType) => {
    setSelectedExperienceType(experienceType);
    setDeleteDialogOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseDelete = () => {
    if (isDeleting) {
      return;
    }

    setDeleteDialogOpen(false);
    setSelectedExperienceType(null);
  };

  const handleDelete = async () => {
    if (!selectedExperienceType) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.delete(
        `/api/experience-types/admin/${selectedExperienceType.id}`,
      );

      setSuccessMessage("Experience type deleted successfully.");

      setDeleteDialogOpen(false);
      setSelectedExperienceType(null);

      await fetchExperienceTypes();
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not delete experience type.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setStatusFilter("all");
  };

  const hasActiveFilters = Boolean(appliedSearch) || statusFilter !== "all";

  const activeCount = experienceTypes.filter((item) => item.is_active).length;

  const inactiveCount = experienceTypes.length - activeCount;

  const totalProviders = experienceTypes.reduce(
    (total, item) => total + item.providers_count,
    0,
  );

  return (
    <AdminLayout title="Experience Types">
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
            Experience Types
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Manage provider skills used for job matching and service categories.
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
            onClick={() => void fetchExperienceTypes()}
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
            onClick={handleOpenCreate}
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
            Add Experience Type
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
            label: "Total Types",
            value: experienceTypes.length,
            color: "#2563eb",
            background: "#eff6ff",
          },

          {
            label: "Active",
            value: activeCount,
            color: "#15803d",
            background: "#f0fdf4",
          },

          {
            label: "Inactive",
            value: inactiveCount,
            color: "#64748b",
            background: "#f1f5f9",
          },

          {
            label: "Provider Links",
            value: totalProviders,
            color: "#7c3aed",
            background: "#f5f3ff",
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
                <Psychology
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
              Search by name, slug or description.
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

              md: "minmax(280px, 2fr) minmax(160px, 1fr) auto",
            },

            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            label="Search experience types"
            placeholder="Name, slug or description"
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
            <InputLabel id="experience-status-label">Status</InputLabel>

            <Select
              labelId="experience-status-label"
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
          {experienceTypes.length} experience type
          {experienceTypes.length === 1 ? "" : "s"} found
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
            Loading experience types...
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
              minWidth: 1000,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>

                <TableCell>Experience Type</TableCell>

                <TableCell>Description</TableCell>

                <TableCell>Providers</TableCell>

                <TableCell>Categories</TableCell>

                <TableCell>Status</TableCell>

                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {experienceTypes.map((experienceType) => {
                const isLinked =
                  experienceType.providers_count > 0 ||
                  experienceType.categories_count > 0;

                return (
                  <TableRow
                    key={experienceType.id}
                    hover
                    sx={{
                      "&:hover": {
                        bgcolor: "#f8fafc",
                      },
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={experienceType.display_order}
                        size="small"
                        sx={{
                          minWidth: 34,
                          height: 25,
                          bgcolor: "#f1f5f9",

                          color: "#475569",

                          fontWeight: 750,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13.5,

                          fontWeight: 750,

                          color: "#0f172a",
                        }}
                      >
                        {experienceType.name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 10.5,

                          color: "#94a3b8",
                        }}
                      >
                        {experienceType.slug}
                      </Typography>
                    </TableCell>

                    <TableCell
                      sx={{
                        maxWidth: 360,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12,
                          lineHeight: 1.5,

                          color: experienceType.description
                            ? "#475569"
                            : "#94a3b8",

                          overflow: "hidden",

                          textOverflow: "ellipsis",

                          display: "-webkit-box",

                          WebkitLineClamp: 2,

                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {experienceType.description || "No description"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={experienceType.providers_count}
                        size="small"
                        sx={{
                          minWidth: 34,
                          height: 25,
                          bgcolor:
                            experienceType.providers_count > 0
                              ? "#eff6ff"
                              : "#f8fafc",

                          color:
                            experienceType.providers_count > 0
                              ? "#1d4ed8"
                              : "#64748b",

                          fontWeight: 750,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={experienceType.categories_count}
                        size="small"
                        sx={{
                          minWidth: 34,
                          height: 25,
                          bgcolor:
                            experienceType.categories_count > 0
                              ? "#f5f3ff"
                              : "#f8fafc",

                          color:
                            experienceType.categories_count > 0
                              ? "#7c3aed"
                              : "#64748b",

                          fontWeight: 750,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={experienceType.is_active ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          height: 27,
                          fontSize: 11,
                          fontWeight: 700,

                          color: experienceType.is_active
                            ? "#15803d"
                            : "#64748b",

                          bgcolor: experienceType.is_active
                            ? "#f0fdf4"
                            : "#f1f5f9",

                          border: experienceType.is_active
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
                            experienceType.is_active
                              ? "Disable experience type"
                              : "Enable experience type"
                          }
                        >
                          <span>
                            <Switch
                              checked={experienceType.is_active}
                              disabled={statusUpdatingId === experienceType.id}
                              onChange={() =>
                                void handleToggleStatus(experienceType)
                              }
                              size="small"
                              color="success"
                            />
                          </span>
                        </Tooltip>

                        <Tooltip title="Edit experience type">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(experienceType)}
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

                        <Tooltip
                          title={
                            isLinked
                              ? "Linked experience types cannot be deleted"
                              : "Delete experience type"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={isLinked}
                              onClick={() => handleOpenDelete(experienceType)}
                              sx={{
                                border: "1px solid #fecaca",

                                borderRadius: 2,

                                color: "#dc2626",

                                "&:hover": {
                                  bgcolor: "#fef2f2",
                                },

                                "&.Mui-disabled": {
                                  color: "#cbd5e1",

                                  borderColor: "#e2e8f0",
                                },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}

              {experienceTypes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{
                      py: 8,
                    }}
                  >
                    <Psychology
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
                      No experience types found
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

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        open={formOpen}
        onClose={handleCloseForm}
        fullWidth
        maxWidth="sm"
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
                {selectedExperienceType
                  ? "Edit Experience Type"
                  : "Add Experience Type"}
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {selectedExperienceType
                  ? "Update the experience type details."
                  : "Create a new provider skill category."}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={handleCloseForm}
              disabled={isSaving}
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
          <Box
            sx={{
              display: "grid",
              gap: 2,
            }}
          >
            <TextField
              label="Experience Type Name"
              value={form.name}
              onChange={(event) => handleFormChange("name", event.target.value)}
              fullWidth
              required
              size="small"
            />

            <TextField
              label="Slug"
              value={form.slug}
              onChange={(event) => handleFormChange("slug", event.target.value)}
              fullWidth
              size="small"
              helperText="Leave empty to generate automatically"
            />

            <TextField
              label="Description"
              value={form.description}
              onChange={(event) =>
                handleFormChange("description", event.target.value)
              }
              fullWidth
              multiline
              rows={4}
            />

            <TextField
              label="Display Order"
              type="number"
              value={form.displayOrder}
              onChange={(event) =>
                handleFormChange("displayOrder", event.target.value)
              }
              fullWidth
              required
              size="small"
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: 1,
                },
              }}
              helperText="Minimum 0 · whole numbers only"
            />

            <Paper
              elevation={0}
              sx={{
                p: 1.7,
                borderRadius: 2.5,
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(event) =>
                      handleFormChange("isActive", event.target.checked)
                    }
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 750,
                        color: "#334155",
                      }}
                    >
                      {form.isActive ? "Active" : "Inactive"}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.2,
                        fontSize: 10.5,
                        color: "#64748b",
                      }}
                    >
                      {form.isActive
                        ? "Providers can use this experience type."
                        : "This experience type will be disabled."}
                    </Typography>
                  </Box>
                }
                sx={{
                  m: 0,
                }}
              />
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
          }}
        >
          <Button
            onClick={handleCloseForm}
            disabled={isSaving}
            sx={{
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={isSaving}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isSaving
              ? "Saving..."
              : selectedExperienceType
                ? "Save Changes"
                : "Create Experience Type"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
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

              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Delete Experience Type
            </Typography>

            <Typography
              sx={{
                mt: 0.3,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              This action cannot be undone.
            </Typography>
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
              borderRadius: 2.5,
            }}
          >
            Are you sure you want to permanently delete{" "}
            <strong>{selectedExperienceType?.name}</strong>?
          </Alert>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
          }}
        >
          <Button
            onClick={handleCloseDelete}
            disabled={isDeleting}
            sx={{
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            startIcon={<Delete />}
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}

export default ExperienceTypesPage;
