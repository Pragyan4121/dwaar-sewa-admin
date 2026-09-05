import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
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
  Badge,
  Block,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Close,
  Description,
  Engineering,
  Launch,
  PersonOff,
  Refresh,
  Replay,
  Search,
  Star,
  TaskAlt,
  Visibility,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import AdminLayout from "../layouts/AdminLayout";

type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";

type VerificationFilter = "all" | VerificationStatus;

type AccountFilter = "all" | "active" | "inactive";

interface ProviderProfile {
  id: number;
  address: string | null;
  profile_photo_url: string | null;
  years_of_experience: number;
  bio: string | null;
  verification_status: VerificationStatus;
  verification_note: string | null;
  verified_at: string | null;
  verified_by: number | null;
  suspended_at: string | null;
  rejection_reason: string | null;
  average_rating: string | number;
  total_reviews: number;
  total_completed_jobs: number;
}

interface ExperienceType {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

interface ProviderDocumentSummary {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
}

interface Provider {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile: ProviderProfile | null;
  experience_types: ExperienceType[];
  documents_summary: ProviderDocumentSummary;
}

interface ProviderSummary {
  pending: number;
  verified: number;
  rejected: number;
  suspended: number;
  active_accounts: number;
  inactive_accounts: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

interface ProvidersResponse {
  message: string;
  providers: Provider[];
  summary: ProviderSummary;
  pagination: PaginationData;
}

interface ProviderDocument {
  id: number;
  document_type: string;
  document_number: string | null;
  file_url: string;
  verification_status: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface RecentReview {
  id: number;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
}

interface ProviderDetail extends Omit<Provider, "documents_summary"> {
  documents: ProviderDocument[];

  job_summary: {
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
  };

  recent_reviews: RecentReview[];
}

interface ProviderDetailResponse {
  message: string;
  provider: ProviderDetail;
}

const initialSummary: ProviderSummary = {
  pending: 0,
  verified: 0,
  rejected: 0,
  suspended: 0,
  active_accounts: 0,
  inactive_accounts: 0,
};

const initialPagination: PaginationData = {
  page: 1,
  limit: 20,
  total_records: 0,
  total_pages: 0,
  has_next_page: false,
  has_previous_page: false,
};

const verificationStyles: Record<
  VerificationStatus,
  {
    color: string;
    background: string;
    border: string;
  }
> = {
  pending: {
    color: "#b45309",
    background: "#fffbeb",
    border: "#fde68a",
  },

  verified: {
    color: "#15803d",
    background: "#f0fdf4",
    border: "#bbf7d0",
  },

  rejected: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "#fecaca",
  },

  suspended: {
    color: "#be123c",
    background: "#fff1f2",
    border: "#fecdd3",
  },
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
};

const getVerificationStatus = (provider: Provider): VerificationStatus => {
  return provider.profile?.verification_status ?? "pending";
};

const getStatusLabel = (status: string) => {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getProviderInitials = (name: string) => {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "P";
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

function VerificationChip({ status }: { status: string }) {
  const style = verificationStyles[status as VerificationStatus] ?? {
    color: "#64748b",
    background: "#f1f5f9",
    border: "#e2e8f0",
  };

  return (
    <Chip
      label={getStatusLabel(status || "unknown")}
      size="small"
      sx={{
        height: 27,
        borderRadius: 2,
        fontSize: 11,
        fontWeight: 750,
        color: style.color,
        bgcolor: style.background,
        border: `1px solid ${style.border}`,
      }}
    />
  );
}

function ProvidersPage() {
  const navigate = useNavigate();

  const [providers, setProviders] = useState<Provider[]>([]);

  const [summary, setSummary] = useState<ProviderSummary>(initialSummary);

  const [pagination, setPagination] =
    useState<PaginationData>(initialPagination);

  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");

  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");

  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");

  const [isLoading, setIsLoading] = useState(true);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );

  const [providerDetail, setProviderDetail] = useState<ProviderDetail | null>(
    null,
  );

  const [actionType, setActionType] = useState<
    "verify" | "reject" | "suspend" | "reactivate" | null
  >(null);

  const [actionReason, setActionReason] = useState("");

  const handleAuthenticationError = useCallback(
    (status?: number) => {
      if (status === 401 || status === 403) {
        localStorage.removeItem("adminToken");

        localStorage.removeItem("adminUser");

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

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const parameters = new URLSearchParams();

      parameters.set("page", String(page));

      parameters.set("limit", "20");

      parameters.set("status", verificationFilter);

      parameters.set("accountStatus", accountFilter);

      if (appliedSearch) {
        parameters.set("search", appliedSearch);
      }

      const response = await api.get<ProvidersResponse>(
        `/api/admin/providers?${parameters.toString()}`,
      );

      setProviders(response.data.providers);

      setSummary(response.data.summary);

      setPagination(response.data.pagination);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load providers.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    appliedSearch,
    verificationFilter,
    accountFilter,
    getApiErrorMessage,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProviders();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchProviders]);

  const handleSearch = () => {
    setPage(1);

    setAppliedSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setVerificationFilter("all");
    setAccountFilter("all");
    setPage(1);
  };

  const handleOpenDetails = async (provider: Provider) => {
    setSelectedProvider(provider);
    setProviderDetail(null);
    setDetailDialogOpen(true);
    setIsLoadingDetail(true);
    setErrorMessage("");

    try {
      const response = await api.get<ProviderDetailResponse>(
        `/api/admin/providers/${provider.id}`,
      );

      setProviderDetail(response.data.provider);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load provider details.",
      );

      if (message) {
        setErrorMessage(message);
      }

      setDetailDialogOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleOpenAction = (
    provider: Provider,
    type: "verify" | "reject" | "suspend" | "reactivate",
  ) => {
    setSelectedProvider(provider);
    setActionType(type);
    setActionReason("");
    setErrorMessage("");
    setSuccessMessage("");
    setActionDialogOpen(true);
  };

  const getActionTitle = () => {
    switch (actionType) {
      case "verify":
        return "Verify Provider";

      case "reject":
        return "Reject Provider";

      case "suspend":
        return "Suspend Provider";

      case "reactivate":
        return "Reactivate Provider";

      default:
        return "Provider Action";
    }
  };

  const getActionButtonLabel = () => {
    switch (actionType) {
      case "verify":
        return "Verify Provider";

      case "reject":
        return "Reject Provider";

      case "suspend":
        return "Suspend Provider";

      case "reactivate":
        return "Reactivate Provider";

      default:
        return "Confirm";
    }
  };

  const handleProviderAction = async () => {
    if (!selectedProvider || !actionType) {
      return;
    }

    if (actionType === "reject" && actionReason.trim().length < 5) {
      setErrorMessage("Rejection reason must contain at least 5 characters.");

      return;
    }

    if (actionReason.trim().length > 500) {
      setErrorMessage("Reason must not exceed 500 characters.");

      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const endpoint = `/api/admin/providers/${selectedProvider.id}/${actionType}`;

      let requestBody: Record<string, string> = {};

      if (actionType === "verify") {
        requestBody = {
          verificationNote: actionReason.trim(),
        };
      }

      if (actionType === "reject" || actionType === "suspend") {
        requestBody = {
          reason: actionReason.trim(),
        };
      }

      const isActiveAfterAction =
        actionType === "verify" || actionType === "reactivate";

      const response = await api.patch(endpoint, requestBody);

      const updatedProfile = response.data?.profile;

      setProviders((currentProviders) =>
        currentProviders.map((provider) =>
          provider.id === selectedProvider.id
            ? {
                ...provider,
                is_active: isActiveAfterAction,

                profile: updatedProfile
                  ? {
                      ...provider.profile,
                      ...updatedProfile,
                    }
                  : provider.profile,
              }
            : provider,
        ),
      );

      setSuccessMessage(
        `Provider ${actionType} action completed successfully.`,
      );

      setActionDialogOpen(false);
      setSelectedProvider(null);
      setActionType(null);
      setActionReason("");

      await fetchProviders();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not update provider.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const hasActiveFilters =
    Boolean(appliedSearch) ||
    verificationFilter !== "all" ||
    accountFilter !== "all";

  const summaryCards = [
    {
      label: "Pending",
      value: summary.pending,
      color: "#d97706",
      background: "#fffbeb",
    },

    {
      label: "Verified",
      value: summary.verified,
      color: "#15803d",
      background: "#f0fdf4",
    },

    {
      label: "Rejected",
      value: summary.rejected,
      color: "#dc2626",
      background: "#fef2f2",
    },

    {
      label: "Suspended",
      value: summary.suspended,
      color: "#be123c",
      background: "#fff1f2",
    },

    {
      label: "Active",
      value: summary.active_accounts,
      color: "#2563eb",
      background: "#eff6ff",
    },

    {
      label: "Inactive",
      value: summary.inactive_accounts,
      color: "#64748b",
      background: "#f1f5f9",
    },
  ];

  return (
    <AdminLayout title="Providers">
      {/* PAGE HEADER */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: {
            xs: "column",
            md: "row",
          },
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            md: "center",
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
            Provider Management
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Review applications, verification, documents and provider account
            status.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => void fetchProviders()}
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
          Refresh providers
        </Button>
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
            md: "repeat(3, minmax(0, 1fr))",
            xl: "repeat(6, minmax(0, 1fr))",
          },
          gap: 1.5,
          mb: 3,
        }}
      >
        {summaryCards.map((item) => (
          <Paper
            key={item.label}
            elevation={0}
            sx={{
              p: 2,
              minHeight: 110,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              position: "relative",
              overflow: "hidden",
              transition: "transform 180ms ease, box-shadow 180ms ease",

              "&:hover": {
                transform: "translateY(-2px)",

                boxShadow: "0 12px 26px rgba(15,23,42,0.07)",
              },
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 4,
                height: "100%",
                bgcolor: item.color,
              }}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 1,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
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
                    mt: 1,
                    fontSize: 29,
                    lineHeight: 1,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {item.value}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: item.background,

                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: item.color,
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
              Search by provider name, phone or email and filter account status.
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
              md: "minmax(280px, 2fr) minmax(170px, 1fr) minmax(170px, 1fr) auto",
            },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            label="Search providers"
            placeholder="Name, phone or email"
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
            <InputLabel id="verification-status-label">Verification</InputLabel>

            <Select
              labelId="verification-status-label"
              label="Verification"
              value={verificationFilter}
              onChange={(event) => {
                setVerificationFilter(event.target.value as VerificationFilter);

                setPage(1);
              }}
            >
              <MenuItem value="all">All Statuses</MenuItem>

              <MenuItem value="pending">Pending</MenuItem>

              <MenuItem value="verified">Verified</MenuItem>

              <MenuItem value="rejected">Rejected</MenuItem>

              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="account-status-label">Account</InputLabel>

            <Select
              labelId="account-status-label"
              label="Account"
              value={accountFilter}
              onChange={(event) => {
                setAccountFilter(event.target.value as AccountFilter);

                setPage(1);
              }}
            >
              <MenuItem value="all">All Accounts</MenuItem>

              <MenuItem value="active">Active</MenuItem>

              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={handleSearch}
            sx={{
              px: 2.3,
              minHeight: 40,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
              whiteSpace: "nowrap",

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
            fontSize: 11.5,
            color: "#64748b",
            textAlign: {
              xs: "left",
              md: "right",
            },
          }}
        >
          {pagination.total_records} provider
          {pagination.total_records === 1 ? "" : "s"} found
        </Typography>
      </Paper>

      {/* PROVIDER TABLE */}
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
            Loading providers...
          </Typography>
        </Box>
      ) : (
        <>
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
                minWidth: 1320,
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Provider</TableCell>

                  <TableCell>Experience</TableCell>

                  <TableCell>Performance</TableCell>

                  <TableCell>Documents</TableCell>

                  <TableCell>Verification</TableCell>

                  <TableCell>Account</TableCell>

                  <TableCell>Joined</TableCell>

                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {providers.map((provider) => {
                  const verificationStatus = getVerificationStatus(provider);

                  return (
                    <TableRow
                      key={provider.id}
                      hover
                      sx={{
                        "&:hover": {
                          bgcolor: "#f8fafc",
                        },
                      }}
                    >
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",

                            alignItems: "center",

                            gap: 1.3,
                          }}
                        >
                          <Avatar
                            src={
                              provider.profile?.profile_photo_url || undefined
                            }
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: "#dcfce7",

                              color: "#15803d",

                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            {getProviderInitials(provider.full_name)}
                          </Avatar>

                          <Box
                            sx={{
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 13.5,

                                fontWeight: 750,

                                color: "#0f172a",
                              }}
                            >
                              {provider.full_name}
                            </Typography>

                            <Typography
                              sx={{
                                mt: 0.2,
                                fontSize: 11,

                                color: "#64748b",
                              }}
                            >
                              {provider.phone}
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 10.5,

                                color: "#94a3b8",
                              }}
                            >
                              {provider.email || "No email"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        {provider.experience_types.length > 0 ? (
                          <Box
                            sx={{
                              display: "flex",

                              flexWrap: "wrap",

                              gap: 0.5,
                              maxWidth: 250,
                            }}
                          >
                            {provider.experience_types
                              .slice(0, 3)
                              .map((experience) => (
                                <Chip
                                  key={experience.id}
                                  label={experience.name}
                                  size="small"
                                  sx={{
                                    height: 24,

                                    fontSize: 10.5,

                                    bgcolor: "#f8fafc",

                                    border: "1px solid #e2e8f0",

                                    color: "#475569",

                                    fontWeight: 650,
                                  }}
                                />
                              ))}

                            {provider.experience_types.length > 3 && (
                              <Chip
                                label={`+${
                                  provider.experience_types.length - 3
                                }`}
                                size="small"
                                sx={{
                                  height: 24,

                                  fontSize: 10.5,
                                }}
                              />
                            )}
                          </Box>
                        ) : (
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: "#94a3b8",
                            }}
                          >
                            Not added
                          </Typography>
                        )}

                        <Typography
                          sx={{
                            mt: 0.7,
                            fontSize: 10.5,
                            color: "#64748b",
                          }}
                        >
                          {provider.profile?.years_of_experience ?? 0} years
                          experience
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",

                            alignItems: "center",

                            gap: 0.6,
                          }}
                        >
                          <Star
                            sx={{
                              fontSize: 17,
                              color: "#f59e0b",
                            }}
                          />

                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: "#0f172a",
                            }}
                          >
                            {Number(
                              provider.profile?.average_rating ?? 0,
                            ).toFixed(1)}
                          </Typography>
                        </Box>

                        <Typography
                          sx={{
                            mt: 0.3,
                            fontSize: 10.5,
                            color: "#64748b",
                          }}
                        >
                          {provider.profile?.total_reviews ?? 0} reviews
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 10.5,
                            color: "#64748b",
                          }}
                        >
                          {provider.profile?.total_completed_jobs ?? 0}{" "}
                          completed jobs
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: "#334155",
                          }}
                        >
                          {provider.documents_summary.total} total
                        </Typography>

                        <Box
                          sx={{
                            mt: 0.5,
                            display: "flex",

                            gap: 0.7,
                            flexWrap: "wrap",
                          }}
                        >
                          {provider.documents_summary.pending > 0 && (
                            <Chip
                              size="small"
                              label={`${provider.documents_summary.pending} pending`}
                              sx={{
                                height: 21,
                                fontSize: 9.5,
                                bgcolor: "#fffbeb",

                                color: "#b45309",
                              }}
                            />
                          )}

                          {provider.documents_summary.rejected > 0 && (
                            <Chip
                              size="small"
                              label={`${provider.documents_summary.rejected} rejected`}
                              sx={{
                                height: 21,
                                fontSize: 9.5,
                                bgcolor: "#fef2f2",

                                color: "#b91c1c",
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell>
                        <VerificationChip status={verificationStatus} />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={provider.is_active ? "Active" : "Inactive"}
                          size="small"
                          sx={{
                            height: 27,
                            fontSize: 11,
                            fontWeight: 700,
                            color: provider.is_active ? "#15803d" : "#64748b",

                            bgcolor: provider.is_active ? "#f0fdf4" : "#f1f5f9",

                            border: provider.is_active
                              ? "1px solid #bbf7d0"
                              : "1px solid #e2e8f0",
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            maxWidth: 120,

                            fontSize: 11,
                            color: "#64748b",
                          }}
                        >
                          {formatDate(provider.created_at)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Box
                          sx={{
                            display: "flex",

                            justifyContent: "flex-end",

                            alignItems: "center",

                            gap: 0.5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Tooltip title="View provider">
                            <IconButton
                              size="small"
                              onClick={() => void handleOpenDetails(provider)}
                              sx={{
                                border: "1px solid #e2e8f0",

                                borderRadius: 2,

                                color: "#475569",

                                "&:hover": {
                                  bgcolor: "#f1f5f9",
                                },
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {verificationStatus !== "verified" &&
                            verificationStatus !== "suspended" && (
                              <Tooltip title="Verify provider">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleOpenAction(provider, "verify")
                                  }
                                  sx={{
                                    border: "1px solid #bbf7d0",

                                    borderRadius: 2,

                                    color: "#15803d",

                                    bgcolor: "#f0fdf4",

                                    "&:hover": {
                                      bgcolor: "#dcfce7",
                                    },
                                  }}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                          {verificationStatus === "pending" && (
                            <Tooltip title="Reject provider">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleOpenAction(provider, "reject")
                                }
                                sx={{
                                  border: "1px solid #fecaca",

                                  borderRadius: 2,

                                  color: "#dc2626",

                                  "&:hover": {
                                    bgcolor: "#fef2f2",
                                  },
                                }}
                              >
                                <PersonOff fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {provider.is_active &&
                            verificationStatus !== "suspended" && (
                              <Tooltip title="Suspend provider">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleOpenAction(provider, "suspend")
                                  }
                                  sx={{
                                    border: "1px solid #fecaca",

                                    borderRadius: 2,

                                    color: "#be123c",

                                    "&:hover": {
                                      bgcolor: "#fff1f2",
                                    },
                                  }}
                                >
                                  <Block fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                          {!provider.is_active && (
                            <Tooltip title="Reactivate provider">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleOpenAction(provider, "reactivate")
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
                                <Replay fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {providers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{
                        py: 8,
                      }}
                    >
                      <Engineering
                        sx={{
                          fontSize: 38,
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
                        No providers found
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 12,
                          color: "#94a3b8",
                        }}
                      >
                        Try changing your filters or search.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* PAGINATION */}
          <Box
            sx={{
              mt: 2,
              px: 0.5,
              display: "flex",
              justifyContent: "space-between",

              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Page {pagination.page} of {Math.max(pagination.total_pages, 1)} ·{" "}
              {pagination.total_records} providers
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 1,
              }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<ChevronLeft />}
                disabled={!pagination.has_previous_page || isLoading}
                onClick={() =>
                  setPage((currentPage) => Math.max(currentPage - 1, 1))
                }
                sx={{
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: "#e2e8f0",
                }}
              >
                Previous
              </Button>

              <Button
                variant="outlined"
                size="small"
                endIcon={<ChevronRight />}
                disabled={!pagination.has_next_page || isLoading}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                sx={{
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: "#e2e8f0",
                }}
              >
                Next
              </Button>
            </Box>
          </Box>
        </>
      )}

      {/* PROVIDER DETAILS */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => !isLoadingDetail && setDetailDialogOpen(false)}
        fullWidth
        maxWidth="md"
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
                Provider details
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Review profile, performance and submitted documents.
              </Typography>
            </Box>

            <IconButton
              size="small"
              disabled={isLoadingDetail}
              onClick={() => setDetailDialogOpen(false)}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 3,
            bgcolor: "#f8fafc",
          }}
        >
          {isLoadingDetail ? (
            <Box
              sx={{
                minHeight: 350,
                display: "flex",
                justifyContent: "center",

                alignItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : providerDetail ? (
            <Box
              sx={{
                display: "grid",
                gap: 2,
              }}
            >
              {/* PROFILE HEADER */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
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
                      xs: "flex-start",
                      sm: "center",
                    },
                    justifyContent: "space-between",

                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",

                      gap: 1.7,
                    }}
                  >
                    <Avatar
                      src={
                        providerDetail.profile?.profile_photo_url || undefined
                      }
                      sx={{
                        width: 62,
                        height: 62,
                        bgcolor: "#dcfce7",

                        color: "#15803d",

                        fontSize: 20,
                        fontWeight: 800,
                      }}
                    >
                      {getProviderInitials(providerDetail.full_name)}
                    </Avatar>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 19,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {providerDetail.full_name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {providerDetail.phone}
                        {" · "}
                        {providerDetail.email || "No email"}
                      </Typography>

                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",

                          gap: 0.7,
                          flexWrap: "wrap",
                        }}
                      >
                        <VerificationChip
                          status={
                            providerDetail.profile?.verification_status ??
                            "pending"
                          }
                        />

                        <Chip
                          label={
                            providerDetail.is_active
                              ? "Active Account"
                              : "Inactive Account"
                          }
                          size="small"
                          sx={{
                            height: 27,
                            fontSize: 11,
                            fontWeight: 700,
                            bgcolor: providerDetail.is_active
                              ? "#eff6ff"
                              : "#f1f5f9",

                            color: providerDetail.is_active
                              ? "#1d4ed8"
                              : "#64748b",
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Paper>

              {/* PROFILE INFO */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                  },
                  gap: 2,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                    }}
                  >
                    Address
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.7,
                      fontSize: 13,
                      fontWeight: 650,
                      color: "#334155",
                    }}
                  >
                    {providerDetail.profile?.address || "Not provided"}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                    }}
                  >
                    Experience
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.7,
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {providerDetail.profile?.years_of_experience ?? 0} years
                  </Typography>
                </Paper>
              </Box>

              {providerDetail.profile?.bio && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                    }}
                  >
                    Provider bio
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: "#334155",
                    }}
                  >
                    {providerDetail.profile.bio}
                  </Typography>
                </Paper>
              )}

              {/* EXPERIENCE */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.3,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",

                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <Engineering
                    sx={{
                      color: "#2563eb",
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    Experience Types
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  {providerDetail.experience_types.map((experience) => (
                    <Chip
                      key={experience.id}
                      label={experience.name}
                      sx={{
                        bgcolor: "#eff6ff",

                        color: "#1d4ed8",

                        fontWeight: 650,
                      }}
                    />
                  ))}

                  {providerDetail.experience_types.length === 0 && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "#94a3b8",
                      }}
                    >
                      No experience types added.
                    </Typography>
                  )}
                </Box>
              </Paper>

              {/* PERFORMANCE */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.3,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  sx={{
                    mb: 1.7,
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  Performance
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(4, 1fr)",
                    },
                    gap: 1.2,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.7,
                      borderRadius: 2.5,
                      bgcolor: "#fffbeb",
                    }}
                  >
                    <Star
                      sx={{
                        fontSize: 19,
                        color: "#f59e0b",
                      }}
                    />

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 19,
                        fontWeight: 800,
                      }}
                    >
                      {Number(
                        providerDetail.profile?.average_rating ?? 0,
                      ).toFixed(1)}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: "#64748b",
                      }}
                    >
                      Average rating
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.7,
                      borderRadius: 2.5,
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Badge
                      sx={{
                        fontSize: 19,
                        color: "#2563eb",
                      }}
                    />

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 19,
                        fontWeight: 800,
                      }}
                    >
                      {providerDetail.profile?.total_reviews ?? 0}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: "#64748b",
                      }}
                    >
                      Reviews
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.7,
                      borderRadius: 2.5,
                      bgcolor: "#f0fdf4",
                    }}
                  >
                    <TaskAlt
                      sx={{
                        fontSize: 19,
                        color: "#15803d",
                      }}
                    />

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 19,
                        fontWeight: 800,
                      }}
                    >
                      {providerDetail.job_summary.completed_bookings}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: "#64748b",
                      }}
                    >
                      Completed
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.7,
                      borderRadius: 2.5,
                      bgcolor: "#fef2f2",
                    }}
                  >
                    <Block
                      sx={{
                        fontSize: 19,
                        color: "#dc2626",
                      }}
                    />

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 19,
                        fontWeight: 800,
                      }}
                    >
                      {providerDetail.job_summary.cancelled_bookings}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: "#64748b",
                      }}
                    >
                      Cancelled
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  sx={{
                    mt: 1.5,
                    fontSize: 11.5,
                    color: "#64748b",
                  }}
                >
                  Total bookings: {providerDetail.job_summary.total_bookings}
                </Typography>
              </Paper>

              {/* DOCUMENTS */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.3,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",

                    gap: 1,
                    mb: 1.8,
                  }}
                >
                  <Description
                    sx={{
                      color: "#7c3aed",
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    Documents
                  </Typography>

                  <Chip
                    label={providerDetail.documents.length}
                    size="small"
                    sx={{
                      ml: 0.5,
                      height: 22,
                      fontSize: 10,
                    }}
                  />
                </Box>

                {providerDetail.documents.map((document) => (
                  <Box
                    key={document.id}
                    sx={{
                      p: 1.7,
                      mb: 1,
                      borderRadius: 2.5,
                      border: "1px solid #e2e8f0",

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
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 750,
                          color: "#334155",
                        }}
                      >
                        {getStatusLabel(document.document_type)}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.4,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        Document number: {document.document_number || "—"}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 10.5,
                          color: "#94a3b8",
                        }}
                      >
                        Uploaded {formatDate(document.created_at)}
                      </Typography>

                      {document.rejection_reason && (
                        <Typography
                          sx={{
                            mt: 0.6,
                            fontSize: 11,
                            color: "#b91c1c",
                          }}
                        >
                          Reason: {document.rejection_reason}
                        </Typography>
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",

                        alignItems: "center",

                        gap: 1,
                      }}
                    >
                      <Chip
                        label={getStatusLabel(document.verification_status)}
                        size="small"
                        sx={{
                          height: 25,
                          fontSize: 10.5,
                          fontWeight: 700,
                        }}
                      />

                      {document.file_url && (
                        <Tooltip title="Open document">
                          <IconButton
                            size="small"
                            onClick={() =>
                              window.open(
                                document.file_url,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                            sx={{
                              border: "1px solid #e2e8f0",

                              borderRadius: 2,

                              color: "#2563eb",
                            }}
                          >
                            <Launch fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                ))}

                {providerDetail.documents.length === 0 && (
                  <Box
                    sx={{
                      py: 3,
                      textAlign: "center",
                    }}
                  >
                    <Description
                      sx={{
                        fontSize: 32,
                        color: "#cbd5e1",
                      }}
                    />

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 12,
                        color: "#94a3b8",
                      }}
                    >
                      No documents uploaded.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* RECENT REVIEWS */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.3,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  sx={{
                    mb: 1.5,
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  Recent Reviews
                </Typography>

                {providerDetail.recent_reviews.length > 0 ? (
                  providerDetail.recent_reviews.map((review) => (
                    <Box
                      key={review.id}
                      sx={{
                        py: 1.5,
                        borderBottom: "1px solid #f1f5f9",

                        "&:last-child": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",

                          justifyContent: "space-between",

                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",

                            alignItems: "center",

                            gap: 0.5,
                          }}
                        >
                          <Star
                            sx={{
                              fontSize: 16,
                              color: "#f59e0b",
                            }}
                          />

                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            {review.rating}
                            /5
                          </Typography>
                        </Box>

                        <Typography
                          sx={{
                            fontSize: 10,
                            color: "#94a3b8",
                          }}
                        >
                          {formatDate(review.created_at)}
                        </Typography>
                      </Box>

                      {review.comment && (
                        <Typography
                          sx={{
                            mt: 0.7,
                            fontSize: 12,
                            lineHeight: 1.6,
                            color: "#475569",
                          }}
                        >
                          {review.comment}
                        </Typography>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#94a3b8",
                    }}
                  >
                    No recent reviews.
                  </Typography>
                )}
              </Paper>

              {/* VERIFICATION NOTE */}
              {providerDetail.profile?.verification_note && (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: 3,
                  }}
                >
                  Verification note: {providerDetail.profile.verification_note}
                </Alert>
              )}

              {providerDetail.profile?.rejection_reason && (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 3,
                  }}
                >
                  Rejection reason: {providerDetail.profile.rejection_reason}
                </Alert>
              )}
            </Box>
          ) : null}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <Button
            onClick={() => setDetailDialogOpen(false)}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* PROVIDER ACTION */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => !isProcessing && setActionDialogOpen(false)}
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
              py: 2.5,
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
              {getActionTitle()}
            </Typography>

            <Typography
              sx={{
                mt: 0.3,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              {selectedProvider ? selectedProvider.full_name : "Provider"}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            pt: "24px !important",
          }}
        >
          {actionType === "verify" && (
            <Alert
              severity="success"
              sx={{
                mb: 2,
                borderRadius: 2.5,
              }}
            >
              Verifying this provider will activate the provider account and
              allow provider access.
            </Alert>
          )}

          {actionType === "reject" && (
            <Alert
              severity="warning"
              sx={{
                mb: 2,
                borderRadius: 2.5,
              }}
            >
              The application will be rejected. A clear rejection reason is
              required.
            </Alert>
          )}

          {actionType === "suspend" && (
            <Alert
              severity="warning"
              sx={{
                mb: 2,
                borderRadius: 2.5,
              }}
            >
              The provider account will become inactive until an administrator
              reactivates it.
            </Alert>
          )}

          {actionType === "reactivate" && (
            <Alert
              severity="info"
              sx={{
                borderRadius: 2.5,
              }}
            >
              The provider account will be activated again.
            </Alert>
          )}

          {actionType !== "reactivate" && (
            <TextField
              label={
                actionType === "verify"
                  ? "Verification Note"
                  : actionType === "reject"
                    ? "Rejection Reason"
                    : "Suspension Reason"
              }
              value={actionReason}
              onChange={(event) => setActionReason(event.target.value)}
              fullWidth
              multiline
              rows={4}
              required={actionType === "reject"}
              helperText={`${actionReason.length}/500 characters`}
            />
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
          }}
        >
          <Button
            onClick={() => setActionDialogOpen(false)}
            disabled={isProcessing}
            sx={{
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color={
              actionType === "reject" || actionType === "suspend"
                ? "error"
                : "primary"
            }
            startIcon={
              actionType === "verify" ? (
                <CheckCircle />
              ) : actionType === "reject" ? (
                <PersonOff />
              ) : actionType === "suspend" ? (
                <Block />
              ) : (
                <Replay />
              )
            }
            onClick={() => void handleProviderAction()}
            disabled={isProcessing}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isProcessing ? "Processing..." : getActionButtonLabel()}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}

export default ProvidersPage;
