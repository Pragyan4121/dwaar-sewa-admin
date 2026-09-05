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
  AssignmentInd,
  CalendarMonth,
  Cancel,
  Chat,
  ChevronLeft,
  ChevronRight,
  Close,
  LocationOn,
  Person,
  ReceiptLong,
  Refresh,
  Search,
  Visibility,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import AdminLayout from "../layouts/AdminLayout";

type BookingStatus =
  | "pending"
  | "accepted"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

interface UserSummary {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
}

interface ProviderSummary {
  id: number;
  full_name: string;
  phone: string;
  email?: string | null;
  is_active?: boolean;
}

interface CategorySummary {
  id: number;
  name: string;
  slug: string;
}

interface ServiceSummary {
  id: number;
  name: string;
  base_price: string;
  duration_minutes: number | null;
  category_id: number | null;
  service_categories: CategorySummary | null;
}

interface CustomerAddressSummary {
  id: number;
  label: string;
  full_address: string;
  service_area: string;
  landmark: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
}

interface Booking {
  id: number;
  customer_id: number;
  service_id: number;
  provider_id: number | null;
  customer_address_id: number | null;
  service_address: string;
  service_area: string;
  preferred_date: string;
  preferred_time: string | null;
  notes: string | null;
  status: BookingStatus;
  estimated_price: string;
  final_price: string | null;
  accepted_at: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  users_bookings_customer_idTousers: UserSummary;
  users_bookings_provider_idTousers: ProviderSummary | null;
  services: ServiceSummary;
  customer_addresses: CustomerAddressSummary | null;
}

interface BookingSummary {
  pending: number;
  accepted: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

interface BookingsResponse {
  message: string;
  bookings: Booking[];
  summary: BookingSummary;
  pagination: PaginationData;
}

interface ProviderListResponse {
  message: string;
  providers: ProviderSummary[];
}

interface BookingStatusHistory {
  id: number;
  old_status: string | null;
  new_status: string;
  changed_by_role: string | null;
  note: string | null;
  created_at: string;
  users?: {
    id: number;
    full_name: string;
    phone: string;
  } | null;
}

interface BookingDetail extends Booking {
  payments?: {
    id: number;
    amount: string;
    payment_method: string;
    payment_status: string;
    paid_at: string | null;
    created_at: string;
  } | null;

  reviews?: {
    id: number;
    rating: number;
    comment: string | null;
    is_visible: boolean;
    created_at: string;
  } | null;

  booking_status_history: BookingStatusHistory[];
}

interface BookingDetailResponse {
  message: string;
  booking: BookingDetail;
}

interface AdminChatMessage {
  id: number;
  sender_user_id: number;
  sender_role: string;
  message_type: string;
  message_text: string | null;
  image_url: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

interface AdminCallLog {
  id: number;
  initiated_by_id: number;
  recipient_user_id: number;
  call_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;

  users_chat_call_logs_initiated_by_idTousers?: {
    id: number;
    full_name: string;
    phone: string;
  } | null;

  users_chat_call_logs_recipient_user_idTousers?: {
    id: number;
    full_name: string;
    phone: string;
  } | null;
}

interface AdminChatHistory {
  id: number;
  booking_id: number;
  customer_id: number;
  provider_id: number;
  activated_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;

  bookings: {
    id: number;
    status: string;
    preferred_date: string;
    preferred_time: string | null;
    service_address: string;
    service_area: string;

    services: {
      id: number;
      name: string;
    };

    users_bookings_customer_idTousers: {
      id: number;
      full_name: string;
      phone: string;
      email: string | null;
    };

    users_bookings_provider_idTousers: {
      id: number;
      full_name: string;
      phone: string;
      email: string | null;
    } | null;
  };

  chat_messages: AdminChatMessage[];
  chat_call_logs: AdminCallLog[];
}

interface AdminChatHistoryResponse {
  message: string;
  chat: AdminChatHistory;
}

const statusOptions: {
  value: "all" | BookingStatus;
  label: string;
}[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusStyles: Record<
  BookingStatus,
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

  accepted: {
    color: "#0369a1",
    background: "#f0f9ff",
    border: "#bae6fd",
  },

  assigned: {
    color: "#1d4ed8",
    background: "#eff6ff",
    border: "#bfdbfe",
  },

  in_progress: {
    color: "#6d28d9",
    background: "#f5f3ff",
    border: "#ddd6fe",
  },

  completed: {
    color: "#15803d",
    background: "#f0fdf4",
    border: "#bbf7d0",
  },

  cancelled: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "#fecaca",
  },
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
};

const formatPreferredDate = (value: string) => {
  return new Date(value).toLocaleDateString();
};

const formatPreferredTime = (value: string | null) => {
  if (!value) {
    return "Time not specified";
  }

  const match = value.match(/(\d{2}):(\d{2})/);

  if (!match) {
    return value;
  }

  const hour = Number(match[1]);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${match[2]} ${period}`;
};

const getStatusLabel = (status: string) => {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function BookingStatusChip({ status }: { status: BookingStatus }) {
  const style = statusStyles[status];

  return (
    <Chip
      label={getStatusLabel(status)}
      size="small"
      sx={{
        height: 27,
        borderRadius: 2,
        fontSize: 11.5,
        fontWeight: 750,
        color: style.color,
        bgcolor: style.background,
        border: `1px solid ${style.border}`,
      }}
    />
  );
}

function BookingsPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);

  const [summary, setSummary] = useState<BookingSummary>({
    pending: 0,
    accepted: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });

  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total_records: 0,
    total_pages: 0,
    has_next_page: false,
    has_previous_page: false,
  });

  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>(
    "all",
  );

  const [providerFilter, setProviderFilter] = useState("all");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(
    null,
  );

  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");

  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [adminChat, setAdminChat] = useState<AdminChatHistory | null>(null);

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
    try {
      const response = await api.get<ProviderListResponse>(
        "/api/users/providers",
      );

      const activeProviders = response.data.providers.filter(
        (provider) => provider.is_active !== false,
      );

      setProviders(activeProviders);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load providers.");

      if (message) {
        setErrorMessage(message);
      }
    }
  }, [getApiErrorMessage]);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const parameters = new URLSearchParams();

      parameters.set("page", String(page));
      parameters.set("limit", "20");

      if (appliedSearch) {
        parameters.set("search", appliedSearch);
      }

      if (statusFilter !== "all") {
        parameters.set("status", statusFilter);
      }

      if (providerFilter !== "all") {
        parameters.set("providerId", providerFilter);
      }

      if (dateFrom) {
        parameters.set("dateFrom", dateFrom);
      }

      if (dateTo) {
        parameters.set("dateTo", dateTo);
      }

      const response = await api.get<BookingsResponse>(
        `/api/bookings/admin/all?${parameters.toString()}`,
      );

      setBookings(response.data.bookings);
      setSummary(response.data.summary);
      setPagination(response.data.pagination);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load bookings.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    appliedSearch,
    statusFilter,
    providerFilter,
    dateFrom,
    dateTo,
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBookings();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchBookings]);

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setStatusFilter("all");
    setProviderFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleStatusFilterChange = (value: "all" | BookingStatus) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleProviderFilterChange = (value: string) => {
    setProviderFilter(value);
    setPage(1);
  };

  const handleOpenDetails = async (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDetail(null);
    setDetailDialogOpen(true);
    setIsLoadingDetail(true);
    setErrorMessage("");

    try {
      const response = await api.get<BookingDetailResponse>(
        `/api/bookings/admin/${booking.id}`,
      );

      setBookingDetail(response.data.booking);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load booking details.",
      );

      if (message) {
        setErrorMessage(message);
      }

      setDetailDialogOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleOpenChat = async (bookingId: number) => {
    setAdminChat(null);
    setChatDialogOpen(true);
    setIsLoadingChat(true);
    setErrorMessage("");

    try {
      const response = await api.get<AdminChatHistoryResponse>(
        `/api/chats/admin/orders/${bookingId}`,
      );

      setAdminChat(response.data.chat);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load booking chat history.",
      );

      if (message) {
        setErrorMessage(message);
      }

      setChatDialogOpen(false);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleOpenAssign = (booking: Booking) => {
    setSelectedBooking(booking);

    setSelectedProviderId(
      booking.provider_id ? String(booking.provider_id) : "",
    );

    setAssignDialogOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleAssignProvider = async () => {
    if (!selectedBooking) {
      return;
    }

    if (!selectedProviderId) {
      setErrorMessage("Please select a provider.");
      return;
    }

    setIsAssigning(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(
        `/api/bookings/admin/${selectedBooking.id}/assign-provider`,
        {
          providerId: Number(selectedProviderId),
        },
      );

      setSuccessMessage(
        selectedBooking.provider_id
          ? "Provider reassigned successfully."
          : "Provider assigned successfully.",
      );

      setAssignDialogOpen(false);
      setSelectedBooking(null);
      setSelectedProviderId("");

      await fetchBookings();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not assign provider.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenCancel = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancellationReason("");
    setCancelDialogOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) {
      return;
    }

    if (cancellationReason.trim().length > 500) {
      setErrorMessage("Cancellation reason must not exceed 500 characters.");

      return;
    }

    setIsCancelling(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(`/api/bookings/admin/${selectedBooking.id}/cancel`, {
        cancellationReason:
          cancellationReason.trim() || "Booking cancelled by administrator.",
      });

      setSuccessMessage("Booking cancelled successfully.");
      setCancelDialogOpen(false);
      setSelectedBooking(null);
      setCancellationReason("");

      await fetchBookings();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not cancel booking.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const canAssignProvider = (booking: Booking) => {
    return !["in_progress", "completed", "cancelled"].includes(booking.status);
  };

  const canCancelBooking = (booking: Booking) => {
    return !["completed", "cancelled"].includes(booking.status);
  };

  const hasActiveFilters =
    Boolean(appliedSearch) ||
    statusFilter !== "all" ||
    providerFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const bookingSummaryCards = [
    {
      label: "Pending",
      value: summary.pending,
      color: "#d97706",
      background: "#fffbeb",
    },
    {
      label: "Accepted",
      value: summary.accepted,
      color: "#0284c7",
      background: "#f0f9ff",
    },
    {
      label: "Assigned",
      value: summary.assigned,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      label: "In Progress",
      value: summary.in_progress,
      color: "#7c3aed",
      background: "#f5f3ff",
    },
    {
      label: "Completed",
      value: summary.completed,
      color: "#15803d",
      background: "#f0fdf4",
    },
    {
      label: "Cancelled",
      value: summary.cancelled,
      color: "#dc2626",
      background: "#fef2f2",
    },
  ];

  return (
    <AdminLayout title="Bookings">
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
            Booking Management
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Monitor customer requests, assign providers and manage booking
            progress.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => void fetchBookings()}
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
          Refresh bookings
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

      {/* STATUS CARDS */}
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
        {bookingSummaryCards.map((item) => (
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
              Find bookings by customer, service, provider, status or date.
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
              md: "minmax(260px, 2fr) repeat(2, minmax(160px, 1fr))",
              xl: "minmax(300px, 2fr) repeat(4, minmax(150px, 1fr))",
            },
            gap: 1.5,
          }}
        >
          <TextField
            label="Search"
            placeholder="Customer, phone, service, area or address"
            value={searchInput}
            size="small"
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
            <InputLabel id="booking-status-label">Status</InputLabel>

            <Select
              labelId="booking-status-label"
              label="Status"
              value={statusFilter}
              onChange={(event) =>
                handleStatusFilterChange(
                  event.target.value as "all" | BookingStatus,
                )
              }
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="provider-filter-label">Provider</InputLabel>

            <Select
              labelId="provider-filter-label"
              label="Provider"
              value={providerFilter}
              onChange={(event) =>
                handleProviderFilterChange(String(event.target.value))
              }
            >
              <MenuItem value="all">All Providers</MenuItem>

              {providers.map((provider) => (
                <MenuItem key={provider.id} value={String(provider.id)}>
                  {provider.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Date From"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <TextField
            label="Date To"
            type="date"
            size="small"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        </Box>

        <Box
          sx={{
            mt: 2,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={handleSearch}
            sx={{
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
            Search bookings
          </Button>

          <Typography
            sx={{
              ml: {
                sm: "auto",
              },
              fontSize: 12,
              color: "#64748b",
            }}
          >
            {pagination.total_records} booking
            {pagination.total_records === 1 ? "" : "s"} found
          </Typography>
        </Box>
      </Paper>

      {/* TABLE */}
      {isLoading ? (
        <Box
          sx={{
            minHeight: 350,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
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
            Loading bookings...
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
                py: 1.8,
              },
            }}
          >
            <Table sx={{ minWidth: 1380 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Booking</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {bookings.map((booking) => (
                  <TableRow
                    key={booking.id}
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
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        #{booking.id}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 10.5,
                          color: "#94a3b8",
                        }}
                      >
                        {formatDate(booking.created_at)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#334155",
                        }}
                      >
                        {booking.users_bookings_customer_idTousers.full_name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        {booking.users_bookings_customer_idTousers.phone}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#334155",
                        }}
                      >
                        {booking.services.name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        {booking.services.service_categories?.name ||
                          "Uncategorized"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {booking.users_bookings_provider_idTousers ? (
                        <>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#334155",
                            }}
                          >
                            {
                              booking.users_bookings_provider_idTousers
                                .full_name
                            }
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.2,
                              fontSize: 11,
                              color: "#64748b",
                            }}
                          >
                            {booking.users_bookings_provider_idTousers.phone}
                          </Typography>
                        </>
                      ) : (
                        <Chip
                          label="Unassigned"
                          size="small"
                          sx={{
                            bgcolor: "#fffbeb",
                            color: "#b45309",
                            border: "1px solid #fde68a",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 650,
                          color: "#334155",
                        }}
                      >
                        {booking.service_area}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          maxWidth: 230,
                          fontSize: 11,
                          lineHeight: 1.4,
                          color: "#64748b",
                        }}
                      >
                        {booking.service_address}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 650,
                          color: "#334155",
                        }}
                      >
                        {formatPreferredDate(booking.preferred_date)}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        {formatPreferredTime(booking.preferred_time)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                        }}
                      >
                        NPR {booking.final_price || booking.estimated_price}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <BookingStatusChip status={booking.status} />
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
                        <Tooltip title="View booking">
                          <IconButton
                            size="small"
                            onClick={() => void handleOpenDetails(booking)}
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

                        <Tooltip title="View chat">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!booking.provider_id}
                              onClick={() => void handleOpenChat(booking.id)}
                              sx={{
                                border: "1px solid #e2e8f0",
                                borderRadius: 2,
                                color: "#2563eb",

                                "&:hover": {
                                  bgcolor: "#eff6ff",
                                },
                              }}
                            >
                              <Chat fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip
                          title={
                            booking.provider_id
                              ? "Reassign provider"
                              : "Assign provider"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canAssignProvider(booking)}
                              onClick={() => handleOpenAssign(booking)}
                              sx={{
                                border: "1px solid #e2e8f0",
                                borderRadius: 2,
                                color: "#15803d",

                                "&:hover": {
                                  bgcolor: "#f0fdf4",
                                },
                              }}
                            >
                              <AssignmentInd fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Cancel booking">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!canCancelBooking(booking)}
                              onClick={() => handleOpenCancel(booking)}
                              sx={{
                                border: "1px solid #e2e8f0",
                                borderRadius: 2,
                                color: "#dc2626",

                                "&:hover": {
                                  bgcolor: "#fef2f2",
                                },
                              }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}

                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      align="center"
                      sx={{
                        py: 8,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <ReceiptLong
                          sx={{
                            fontSize: 36,
                            color: "#cbd5e1",
                          }}
                        />

                        <Typography
                          sx={{
                            fontWeight: 750,
                            color: "#334155",
                          }}
                        >
                          No bookings found
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "#94a3b8",
                          }}
                        >
                          Try changing your search or filters.
                        </Typography>
                      </Box>
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
              Page {pagination.page} of {Math.max(pagination.total_pages, 1)}
              {" · "}
              {pagination.total_records} records
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

      {/* BOOKING DETAILS */}
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
        <DialogTitle
          sx={{
            p: 0,
          }}
        >
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
                Booking details
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {selectedBooking
                  ? `Booking #${selectedBooking.id}`
                  : "Booking information"}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={() => setDetailDialogOpen(false)}
              disabled={isLoadingDetail}
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
                minHeight: 320,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : bookingDetail ? (
            <Box
              sx={{
                display: "grid",
                gap: 2,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: {
                      xs: "column",
                      sm: "row",
                    },
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Service
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.7,
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {bookingDetail.services.name}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.3,
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      {bookingDetail.services.service_categories?.name ||
                        "Uncategorized"}
                    </Typography>
                  </Box>

                  <BookingStatusChip status={bookingDetail.status} />
                </Box>
              </Paper>

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
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.2,
                    }}
                  >
                    <Person
                      sx={{
                        color: "#2563eb",
                      }}
                    />

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Customer
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: 13.5,
                          fontWeight: 750,
                          color: "#0f172a",
                        }}
                      >
                        {
                          bookingDetail.users_bookings_customer_idTousers
                            .full_name
                        }
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {bookingDetail.users_bookings_customer_idTousers.phone}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.2,
                    }}
                  >
                    <AssignmentInd
                      sx={{
                        color: "#15803d",
                      }}
                    />

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Provider
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: 13.5,
                          fontWeight: 750,
                          color: "#0f172a",
                        }}
                      >
                        {bookingDetail.users_bookings_provider_idTousers
                          ?.full_name || "Not assigned"}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {bookingDetail.users_bookings_provider_idTousers
                          ?.phone || "—"}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.2,
                    }}
                  >
                    <LocationOn
                      sx={{
                        color: "#dc2626",
                      }}
                    />

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Address
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#334155",
                        }}
                      >
                        {bookingDetail.service_area}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {bookingDetail.service_address}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: 3,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.2,
                    }}
                  >
                    <CalendarMonth
                      sx={{
                        color: "#7c3aed",
                      }}
                    />

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Preferred schedule
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: 13.5,
                          fontWeight: 750,
                          color: "#0f172a",
                        }}
                      >
                        {formatPreferredDate(bookingDetail.preferred_date)}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {formatPreferredTime(bookingDetail.preferred_time)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>

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
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                  }}
                >
                  Pricing
                </Typography>

                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 3,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      Estimated
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      NPR {bookingDetail.estimated_price}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      Final
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#15803d",
                      }}
                    >
                      {bookingDetail.final_price
                        ? `NPR ${bookingDetail.final_price}`
                        : "Not set"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {bookingDetail.notes && (
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
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                    }}
                  >
                    Customer notes
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: "#334155",
                    }}
                  >
                    {bookingDetail.notes}
                  </Typography>
                </Paper>
              )}

              {bookingDetail.cancellation_reason && (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 3,
                  }}
                >
                  Cancelled by {bookingDetail.cancelled_by || "unknown"}:{" "}
                  {bookingDetail.cancellation_reason}
                </Alert>
              )}

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                    mb: 2,
                  }}
                >
                  Status timeline
                </Typography>

                {bookingDetail.booking_status_history.length > 0 ? (
                  bookingDetail.booking_status_history.map((history, index) => (
                    <Box
                      key={history.id}
                      sx={{
                        position: "relative",
                        pl: 3,
                        pb:
                          index ===
                          bookingDetail.booking_status_history.length - 1
                            ? 0
                            : 2.5,

                        "&::before": {
                          content: '""',
                          position: "absolute",
                          left: 7,
                          top: 8,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#16a34a",
                        },

                        "&::after":
                          index ===
                          bookingDetail.booking_status_history.length - 1
                            ? {}
                            : {
                                content: '""',
                                position: "absolute",
                                left: 10.5,
                                top: 18,
                                bottom: 0,
                                width: 1,
                                bgcolor: "#e2e8f0",
                              },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 750,
                            color: "#334155",
                          }}
                        >
                          {history.old_status
                            ? `${getStatusLabel(history.old_status)} → `
                            : ""}
                          {getStatusLabel(history.new_status)}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 10.5,
                            color: "#94a3b8",
                          }}
                        >
                          {formatDate(history.created_at)}
                        </Typography>
                      </Box>

                      <Typography
                        sx={{
                          mt: 0.4,
                          fontSize: 11.5,
                          color: "#64748b",
                        }}
                      >
                        Changed by{" "}
                        {history.users?.full_name ||
                          history.changed_by_role ||
                          "system"}
                      </Typography>

                      {history.note && (
                        <Typography
                          sx={{
                            mt: 0.7,
                            fontSize: 12,
                            color: "#475569",
                          }}
                        >
                          {history.note}
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
                    No timeline records found.
                  </Typography>
                )}
              </Paper>
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
          {bookingDetail?.provider_id && (
            <Button
              variant="outlined"
              startIcon={<Chat />}
              onClick={() => {
                if (bookingDetail) {
                  void handleOpenChat(bookingDetail.id);
                }
              }}
              sx={{
                mr: "auto",
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              View Chat
            </Button>
          )}

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

      {/* CHAT HISTORY */}
      <Dialog
        open={chatDialogOpen}
        onClose={() => !isLoadingChat && setChatDialogOpen(false)}
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
                Chat history
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Read-only customer and provider conversation
              </Typography>
            </Box>

            <IconButton size="small" onClick={() => setChatDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 0,
            bgcolor: "#f8fafc",
          }}
        >
          {isLoadingChat ? (
            <Box
              sx={{
                minHeight: 350,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : adminChat ? (
            <>
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  bgcolor: "#ffffff",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(3, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        fontWeight: 800,
                      }}
                    >
                      Booking
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.4,
                        fontSize: 13,
                        fontWeight: 750,
                      }}
                    >
                      #{adminChat.booking_id} ·{" "}
                      {adminChat.bookings.services.name}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        fontWeight: 800,
                      }}
                    >
                      Customer
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.4,
                        fontSize: 13,
                        fontWeight: 750,
                      }}
                    >
                      {
                        adminChat.bookings.users_bookings_customer_idTousers
                          .full_name
                      }
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        fontWeight: 800,
                      }}
                    >
                      Provider
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.4,
                        fontSize: 13,
                        fontWeight: 750,
                      }}
                    >
                      {adminChat.bookings.users_bookings_provider_idTousers
                        ?.full_name || "Not assigned"}
                    </Typography>
                  </Box>
                </Box>

                {adminChat.archived_at && (
                  <Chip
                    label="Archived conversation"
                    size="small"
                    sx={{
                      mt: 1.5,
                      bgcolor: "#f1f5f9",
                      color: "#475569",
                      fontWeight: 700,
                    }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  p: {
                    xs: 2,
                    sm: 3,
                  },
                  maxHeight: 520,
                  overflowY: "auto",
                }}
              >
                {adminChat.chat_messages.length === 0 ? (
                  <Box
                    sx={{
                      py: 6,
                      textAlign: "center",
                    }}
                  >
                    <Chat
                      sx={{
                        fontSize: 38,
                        color: "#cbd5e1",
                      }}
                    />

                    <Typography
                      sx={{
                        mt: 1,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      No messages
                    </Typography>
                  </Box>
                ) : (
                  adminChat.chat_messages.map((message) => {
                    const isCustomer = message.sender_role === "customer";

                    const senderName = isCustomer
                      ? adminChat.bookings.users_bookings_customer_idTousers
                          .full_name
                      : adminChat.bookings.users_bookings_provider_idTousers
                          ?.full_name || "Provider";

                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: "flex",
                          justifyContent: isCustomer
                            ? "flex-start"
                            : "flex-end",
                          mb: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: {
                              xs: "90%",
                              sm: "70%",
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              mb: 0.4,
                              px: 0.5,
                              fontSize: 10.5,
                              color: "#64748b",
                              textAlign: isCustomer ? "left" : "right",
                            }}
                          >
                            {senderName}
                          </Typography>

                          <Paper
                            elevation={0}
                            sx={{
                              px: 1.6,
                              py: 1.2,
                              borderRadius: isCustomer
                                ? "4px 16px 16px 16px"
                                : "16px 4px 16px 16px",
                              bgcolor: isCustomer ? "#ffffff" : "#dcfce7",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {message.message_text && (
                              <Typography
                                sx={{
                                  fontSize: 13,
                                  color: "#334155",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {message.message_text}
                              </Typography>
                            )}

                            {message.image_url && (
                              <Typography
                                sx={{
                                  mt: message.message_text ? 1 : 0,
                                  fontSize: 11,
                                  color: "#2563eb",
                                  wordBreak: "break-all",
                                }}
                              >
                                Image: {message.image_url}
                              </Typography>
                            )}

                            <Typography
                              sx={{
                                mt: 0.6,
                                fontSize: 9.5,
                                color: "#94a3b8",
                                textAlign: "right",
                              }}
                            >
                              {formatDate(message.created_at)}
                            </Typography>
                          </Paper>
                        </Box>
                      </Box>
                    );
                  })
                )}

                {adminChat.chat_call_logs.length > 0 && (
                  <>
                    <Divider
                      sx={{
                        my: 3,
                      }}
                    />

                    <Typography
                      sx={{
                        mb: 1.5,
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      Call history
                    </Typography>

                    {adminChat.chat_call_logs.map((call) => (
                      <Paper
                        key={call.id}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          borderRadius: 2.5,
                          border: "1px solid #e2e8f0",
                          bgcolor: "#ffffff",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 1,
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: 12.5,
                                fontWeight: 750,
                                color: "#334155",
                              }}
                            >
                              {getStatusLabel(call.call_type)} call
                            </Typography>

                            <Typography
                              sx={{
                                mt: 0.3,
                                fontSize: 11,
                                color: "#64748b",
                              }}
                            >
                              {call.users_chat_call_logs_initiated_by_idTousers
                                ?.full_name || "Unknown"}{" "}
                              →{" "}
                              {call
                                .users_chat_call_logs_recipient_user_idTousers
                                ?.full_name || "Unknown"}
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              textAlign: "right",
                            }}
                          >
                            <Chip
                              label={getStatusLabel(call.status)}
                              size="small"
                              sx={{
                                height: 23,
                                fontSize: 10.5,
                                fontWeight: 700,
                              }}
                            />

                            <Typography
                              sx={{
                                mt: 0.4,
                                fontSize: 9.5,
                                color: "#94a3b8",
                              }}
                            >
                              {formatDate(call.started_at)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </>
                )}
              </Box>
            </>
          ) : null}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <Typography
            sx={{
              mr: "auto",
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            Admin view is read-only
          </Typography>

          <Button
            onClick={() => setChatDialogOpen(false)}
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

      {/* ASSIGN PROVIDER */}
      <Dialog
        open={assignDialogOpen}
        onClose={() => !isAssigning && setAssignDialogOpen(false)}
        fullWidth
        maxWidth="sm"
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
            px: 3,
            pt: 3,
            pb: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            {selectedBooking?.provider_id
              ? "Reassign provider"
              : "Assign provider"}
          </Typography>

          <Typography
            sx={{
              mt: 0.3,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Booking #{selectedBooking?.id}
          </Typography>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            pt: "20px !important",
          }}
        >
          <FormControl fullWidth>
            <InputLabel id="assign-provider-label">Provider</InputLabel>

            <Select
              labelId="assign-provider-label"
              label="Provider"
              value={selectedProviderId}
              onChange={(event) =>
                setSelectedProviderId(String(event.target.value))
              }
            >
              {providers.map((provider) => (
                <MenuItem key={provider.id} value={String(provider.id)}>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {provider.full_name}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      {provider.phone}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {providers.length === 0 && (
            <Alert
              severity="warning"
              sx={{
                mt: 2,
                borderRadius: 2.5,
              }}
            >
              No active providers are available.
            </Alert>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
          }}
        >
          <Button
            onClick={() => setAssignDialogOpen(false)}
            disabled={isAssigning}
            sx={{
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() => void handleAssignProvider()}
            disabled={
              isAssigning || !selectedProviderId || providers.length === 0
            }
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isAssigning
              ? "Saving..."
              : selectedBooking?.provider_id
                ? "Reassign Provider"
                : "Assign Provider"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CANCEL BOOKING */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => !isCancelling && setCancelDialogOpen(false)}
        fullWidth
        maxWidth="sm"
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
            px: 3,
            pt: 3,
            pb: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Cancel booking
          </Typography>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            pt: "16px !important",
          }}
        >
          <Alert
            severity="warning"
            sx={{
              mb: 2.5,
              borderRadius: 2.5,
            }}
          >
            You are about to cancel booking #{selectedBooking?.id}. This action
            will update the booking status for both the customer and provider.
          </Alert>

          <TextField
            label="Cancellation Reason"
            value={cancellationReason}
            onChange={(event) => setCancellationReason(event.target.value)}
            fullWidth
            multiline
            rows={4}
            helperText={`${cancellationReason.length}/500 characters`}
          />
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
          }}
        >
          <Button
            onClick={() => setCancelDialogOpen(false)}
            disabled={isCancelling}
            sx={{
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Keep Booking
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={() => void handleCancelBooking()}
            disabled={isCancelling}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isCancelling ? "Cancelling..." : "Cancel Booking"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}

export default BookingsPage;
