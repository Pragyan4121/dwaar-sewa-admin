import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  Paper,
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
  Category as CategoryIcon,
  Close,
  Delete,
  Edit,
  ImageOutlined,
  PlaylistAddCheck,
  Refresh,
  UploadFile,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import { clearAdminSession } from "../api/session";
import AdminLayout from "../layouts/AdminLayout";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  services_count: number;
  created_at: string;
  updated_at: string;
}

interface CategoriesResponse {
  message: string;
  categories: Category[];
}

interface CategoryImageUploadResponse {
  message: string;
  imageUrl: string;
}

interface CategoryExperienceType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_linked: boolean;
}

interface CategoryExperienceTypesResponse {
  message: string;

  category: {
    id: number;
    name: string;
  };

  experience_types: CategoryExperienceType[];
}

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  displayOrder: string;
  isActive: boolean;
}

const emptyCategoryForm: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  displayOrder: "0",
  isActive: true,
};

const getCategoryImageSource = (imageUrl: string | null) => {
  if (!imageUrl) {
    return "";
  }

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("blob:") ||
    imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }

  const configuredBaseUrl = String(
    api.defaults.baseURL ?? "http://localhost:3000",
  ).replace(/\/$/, "");

  const backendBaseUrl = configuredBaseUrl.endsWith("/api")
    ? configuredBaseUrl.slice(0, -4)
    : configuredBaseUrl;

  return `${backendBaseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

function CategoriesPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  const [formErrorMessage, setFormErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const [form, setForm] = useState<CategoryFormState>(emptyCategoryForm);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false);

  const [experienceCategory, setExperienceCategory] = useState<Category | null>(
    null,
  );

  const [experienceTypes, setExperienceTypes] = useState<
    CategoryExperienceType[]
  >([]);

  const [isExperienceLoading, setIsExperienceLoading] = useState(false);

  const [isExperienceSaving, setIsExperienceSaving] = useState(false);

  const [experienceError, setExperienceError] = useState("");

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
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get<CategoriesResponse>(
        "/api/categories/admin/all",
      );

      setCategories(
        [...response.data.categories].sort((a, b) => {
          if (a.display_order !== b.display_order) {
            return a.display_order - b.display_order;
          }

          return a.id - b.id;
        }),
      );
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load categories.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getApiErrorMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCategories();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchCategories]);

  const handleOpenCreate = () => {
    setSelectedCategory(null);
    setForm(emptyCategoryForm);
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setErrorMessage("");
    setFormErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setSelectedCategory(category);

    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      imageUrl: category.image_url ?? "",
      displayOrder: String(category.display_order),
      isActive: category.is_active,
    });

    setSelectedImageFile(null);
    setImagePreviewUrl(getCategoryImageSource(category.image_url));
    setErrorMessage("");
    setFormErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSaving || isUploadingImage) {
      return;
    }

    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setFormOpen(false);
    setSelectedCategory(null);
    setForm(emptyCategoryForm);
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setFormErrorMessage("");
  };

  const handleFormChange = (
    field: keyof CategoryFormState,
    value: string | boolean,
  ) => {
    if (field === "displayOrder" && typeof value === "string") {
      if (value === "") {
        setForm((currentForm) => ({
          ...currentForm,
          displayOrder: "",
        }));
        setFormErrorMessage("");
        return;
      }

      const numericValue = Number(value);

      if (!Number.isInteger(numericValue) || numericValue < 0) {
        return;
      }
    }

    setFormErrorMessage("");

    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleImageSelection = (file: File | null) => {
    setFormErrorMessage("");

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setFormErrorMessage("Only JPG, PNG and WebP images are allowed.");
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      setFormErrorMessage("Category image must be 5 MB or smaller.");
      return;
    }

    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedImageFile(file);
    setImagePreviewUrl(previewUrl);
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setForm((currentForm) => ({
      ...currentForm,
      imageUrl: "",
    }));
    setFormErrorMessage("");
  };

  const uploadSelectedCategoryImage = async () => {
    if (!selectedImageFile) {
      return form.imageUrl;
    }

    setIsUploadingImage(true);

    try {
      const uploadData = new FormData();
      uploadData.append("image", selectedImageFile);

      const response = await api.post<CategoryImageUploadResponse>(
        "/api/categories/admin/upload-image",
        uploadData,
      );

      return response.data.imageUrl;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setErrorMessage("");
    setFormErrorMessage("");
    setSuccessMessage("");

    if (form.name.trim().length < 2) {
      setFormErrorMessage("Category name must contain at least 2 characters.");
      return;
    }

    const displayOrder = Number(form.displayOrder);

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setFormErrorMessage("Display order must be a non-negative whole number.");
      return;
    }

    const duplicateDisplayOrder = categories.some(
      (category) =>
        category.display_order === displayOrder &&
        category.id !== selectedCategory?.id,
    );

    if (duplicateDisplayOrder) {
      setFormErrorMessage(
        `Display order ${displayOrder} is already assigned to another category.`,
      );
      return;
    }

    setIsSaving(true);

    try {
      const uploadedImageUrl = await uploadSelectedCategoryImage();

      const requestBody = {
        name: form.name.trim(),

        slug: form.slug.trim().length > 0 ? form.slug.trim() : undefined,

        description:
          form.description.trim().length > 0 ? form.description.trim() : null,

        imageUrl:
          uploadedImageUrl.trim().length > 0 ? uploadedImageUrl.trim() : null,

        displayOrder,

        isActive: form.isActive,
      };

      if (selectedCategory) {
        await api.patch(
          `/api/categories/admin/${selectedCategory.id}`,
          requestBody,
        );

        setSuccessMessage("Category updated successfully.");
      } else {
        await api.post("/api/categories/admin", requestBody);

        setSuccessMessage("Category created successfully.");
      }

      if (imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }

      setFormOpen(false);
      setSelectedCategory(null);
      setForm(emptyCategoryForm);
      setSelectedImageFile(null);
      setImagePreviewUrl("");

      await fetchCategories();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not save category.");

      if (message) {
        setFormErrorMessage(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCloseDelete = () => {
    if (isDeleting) {
      return;
    }

    setDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  const handleDelete = async () => {
    if (!selectedCategory) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.delete(`/api/categories/admin/${selectedCategory.id}`);

      setSuccessMessage("Category deleted successfully.");

      setDeleteDialogOpen(false);
      setSelectedCategory(null);

      await fetchCategories();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not delete category.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenExperienceTypes = async (category: Category) => {
    setExperienceCategory(category);
    setExperienceDialogOpen(true);
    setExperienceError("");
    setIsExperienceLoading(true);
    setExperienceTypes([]);

    try {
      const response = await api.get<CategoryExperienceTypesResponse>(
        `/api/categories/admin/${category.id}/experience-types`,
      );

      setExperienceTypes(response.data.experience_types);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load experience types for this category.",
      );

      if (message) {
        setExperienceError(message);
      }
    } finally {
      setIsExperienceLoading(false);
    }
  };

  const handleCloseExperienceTypes = () => {
    if (isExperienceSaving) {
      return;
    }

    setExperienceDialogOpen(false);
    setExperienceCategory(null);
    setExperienceTypes([]);
    setExperienceError("");
  };

  const toggleExperienceTypeLink = (experienceTypeId: number) => {
    setExperienceTypes((current) =>
      current.map((item) =>
        item.id === experienceTypeId
          ? {
              ...item,
              is_linked: !item.is_linked,
            }
          : item,
      ),
    );
  };

  const handleSaveExperienceTypes = async () => {
    if (!experienceCategory) {
      return;
    }

    setIsExperienceSaving(true);
    setExperienceError("");

    try {
      const experienceTypeIds = experienceTypes
        .filter((item) => item.is_linked)
        .map((item) => item.id);

      await api.put(
        `/api/categories/admin/${experienceCategory.id}/experience-types`,
        {
          experienceTypeIds,
        },
      );

      setSuccessMessage(
        `Experience levels updated for "${experienceCategory.name}".`,
      );

      setExperienceDialogOpen(false);
      setExperienceCategory(null);
      setExperienceTypes([]);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not update experience types for this category.",
      );

      if (message) {
        setExperienceError(message);
      }
    } finally {
      setIsExperienceSaving(false);
    }
  };

  const handleToggleStatus = async (category: Category) => {
    setStatusUpdatingId(category.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(`/api/categories/admin/${category.id}`, {
        isActive: !category.is_active,
      });

      setSuccessMessage(
        category.is_active
          ? "Category disabled successfully."
          : "Category enabled successfully.",
      );

      await fetchCategories();
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not update category status.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const activeCategories = categories.filter(
    (category) => category.is_active,
  ).length;

  const inactiveCategories = categories.length - activeCategories;

  const totalServiceLinks = categories.reduce(
    (total, category) => total + category.services_count,
    0,
  );

  return (
    <AdminLayout title="Categories">
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
            Service Categories
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Manage customer-facing service categories and provider experience
            requirements.
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
            onClick={() => void fetchCategories()}
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
            Add Category
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
            label: "Total Categories",
            value: categories.length,
            color: "#2563eb",
            background: "#eff6ff",
          },
          {
            label: "Active",
            value: activeCategories,
            color: "#15803d",
            background: "#f0fdf4",
          },
          {
            label: "Inactive",
            value: inactiveCategories,
            color: "#64748b",
            background: "#f1f5f9",
          },
          {
            label: "Service Links",
            value: totalServiceLinks,
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
                <CategoryIcon
                  sx={{
                    fontSize: 21,
                  }}
                />
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

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
            Loading categories...
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
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Image</TableCell>
                <TableCell>Services</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {categories.map((category) => {
                const hasServices = category.services_count > 0;

                return (
                  <TableRow
                    key={category.id}
                    hover
                    sx={{
                      "&:hover": {
                        bgcolor: "#f8fafc",
                      },
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={category.display_order}
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
                        {category.name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 10.5,
                          color: "#94a3b8",
                        }}
                      >
                        {category.slug}
                      </Typography>
                    </TableCell>

                    <TableCell
                      sx={{
                        maxWidth: 320,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: category.description ? "#475569" : "#94a3b8",

                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {category.description || "No description"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {category.image_url ? (
                        <Box
                          component="img"
                          src={getCategoryImageSource(category.image_url)}
                          alt={category.name}
                          sx={{
                            width: 72,
                            height: 52,
                            objectFit: "cover",
                            borderRadius: 2,
                            bgcolor: "#f1f5f9",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 72,
                            height: 52,
                            borderRadius: 2,
                            bgcolor: "#f8fafc",
                            border: "1px dashed #cbd5e1",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <ImageOutlined
                            sx={{
                              fontSize: 20,
                              color: "#94a3b8",
                            }}
                          />
                        </Box>
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={category.services_count}
                        size="small"
                        sx={{
                          minWidth: 34,
                          height: 25,
                          bgcolor: hasServices ? "#eff6ff" : "#f8fafc",
                          color: hasServices ? "#1d4ed8" : "#64748b",
                          fontWeight: 750,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={category.is_active ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          height: 27,
                          fontSize: 11,
                          fontWeight: 700,
                          color: category.is_active ? "#15803d" : "#64748b",
                          bgcolor: category.is_active ? "#f0fdf4" : "#f1f5f9",
                          border: category.is_active
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
                            category.is_active
                              ? "Disable category"
                              : "Enable category"
                          }
                        >
                          <span>
                            <Switch
                              checked={category.is_active}
                              disabled={statusUpdatingId === category.id}
                              onChange={() => void handleToggleStatus(category)}
                              size="small"
                              color="success"
                            />
                          </span>
                        </Tooltip>

                        <Tooltip title="Manage experience levels">
                          <IconButton
                            onClick={() =>
                              void handleOpenExperienceTypes(category)
                            }
                            size="small"
                            sx={{
                              border: "1px solid #ddd6fe",
                              borderRadius: 2,
                              color: "#7c3aed",

                              "&:hover": {
                                bgcolor: "#f5f3ff",
                              },
                            }}
                          >
                            <PlaylistAddCheck fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit category">
                          <IconButton
                            onClick={() => handleOpenEdit(category)}
                            size="small"
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
                            hasServices
                              ? "Categories with services cannot be deleted"
                              : "Delete category"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={hasServices}
                              onClick={() => handleOpenDelete(category)}
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

              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CategoryIcon
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
                      No categories found
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.3,
                        fontSize: 12,
                        color: "#94a3b8",
                      }}
                    >
                      Add your first service category.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* CREATE / EDIT */}
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
                {selectedCategory ? "Edit Category" : "Add Category"}
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {selectedCategory
                  ? "Update category information."
                  : "Create a new customer service category."}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={handleCloseForm}
              disabled={isSaving || isUploadingImage}
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
          {formErrorMessage && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: 2.5,
              }}
              onClose={() => setFormErrorMessage("")}
            >
              {formErrorMessage}
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gap: 2,
            }}
          >
            <TextField
              label="Category Name"
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
              helperText="Leave empty to generate automatically from category name"
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

            <Box>
              <Typography
                sx={{
                  mb: 0.8,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Category Image
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  p: 1.8,
                  borderRadius: 2.5,
                  border: "1px dashed #cbd5e1",
                  bgcolor: "#f8fafc",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: {
                      xs: "column",
                      sm: "row",
                    },
                    alignItems: {
                      xs: "stretch",
                      sm: "center",
                    },
                    gap: 1.8,
                  }}
                >
                  <Box
                    sx={{
                      width: {
                        xs: "100%",
                        sm: 150,
                      },
                      height: 105,
                      flexShrink: 0,
                      borderRadius: 2.5,
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#ffffff",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {imagePreviewUrl ? (
                      <Box
                        component="img"
                        src={imagePreviewUrl}
                        alt="Category preview"
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <ImageOutlined
                        sx={{
                          fontSize: 34,
                          color: "#cbd5e1",
                        }}
                      />
                    )}
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 750,
                        color: "#334155",
                      }}
                    >
                      {selectedImageFile
                        ? selectedImageFile.name
                        : imagePreviewUrl
                          ? "Current category image"
                          : "Choose an image from your device"}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.35,
                        mb: 1.3,
                        fontSize: 10.5,
                        lineHeight: 1.5,
                        color: "#64748b",
                      }}
                    >
                      JPG, PNG or WebP · maximum 5 MB
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        startIcon={<UploadFile />}
                        disabled={isSaving || isUploadingImage}
                        sx={{
                          borderRadius: 2.2,
                          textTransform: "none",
                          fontWeight: 700,
                        }}
                      >
                        {imagePreviewUrl ? "Change Image" : "Choose Image"}

                        <input
                          hidden
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            handleImageSelection(file);
                            event.target.value = "";
                          }}
                        />
                      </Button>

                      {imagePreviewUrl && (
                        <Button
                          variant="text"
                          color="error"
                          size="small"
                          onClick={handleRemoveImage}
                          disabled={isSaving || isUploadingImage}
                          sx={{
                            textTransform: "none",
                            fontWeight: 700,
                          }}
                        >
                          Remove Image
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Box>

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
              helperText="Minimum 0 · each display order must be unique"
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
                      {form.isActive ? "Active Category" : "Inactive Category"}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.2,
                        fontSize: 10.5,
                        color: "#64748b",
                      }}
                    >
                      {form.isActive
                        ? "Customers can see and use this category."
                        : "This category will be hidden from active use."}
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
            disabled={isSaving || isUploadingImage}
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
            disabled={isSaving || isUploadingImage}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isUploadingImage
              ? "Uploading Image..."
              : isSaving
                ? "Saving..."
                : selectedCategory
                  ? "Save Changes"
                  : "Create Category"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE */}
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
              Delete Category
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
            <strong>{selectedCategory?.name}</strong>?
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

      {/* EXPERIENCE LEVELS */}
      <Dialog
        open={experienceDialogOpen}
        onClose={handleCloseExperienceTypes}
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
                Experience Levels
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {experienceCategory ? experienceCategory.name : "Category"}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={handleCloseExperienceTypes}
              disabled={isExperienceSaving}
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
          {experienceError && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: 2.5,
              }}
            >
              {experienceError}
            </Alert>
          )}

          {isExperienceLoading ? (
            <Box
              sx={{
                py: 5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <CircularProgress size={28} />

              <Typography
                sx={{
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Loading experience levels...
              </Typography>
            </Box>
          ) : experienceTypes.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                textAlign: "center",
                borderRadius: 2.5,
                bgcolor: "#f8fafc",
                border: "1px dashed #cbd5e1",
              }}
            >
              <PlaylistAddCheck
                sx={{
                  fontSize: 36,
                  color: "#cbd5e1",
                }}
              />

              <Typography
                sx={{
                  mt: 1,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                No active experience types
              </Typography>

              <Typography
                sx={{
                  mt: 0.4,
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                Create experience types first, then link them to this category.
              </Typography>
            </Paper>
          ) : (
            <>
              <Typography
                sx={{
                  mb: 1.5,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "#64748b",
                }}
              >
                Choose which experience levels providers can select for this
                category.
              </Typography>

              <FormGroup
                sx={{
                  gap: 1,
                }}
              >
                {experienceTypes.map((experienceType) => (
                  <Paper
                    key={experienceType.id}
                    elevation={0}
                    sx={{
                      px: 1.7,
                      py: 0.7,
                      borderRadius: 2.5,
                      border: experienceType.is_linked
                        ? "1px solid #bfdbfe"
                        : "1px solid #e2e8f0",

                      bgcolor: experienceType.is_linked ? "#f8fbff" : "#ffffff",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={experienceType.is_linked}
                          onChange={() =>
                            toggleExperienceTypeLink(experienceType.id)
                          }
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
                            {experienceType.name}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.1,
                              fontSize: 10.5,
                              color: "#94a3b8",
                            }}
                          >
                            {experienceType.description || experienceType.slug}
                          </Typography>
                        </Box>
                      }
                      sx={{
                        m: 0,
                        width: "100%",
                      }}
                    />
                  </Paper>
                ))}
              </FormGroup>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
          }}
        >
          <Button
            onClick={handleCloseExperienceTypes}
            disabled={isExperienceSaving}
            sx={{
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            startIcon={<PlaylistAddCheck />}
            onClick={() => void handleSaveExperienceTypes()}
            disabled={isExperienceSaving || isExperienceLoading}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isExperienceSaving ? "Saving..." : "Save Experience Levels"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}

export default CategoriesPage;
