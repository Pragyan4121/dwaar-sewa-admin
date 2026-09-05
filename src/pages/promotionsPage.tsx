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
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Add,
  CalendarMonth,
  Close,
  ContentCopy,
  Delete,
  Edit,
  LocalOffer,
  Percent,
  Refresh,
  Sell,
} from "@mui/icons-material";

import AdminLayout from "../layouts/AdminLayout";

import {
  createPromotion,
  deletePromotion,
  getPromotions,
  setPromotionStatus,
  updatePromotion,
  type Promotion,
  type PromotionPayload,
} from "../api/promotions";

type PromotionFormState = {
  code: string;
  title: string;
  description: string;

  discount_percent: string;
  max_discount_amount: string;
  minimum_order_amount: string;

  starts_at: string;
  ends_at: string;

  first_booking_only: boolean;

  usage_limit: string;
  usage_limit_per_customer: string;

  show_on_home: boolean;
  home_badge_text: string;

  is_active: boolean;
};

const emptyForm: PromotionFormState = {
  code: "",
  title: "",
  description: "",

  discount_percent: "",
  max_discount_amount: "",
  minimum_order_amount: "",

  starts_at: "",
  ends_at: "",

  first_booking_only: false,

  usage_limit: "",
  usage_limit_per_customer: "1",

  show_on_home: false,
  home_badge_text: "",

  is_active: true,
};

function formatMoney(value: number | null) {
  if (value === null) {
    return "No limit";
  }

  return `Rs. ${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No limit";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toInputDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as {
      response?: {
        data?: {
          message?: string;
        };
      };
    };

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function allowNonNegativeDecimal(value: string) {
  if (value === "") {
    return true;
  }

  const number = Number(value);

  return Number.isFinite(number) && number >= 0;
}

function allowPercentage(value: string) {
  if (value === "") {
    return true;
  }

  const number = Number(value);

  return Number.isFinite(number) && number >= 0 && number <= 100;
}

function allowPositiveInteger(value: string) {
  if (value === "") {
    return true;
  }

  const number = Number(value);

  return Number.isInteger(number) && number >= 1;
}

function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [statusChangingId, setStatusChangingId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);

  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );

  const [form, setForm] = useState<PromotionFormState>(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const [deleting, setDeleting] = useState(false);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await getPromotions();
      setPromotions(data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not load promotions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPromotions();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPromotions]);

  const updateField = (
    field: keyof PromotionFormState,
    value: string | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreateDialog = () => {
    setEditingPromotion(null);
    setForm(emptyForm);

    setErrorMessage("");
    setSuccessMessage("");

    setDialogOpen(true);
  };

  const openEditDialog = (promotion: Promotion) => {
    setEditingPromotion(promotion);

    setForm({
      code: promotion.code,
      title: promotion.title,
      description: promotion.description ?? "",

      discount_percent: String(promotion.discount_percent),

      max_discount_amount:
        promotion.max_discount_amount === null
          ? ""
          : String(promotion.max_discount_amount),

      minimum_order_amount:
        promotion.minimum_order_amount === null
          ? ""
          : String(promotion.minimum_order_amount),

      starts_at: toInputDateTime(promotion.starts_at),
      ends_at: toInputDateTime(promotion.ends_at),

      first_booking_only: promotion.first_booking_only,

      usage_limit:
        promotion.usage_limit === null ? "" : String(promotion.usage_limit),

      usage_limit_per_customer:
        promotion.usage_limit_per_customer === null
          ? ""
          : String(promotion.usage_limit_per_customer),

      show_on_home: promotion.show_on_home,

      home_badge_text: promotion.home_badge_text ?? "",

      is_active: promotion.is_active,
    });

    setErrorMessage("");
    setSuccessMessage("");

    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setEditingPromotion(null);
    setForm(emptyForm);
  };

  const validateForm = () => {
    const code = form.code.trim();
    const title = form.title.trim();

    const discountPercentage = Number(form.discount_percent);

    if (!code) {
      return "Promo code is required.";
    }

    if (code.length > 50) {
      return "Promo code cannot exceed 50 characters.";
    }

    if (!title) {
      return "Promotion title is required.";
    }

    if (
      !Number.isFinite(discountPercentage) ||
      discountPercentage <= 0 ||
      discountPercentage > 100
    ) {
      return "Discount percentage must be greater than 0 and no more than 100.";
    }

    if (
      form.max_discount_amount !== "" &&
      !allowNonNegativeDecimal(form.max_discount_amount)
    ) {
      return "Maximum discount cannot be negative.";
    }

    if (
      form.minimum_order_amount !== "" &&
      !allowNonNegativeDecimal(form.minimum_order_amount)
    ) {
      return "Minimum booking amount cannot be negative.";
    }

    if (form.usage_limit !== "" && !allowPositiveInteger(form.usage_limit)) {
      return "Usage limit must be a whole number of at least 1.";
    }

    if (
      form.usage_limit_per_customer !== "" &&
      !allowPositiveInteger(form.usage_limit_per_customer)
    ) {
      return "Uses per customer must be a whole number of at least 1.";
    }

    if (form.starts_at && form.ends_at) {
      const start = new Date(form.starts_at);
      const end = new Date(form.ends_at);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return "Start or end date is invalid.";
      }

      if (end <= start) {
        return "End date must be after start date.";
      }
    }

    return null;
  };

  const buildPayload = (): PromotionPayload => ({
    code: form.code.trim().toUpperCase(),

    title: form.title.trim(),

    description: form.description.trim() || null,

    discount_percent: Number(form.discount_percent),

    max_discount_amount:
      form.max_discount_amount === "" ? null : Number(form.max_discount_amount),

    minimum_order_amount:
      form.minimum_order_amount === ""
        ? null
        : Number(form.minimum_order_amount),

    starts_at:
      form.starts_at === "" ? null : new Date(form.starts_at).toISOString(),

    ends_at: form.ends_at === "" ? null : new Date(form.ends_at).toISOString(),

    first_booking_only: form.first_booking_only,

    usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),

    usage_limit_per_customer:
      form.usage_limit_per_customer === ""
        ? null
        : Number(form.usage_limit_per_customer),

    show_on_home: form.show_on_home,

    home_badge_text: form.home_badge_text.trim() || null,

    is_active: form.is_active,
  });

  const savePromotion = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload();

      if (editingPromotion) {
        await updatePromotion(editingPromotion.id, payload);

        setSuccessMessage("Promotion updated successfully.");
      } else {
        await createPromotion(payload);

        setSuccessMessage("Promotion created successfully.");
      }

      setDialogOpen(false);
      setEditingPromotion(null);
      setForm(emptyForm);

      await loadPromotions();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not save promotion."));
    } finally {
      setSaving(false);
    }
  };

  const togglePromotionStatus = async (promotion: Promotion) => {
    setErrorMessage("");
    setSuccessMessage("");

    setStatusChangingId(promotion.id);

    try {
      await setPromotionStatus(promotion.id, !promotion.is_active);

      setSuccessMessage(
        promotion.is_active ? "Promotion deactivated." : "Promotion activated.",
      );

      await loadPromotions();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Could not update promotion status."),
      );
    } finally {
      setStatusChangingId(null);
    }
  };

  const confirmDeletePromotion = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await deletePromotion(deleteTarget.id);

      setSuccessMessage(result.message);

      setDeleteTarget(null);

      await loadPromotions();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not delete promotion."));

      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const copyPromoCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);

      setSuccessMessage(`${code} copied to clipboard.`);
    } catch {
      setErrorMessage("Could not copy promo code.");
    }
  };

  const activeCount = promotions.filter(
    (promotion) => promotion.is_active,
  ).length;

  const homePromotionCount = promotions.filter(
    (promotion) => promotion.is_active && promotion.show_on_home,
  ).length;

  const totalRedemptions = promotions.reduce(
    (total, promotion) => total + (promotion.redemption_count ?? 0),
    0,
  );

  return (
    <AdminLayout title="Promotions">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          width: "100%",
        }}
      >
        {/* HEADER */}

        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 2.5,
              md: 3,
            },

            borderRadius: 4,

            border: "1px solid #E2E8F0",

            background: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
          }}
        >
          <Box
            sx={{
              display: "flex",

              alignItems: {
                xs: "flex-start",
                md: "center",
              },

              justifyContent: "space-between",

              flexDirection: {
                xs: "column",
                md: "row",
              },

              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 54,
                  height: 54,

                  borderRadius: 3,

                  background: "#EEF4FF",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",
                }}
              >
                <LocalOffer
                  sx={{
                    color: "#2563EB",
                    fontSize: 28,
                  }}
                />
              </Box>

              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    color: "#102A43",
                  }}
                >
                  Promotions
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.5,
                    color: "#64748B",
                  }}
                >
                  Create and manage discounts, promo codes and Home offers.
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.25,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => void loadPromotions()}
                disabled={loading}
                sx={{
                  minHeight: 44,

                  borderRadius: 2.5,

                  textTransform: "none",

                  fontWeight: 800,
                }}
              >
                Refresh
              </Button>

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCreateDialog}
                sx={{
                  minHeight: 44,

                  borderRadius: 2.5,

                  textTransform: "none",

                  fontWeight: 800,
                }}
              >
                Add Promotion
              </Button>
            </Box>
          </Box>
        </Paper>

        {errorMessage && (
          <Alert
            severity="error"
            onClose={() => setErrorMessage("")}
            sx={{
              borderRadius: 2.5,
            }}
          >
            {errorMessage}
          </Alert>
        )}

        {successMessage && (
          <Alert
            severity="success"
            onClose={() => setSuccessMessage("")}
            sx={{
              borderRadius: 2.5,
            }}
          >
            {successMessage}
          </Alert>
        )}

        {/* SUMMARY */}

        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              xl: "repeat(4, 1fr)",
            },

            gap: 2,
          }}
        >
          {[
            {
              label: "Total Promotions",
              value: promotions.length,
              icon: <LocalOffer />,
            },

            {
              label: "Active",
              value: activeCount,
              icon: <Sell />,
            },

            {
              label: "Shown on Home",
              value: homePromotionCount,
              icon: <Percent />,
            },

            {
              label: "Total Redemptions",
              value: totalRedemptions,
              icon: <CalendarMonth />,
            },
          ].map((item) => (
            <Paper
              key={item.label}
              elevation={0}
              sx={{
                p: 2.25,

                border: "1px solid #E2E8F0",

                borderRadius: 3,

                display: "flex",

                alignItems: "center",

                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,

                  borderRadius: 2.5,

                  background: "#F1F5F9",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  color: "#2563EB",
                }}
              >
                {item.icon}
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 24,

                    fontWeight: 900,

                    color: "#0F172A",
                  }}
                >
                  {item.value}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: "#64748B",

                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>

        {/* PROMOTIONS */}

        {loading ? (
          <Paper
            elevation={0}
            sx={{
              minHeight: 280,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              border: "1px solid #E2E8F0",

              borderRadius: 3,
            }}
          >
            <CircularProgress />
          </Paper>
        ) : promotions.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,

              textAlign: "center",

              border: "1px solid #E2E8F0",

              borderRadius: 3,
            }}
          >
            <LocalOffer
              sx={{
                fontSize: 48,

                color: "#94A3B8",
              }}
            />

            <Typography
              sx={{
                mt: 2,

                fontSize: 20,

                fontWeight: 900,
              }}
            >
              No promotions yet
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 1,
                color: "#64748B",
              }}
            >
              Create your first promotion for customers.
            </Typography>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreateDialog}
              sx={{
                mt: 2.5,

                textTransform: "none",

                fontWeight: 800,
              }}
            >
              Create Promotion
            </Button>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",
                xl: "repeat(2, 1fr)",
              },

              gap: 2,
            }}
          >
            {promotions.map((promotion) => (
              <Paper
                key={promotion.id}
                elevation={0}
                sx={{
                  p: 2.5,

                  border: "1px solid #E2E8F0",

                  borderRadius: 3,
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
                  <Box
                    sx={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",

                        alignItems: "center",

                        flexWrap: "wrap",

                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 18,

                          fontWeight: 900,
                        }}
                      >
                        {promotion.code}
                      </Typography>

                      <Tooltip title="Copy promo code">
                        <IconButton
                          size="small"
                          onClick={() => void copyPromoCode(promotion.code)}
                        >
                          <ContentCopy
                            sx={{
                              fontSize: 16,
                            }}
                          />
                        </IconButton>
                      </Tooltip>

                      <Chip
                        size="small"
                        label={promotion.is_active ? "Active" : "Inactive"}
                        color={promotion.is_active ? "success" : "default"}
                      />

                      {promotion.show_on_home && (
                        <Chip
                          size="small"
                          label="Home Offer"
                          color="primary"
                          variant="outlined"
                        />
                      )}

                      {promotion.first_booking_only && (
                        <Chip
                          size="small"
                          label="First Booking"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Typography
                      sx={{
                        mt: 1,

                        fontSize: 16,

                        fontWeight: 800,

                        color: "#334155",
                      }}
                    >
                      {promotion.title}
                    </Typography>

                    {promotion.description && (
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,

                          color: "#64748B",
                        }}
                      >
                        {promotion.description}
                      </Typography>
                    )}
                  </Box>

                  {/* EDIT + DELETE */}

                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                    }}
                  >
                    <Tooltip title="Edit promotion">
                      <IconButton
                        onClick={() => openEditDialog(promotion)}
                        sx={{
                          border: "1px solid #E2E8F0",

                          borderRadius: 2,
                        }}
                      >
                        <Edit
                          sx={{
                            fontSize: 19,
                          }}
                        />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete promotion">
                      <IconButton
                        onClick={() => setDeleteTarget(promotion)}
                        sx={{
                          border: "1px solid #FECACA",

                          borderRadius: 2,

                          color: "#DC2626",

                          "&:hover": {
                            background: "#FEF2F2",
                          },
                        }}
                      >
                        <Delete
                          sx={{
                            fontSize: 19,
                          }}
                        />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Divider
                  sx={{
                    my: 2,
                  }}
                />

                <Box
                  sx={{
                    display: "grid",

                    gridTemplateColumns: {
                      xs: "1fr 1fr",
                      md: "repeat(4, 1fr)",
                    },

                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      DISCOUNT
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 900,
                      }}
                    >
                      {promotion.discount_percent}%
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      MAX DISCOUNT
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      {formatMoney(promotion.max_discount_amount)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      MINIMUM
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      {formatMoney(promotion.minimum_order_amount)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      USED
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      {promotion.redemption_count ?? 0}

                      {promotion.usage_limit !== null
                        ? ` / ${promotion.usage_limit}`
                        : ""}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    mt: 2,

                    p: 1.75,

                    background: "#F8FAFC",

                    borderRadius: 2.5,

                    display: "grid",

                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                    },

                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Starts
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                      }}
                    >
                      {formatDate(promotion.starts_at)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Ends
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                      }}
                    >
                      {formatDate(promotion.ends_at)}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    mt: 2,

                    pt: 2,

                    borderTop: "1px solid #F1F5F9",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "space-between",

                    gap: 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    Customer limit:{" "}
                    {promotion.usage_limit_per_customer === null
                      ? "Unlimited"
                      : promotion.usage_limit_per_customer}
                  </Typography>

                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        checked={promotion.is_active}
                        disabled={statusChangingId === promotion.id}
                        onChange={() => void togglePromotionStatus(promotion)}
                      />
                    }
                    label={promotion.is_active ? "Active" : "Inactive"}
                  />
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {/* CREATE / EDIT DIALOG */}

        <Dialog
          open={dialogOpen}
          onClose={closeDialog}
          fullWidth
          maxWidth="md"
          slotProps={{
            paper: {
              sx: {
                borderRadius: 4,
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",

              justifyContent: "space-between",

              alignItems: "center",

              borderBottom: "1px solid #E2E8F0",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                {editingPromotion ? "Edit Promotion" : "Create Promotion"}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Configure discount and usage rules.
              </Typography>
            </Box>

            <IconButton onClick={closeDialog} disabled={saving}>
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent
            sx={{
              pt: "24px !important",
            }}
          >
            <Box
              sx={{
                display: "flex",

                flexDirection: "column",

                gap: 3,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                }}
              >
                Basic Information
              </Typography>

              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "1fr 1fr",
                  },

                  gap: 2,
                }}
              >
                <TextField
                  label="Promo Code"
                  value={form.code}
                  onChange={(event) => {
                    const value = event.target.value
                      .toUpperCase()
                      .replace(/\s+/g, "");

                    updateField("code", value);
                  }}
                  placeholder="WELCOME20"
                  fullWidth
                  slotProps={{
                    htmlInput: {
                      maxLength: 50,
                    },
                  }}
                />

                <TextField
                  label="Promotion Title"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  fullWidth
                />

                <TextField
                  label="Description"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  multiline
                  minRows={3}
                  fullWidth
                  sx={{
                    gridColumn: {
                      xs: "auto",
                      md: "1 / -1",
                    },
                  }}
                />
              </Box>

              <Divider />

              <Typography
                sx={{
                  fontWeight: 900,
                }}
              >
                Discount Rules
              </Typography>

              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(3, 1fr)",
                  },

                  gap: 2,
                }}
              >
                <TextField
                  label="Discount"
                  type="number"
                  value={form.discount_percent}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (allowPercentage(value)) {
                      updateField("discount_percent", value);
                    }
                  }}
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      max: 100,
                      step: 0.01,
                    },

                    input: {
                      endAdornment: (
                        <InputAdornment position="end">%</InputAdornment>
                      ),
                    },
                  }}
                  fullWidth
                />

                <TextField
                  label="Maximum Discount"
                  type="number"
                  value={form.max_discount_amount}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (allowNonNegativeDecimal(value)) {
                      updateField("max_discount_amount", value);
                    }
                  }}
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      step: 0.01,
                    },

                    input: {
                      startAdornment: (
                        <InputAdornment position="start">Rs.</InputAdornment>
                      ),
                    },
                  }}
                  helperText="Blank = no cap"
                  fullWidth
                />

                <TextField
                  label="Minimum Booking"
                  type="number"
                  value={form.minimum_order_amount}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (allowNonNegativeDecimal(value)) {
                      updateField("minimum_order_amount", value);
                    }
                  }}
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      step: 0.01,
                    },

                    input: {
                      startAdornment: (
                        <InputAdornment position="start">Rs.</InputAdornment>
                      ),
                    },
                  }}
                  helperText="Blank = no minimum"
                  fullWidth
                />
              </Box>

              <Divider />

              <Typography
                sx={{
                  fontWeight: 900,
                }}
              >
                Usage Limits
              </Typography>

              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "1fr 1fr",
                  },

                  gap: 2,
                }}
              >
                <TextField
                  label="Total Usage Limit"
                  type="number"
                  value={form.usage_limit}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (allowPositiveInteger(value)) {
                      updateField("usage_limit", value);
                    }
                  }}
                  slotProps={{
                    htmlInput: {
                      min: 1,
                      step: 1,
                    },
                  }}
                  helperText="Blank = unlimited total uses"
                  fullWidth
                />

                <TextField
                  label="Uses Per Customer"
                  type="number"
                  value={form.usage_limit_per_customer}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (allowPositiveInteger(value)) {
                      updateField("usage_limit_per_customer", value);
                    }
                  }}
                  slotProps={{
                    htmlInput: {
                      min: 1,
                      step: 1,
                    },
                  }}
                  helperText="Blank = unlimited per customer"
                  fullWidth
                />
              </Box>

              <Divider />

              <Typography
                sx={{
                  fontWeight: 900,
                }}
              >
                Validity Period
              </Typography>

              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "1fr 1fr",
                  },

                  gap: 2,
                }}
              >
                <TextField
                  label="Start Date"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) =>
                    updateField("starts_at", event.target.value)
                  }
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                  fullWidth
                />

                <TextField
                  label="End Date"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(event) =>
                    updateField("ends_at", event.target.value)
                  }
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                  fullWidth
                />
              </Box>

              <Divider />

              <Typography
                sx={{
                  fontWeight: 900,
                }}
              >
                Customer App
              </Typography>

              <TextField
                label="Home Badge Text"
                value={form.home_badge_text}
                onChange={(event) =>
                  updateField("home_badge_text", event.target.value)
                }
                placeholder="WELCOME OFFER"
                fullWidth
              />

              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(3, 1fr)",
                  },

                  gap: 1,
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.first_booking_only}
                        onChange={(event) =>
                          updateField(
                            "first_booking_only",
                            event.target.checked,
                          )
                        }
                      />
                    }
                    label="First booking only"
                  />
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.show_on_home}
                        onChange={(event) =>
                          updateField("show_on_home", event.target.checked)
                        }
                      />
                    }
                    label="Show on Home"
                  />
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.is_active}
                        onChange={(event) =>
                          updateField("is_active", event.target.checked)
                        }
                      />
                    }
                    label="Active"
                  />
                </Paper>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              py: 2,
            }}
          >
            <Button onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={() => void savePromotion()}
              disabled={saving}
              startIcon={
                saving ? (
                  <CircularProgress size={17} color="inherit" />
                ) : editingPromotion ? (
                  <Edit />
                ) : (
                  <Add />
                )
              }
            >
              {saving
                ? "Saving..."
                : editingPromotion
                  ? "Save Changes"
                  : "Create Promotion"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* DELETE CONFIRMATION */}

        <Dialog
          open={Boolean(deleteTarget)}
          onClose={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
          fullWidth
          maxWidth="xs"
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3,
              },
            },
          }}
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",

                alignItems: "center",

                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,

                  borderRadius: 2,

                  background: "#FEF2F2",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",
                }}
              >
                <Delete
                  sx={{
                    color: "#DC2626",
                  }}
                />
              </Box>

              <Typography
                sx={{
                  fontSize: 20,

                  fontWeight: 900,

                  color: "#0F172A",
                }}
              >
                Delete Promotion?
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent>
            <Typography
              variant="body2"
              sx={{
                color: "#64748B",

                lineHeight: 1.7,
              }}
            >
              Are you sure you want to permanently delete{" "}
              <strong>{deleteTarget?.code}</strong>?
            </Typography>

            <Alert
              severity="warning"
              sx={{
                mt: 2,

                borderRadius: 2,
              }}
            >
              Promotions that already have booking or redemption history cannot
              be permanently deleted. Deactivate them instead.
            </Alert>
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              pb: 2.5,
              gap: 1,
            }}
          >
            <Button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              sx={{
                textTransform: "none",

                fontWeight: 800,
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              color="error"
              onClick={() => void confirmDeletePromotion()}
              disabled={deleting}
              startIcon={
                deleting ? (
                  <CircularProgress size={17} color="inherit" />
                ) : (
                  <Delete />
                )
              }
              sx={{
                borderRadius: 2,

                textTransform: "none",

                fontWeight: 800,
              }}
            >
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
}

export default PromotionsPage;
