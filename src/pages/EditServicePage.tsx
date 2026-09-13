import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack,
  Category as CategoryIcon,
  Payments,
  Save,
  Schedule,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router";
import api from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { clearAdminSession } from "../api/session";

interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

interface CategoriesResponse {
  message: string;
  categories: Category[];
}

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

interface ServiceResponse {
  message: string;
  service: Service;
}

function EditServicePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const serviceId = Number(id);

      if (!Number.isInteger(serviceId) || serviceId <= 0) {
        setErrorMessage("Invalid service ID.");
        return;
      }

      const [categoryResponse, serviceResponse] = await Promise.all([
        api.get<CategoriesResponse>("/api/categories/admin/all"),
        api.get<ServiceResponse>(`/api/services/admin/${serviceId}`),
      ]);

      setCategories(categoryResponse.data.categories);

      const service = serviceResponse.data.service;

      setName(service.name);

      setDescription(service.description ?? "");

      setBasePrice(service.base_price);

      setDurationMinutes(
        service.duration_minutes ? String(service.duration_minutes) : "",
      );

      setCategoryId(service.category_id ? String(service.category_id) : "");

      setIsActive(service.is_active);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load service details.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, getApiErrorMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPageData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchPageData]);

  const handleBasePriceChange = (value: string) => {
    if (value !== "" && Number(value) < 0) {
      return;
    }

    setBasePrice(value);
  };

  const handleDurationChange = (value: string) => {
    if (value === "") {
      setDurationMinutes("");
      return;
    }

    const numericValue = Number(value);

    if (!Number.isInteger(numericValue) || numericValue < 1) {
      return;
    }

    setDurationMinutes(value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const serviceId = Number(id);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      setErrorMessage("Invalid service ID.");
      return;
    }

    if (name.trim().length < 2) {
      setErrorMessage("Service name must contain at least 2 characters.");

      return;
    }

    if (!categoryId) {
      setErrorMessage("Please select a service category.");

      return;
    }

    const parsedBasePrice = Number(basePrice);

    if (!Number.isFinite(parsedBasePrice) || parsedBasePrice < 0) {
      setErrorMessage("Base price must be a valid non-negative amount.");

      return;
    }

    let parsedDuration: number | null = null;

    if (durationMinutes.trim().length > 0) {
      parsedDuration = Number(durationMinutes);

      if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
        setErrorMessage("Duration must be a positive whole number.");

        return;
      }
    }

    setIsSaving(true);

    try {
      await api.patch(`/api/services/${serviceId}`, {
        name: name.trim(),

        description: description.trim().length > 0 ? description.trim() : null,

        basePrice: parsedBasePrice,

        durationMinutes: parsedDuration,

        categoryId: Number(categoryId),

        isActive,
      });

      setSuccessMessage("Service updated successfully.");

      window.setTimeout(() => {
        navigate("/services");
      }, 600);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not update service.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Edit Service">
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: {
            xs: "column",
            sm: "row",
          },
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/services")}
            sx={{
              minWidth: "auto",
              px: 1.6,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#475569",
              borderColor: "#e2e8f0",

              "&:hover": {
                bgcolor: "#f8fafc",
                borderColor: "#cbd5e1",
              },
            }}
          >
            Back
          </Button>

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
              Edit Service
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                fontSize: 13.5,
                color: "#64748b",
              }}
            >
              Update category, pricing, duration and availability.
            </Typography>
          </Box>
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
        >
          {successMessage}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          maxWidth: 860,
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          bgcolor: "#ffffff",
        }}
      >
        <Box
          sx={{
            px: {
              xs: 2,
              sm: 3,
            },
            py: 2.3,
            display: "flex",
            alignItems: "center",
            gap: 1.3,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 2.5,
              bgcolor: "#eff6ff",
              color: "#2563eb",
              display: "grid",
              placeItems: "center",
            }}
          >
            <CategoryIcon
              sx={{
                fontSize: 21,
              }}
            />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Service Information
            </Typography>

            <Typography
              sx={{
                mt: 0.2,
                fontSize: 11.5,
                color: "#64748b",
              }}
            >
              Edit the customer-facing service details.
            </Typography>
          </Box>
        </Box>

        {isLoading ? (
          <Box
            sx={{
              minHeight: 360,
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
              Loading service...
            </Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Box
              sx={{
                p: {
                  xs: 2,
                  sm: 3,
                },
                display: "grid",
                gap: 2.2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    mb: 0.7,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Category
                </Typography>

                <FormControl fullWidth required size="small">
                  <InputLabel id="edit-service-category-label">
                    Service Category
                  </InputLabel>

                  <Select
                    labelId="edit-service-category-label"
                    label="Service Category"
                    value={categoryId}
                    onChange={(event) =>
                      setCategoryId(String(event.target.value))
                    }
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={String(category.id)}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            width: "100%",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 13,
                            }}
                          >
                            {category.name}
                          </Typography>

                          {!category.is_active && (
                            <Chip
                              label="Inactive"
                              size="small"
                              sx={{
                                ml: "auto",
                                height: 21,
                                fontSize: 9,
                                bgcolor: "#fffbeb",
                                color: "#b45309",
                                fontWeight: 700,
                              }}
                            />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography
                  sx={{
                    mb: 0.7,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Service name
                </Typography>

                <TextField
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  fullWidth
                  required
                  size="small"
                  placeholder="Enter service name"
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    mb: 0.7,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Description
                </Typography>

                <TextField
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Describe what this service includes"
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      mb: 0.7,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                    }}
                  >
                    Base Price
                  </Typography>

                  <TextField
                    type="number"
                    value={basePrice}
                    onChange={(event) =>
                      handleBasePriceChange(event.target.value)
                    }
                    fullWidth
                    required
                    size="small"
                    placeholder="0.00"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Payments
                            sx={{
                              mr: 1,
                              fontSize: 19,
                              color: "#94a3b8",
                            }}
                          />
                        ),
                      },

                      htmlInput: {
                        min: 0,
                        step: 0.01,
                      },
                    }}
                    helperText="Amount in NPR · minimum 0"
                  />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      mb: 0.7,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#475569",
                    }}
                  >
                    Duration
                  </Typography>

                  <TextField
                    type="number"
                    value={durationMinutes}
                    onChange={(event) =>
                      handleDurationChange(event.target.value)
                    }
                    fullWidth
                    size="small"
                    placeholder="e.g. 60"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Schedule
                            sx={{
                              mr: 1,
                              fontSize: 19,
                              color: "#94a3b8",
                            }}
                          />
                        ),
                      },

                      htmlInput: {
                        min: 1,
                        step: 1,
                      },
                    }}
                    helperText="Optional · minimum 1 minute"
                  />
                </Box>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 1.8,
                  borderRadius: 2.5,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
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
                        {isActive ? "Active Service" : "Inactive Service"}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 10.5,
                          lineHeight: 1.5,
                          color: "#64748b",
                        }}
                      >
                        {isActive
                          ? "Customers can book this service."
                          : "This service will not be available for new bookings."}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    m: 0,
                  }}
                />
              </Paper>
            </Box>

            <Box
              sx={{
                px: {
                  xs: 2,
                  sm: 3,
                },
                py: 2.3,
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: 1.2,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => navigate("/services")}
                disabled={isSaving}
                sx={{
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: "#e2e8f0",
                  color: "#475569",
                }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                startIcon={!isSaving ? <Save /> : undefined}
                disabled={isSaving}
                sx={{
                  minWidth: 145,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  boxShadow: "none",

                  "&:hover": {
                    boxShadow: "none",
                  },
                }}
              >
                {isSaving ? (
                  <>
                    <CircularProgress
                      size={17}
                      color="inherit"
                      sx={{
                        mr: 1,
                      }}
                    />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </AdminLayout>
  );
}

export default EditServicePage;
