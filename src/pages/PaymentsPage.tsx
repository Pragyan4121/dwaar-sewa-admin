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
  AccountBalanceWallet,
  ChevronLeft,
  ChevronRight,
  Close,
  Edit,
  Groups,
  Payments,
  Person,
  ReceiptLong,
  Refresh,
  Search,
  Visibility,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import { clearAdminSession } from "../api/session";
import AdminLayout from "../layouts/AdminLayout";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

type PaymentStatusFilter = "all" | PaymentStatus;

interface UserSummary {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
}

interface ServiceSummary {
  id: number;
  name: string;
}

interface BookingSummary {
  id: number;
  status: string;
  service_address: string;
  service_area: string;
  estimated_price: string;
  final_price: string | null;
  created_at: string;
  services: ServiceSummary;

  users_bookings_customer_idTousers: UserSummary;

  users_bookings_provider_idTousers: UserSummary | null;
}

interface Payment {
  id: number;
  booking_id: number;
  amount: string;
  payment_method: string;
  payment_status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  bookings: BookingSummary;
}

interface PaymentSummary {
  pending: number;
  paid: number;
  failed: number;
  refunded: number;
  total_paid_amount: string | number;
  total_refunded_amount: string | number;
}

interface PaginationData {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

interface PaymentsResponse {
  message: string;
  payments: Payment[];
  summary: PaymentSummary;
  payment_methods: string[];
  pagination: PaginationData;
}

interface PaymentDetailBooking extends BookingSummary {
  services: {
    id: number;
    name: string;
    description: string | null;
    base_price: string;
  };

  users_bookings_customer_idTousers: UserSummary & {
    is_active: boolean;
  };

  users_bookings_provider_idTousers:
    | (UserSummary & {
        is_active: boolean;
      })
    | null;
}

interface PaymentDetail extends Omit<Payment, "bookings"> {
  bookings: PaymentDetailBooking;
}

interface PaymentDetailResponse {
  message: string;
  payment: PaymentDetail;
}

interface CashCommissionDueProvider {
  provider_id: number;
  full_name: string;
  phone: string;
  email: string | null;
  wallet_id: number;
  currency: string;
  amount_owed: string;
  last_updated: string | null;
}

interface CashCommissionDueResponse {
  message: string;

  summary: {
    providers_with_dues: number;
    total_amount_owed: number;
  };

  providers: CashCommissionDueProvider[];
}

const initialSummary: PaymentSummary = {
  pending: 0,
  paid: 0,
  failed: 0,
  refunded: 0,
  total_paid_amount: 0,
  total_refunded_amount: 0,
};

const initialPagination: PaginationData = {
  page: 1,
  limit: 20,
  total_records: 0,
  total_pages: 0,
  has_next_page: false,
  has_previous_page: false,
};

const paymentStatusOptions: {
  value: PaymentStatusFilter;
  label: string;
}[] = [
  {
    value: "all",
    label: "All Statuses",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "paid",
    label: "Paid",
  },
  {
    value: "failed",
    label: "Failed",
  },
  {
    value: "refunded",
    label: "Refunded",
  },
];

const paymentStatusStyles: Record<
  PaymentStatus,
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

  paid: {
    color: "#15803d",
    background: "#f0fdf4",
    border: "#bbf7d0",
  },

  failed: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "#fecaca",
  },

  refunded: {
    color: "#0369a1",
    background: "#f0f9ff",
    border: "#bae6fd",
  },
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
};

const formatLabel = (value: string) => {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatMoney = (value: string | number) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "NPR 0.00";
  }

  return `NPR ${numberValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function PaymentStatusChip({ status }: { status: PaymentStatus }) {
  const style = paymentStatusStyles[status] ?? paymentStatusStyles.pending;

  return (
    <Chip
      label={formatLabel(status)}
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

function PaymentsPage() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState<Payment[]>([]);

  const [summary, setSummary] = useState<PaymentSummary>(initialSummary);

  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  const [pagination, setPagination] =
    useState<PaginationData>(initialPagination);

  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");

  const [methodFilter, setMethodFilter] = useState("all");

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [paymentDetail, setPaymentDetail] = useState<PaymentDetail | null>(
    null,
  );

  const [selectedStatus, setSelectedStatus] =
    useState<PaymentStatus>("pending");

  const [cashCommissionDue, setCashCommissionDue] =
    useState<CashCommissionDueResponse | null>(null);

  const [isLoadingCashDue, setIsLoadingCashDue] = useState(true);

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

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const parameters = new URLSearchParams();

      parameters.set("page", String(page));

      parameters.set("limit", "20");

      parameters.set("status", statusFilter);

      parameters.set("method", methodFilter);

      if (appliedSearch) {
        parameters.set("search", appliedSearch);
      }

      if (dateFrom) {
        parameters.set("dateFrom", dateFrom);
      }

      if (dateTo) {
        parameters.set("dateTo", dateTo);
      }

      const response = await api.get<PaymentsResponse>(
        `/api/admin/payments?${parameters.toString()}`,
      );

      setPayments(response.data.payments);

      setSummary(response.data.summary);

      setPaymentMethods(response.data.payment_methods);

      setPagination(response.data.pagination);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load payments.");

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
    methodFilter,
    dateFrom,
    dateTo,
    getApiErrorMessage,
  ]);

  const fetchCashCommissionDue = useCallback(async () => {
    setIsLoadingCashDue(true);

    try {
      const response = await api.get<CashCommissionDueResponse>(
        "/api/admin/payments/cash-commission-due",
      );

      setCashCommissionDue(response.data);
    } catch (error: unknown) {
      getApiErrorMessage(error, "Could not load cash commission dues.");
    } finally {
      setIsLoadingCashDue(false);
    }
  }, [getApiErrorMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCashCommissionDue();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchCashCommissionDue]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPayments();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchPayments]);

  const handleRefresh = async () => {
    await Promise.all([fetchPayments(), fetchCashCommissionDue()]);
  };

  const handleSearch = () => {
    setPage(1);

    setAppliedSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleOpenDetails = async (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentDetail(null);
    setDetailDialogOpen(true);
    setIsLoadingDetail(true);
    setErrorMessage("");

    try {
      const response = await api.get<PaymentDetailResponse>(
        `/api/admin/payments/${payment.id}`,
      );

      setPaymentDetail(response.data.payment);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load payment details.",
      );

      if (message) {
        setErrorMessage(message);
      }

      setDetailDialogOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleOpenStatusDialog = (payment: Payment) => {
    setSelectedPayment(payment);

    setSelectedStatus(payment.payment_status);

    setStatusDialogOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayment) {
      return;
    }

    if (selectedStatus === selectedPayment.payment_status) {
      setErrorMessage(`Payment is already marked as ${selectedStatus}.`);

      return;
    }

    setIsUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(`/api/admin/payments/${selectedPayment.id}/status`, {
        status: selectedStatus,
      });

      setSuccessMessage("Payment status updated successfully.");

      setStatusDialogOpen(false);
      setSelectedPayment(null);

      await Promise.all([fetchPayments(), fetchCashCommissionDue()]);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not update payment status.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const hasActiveFilters =
    Boolean(appliedSearch) ||
    statusFilter !== "all" ||
    methodFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const summaryCards = [
    {
      label: "Pending",
      value: summary.pending,
      color: "#d97706",
      background: "#fffbeb",
    },

    {
      label: "Paid",
      value: summary.paid,
      color: "#15803d",
      background: "#f0fdf4",
    },

    {
      label: "Failed",
      value: summary.failed,
      color: "#dc2626",
      background: "#fef2f2",
    },

    {
      label: "Refunded",
      value: summary.refunded,
      color: "#0284c7",
      background: "#f0f9ff",
    },

    {
      label: "Paid Amount",
      value: formatMoney(summary.total_paid_amount),
      color: "#16a34a",
      background: "#f0fdf4",
    },

    {
      label: "Refunded Amount",
      value: formatMoney(summary.total_refunded_amount),
      color: "#7c3aed",
      background: "#f5f3ff",
    },
  ];

  return (
    <AdminLayout title="Payments">
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
            Payment Management
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Track payment records, transaction status and provider cash
            commission dues.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => void handleRefresh()}
          disabled={isLoading || isLoadingCashDue}
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
          Refresh payments
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
              minHeight: 112,
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
                fontSize: typeof item.value === "number" ? 29 : 19,

                lineHeight: 1.15,
                fontWeight: 800,
                color: "#0f172a",
                wordBreak: "break-word",
              }}
            >
              {item.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* CASH COMMISSION DUE */}
      <Paper
        elevation={0}
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },

          mb: 3,
          borderRadius: 3.5,

          border:
            (cashCommissionDue?.summary.providers_with_dues ?? 0) > 0
              ? "1px solid #fde68a"
              : "1px solid #e2e8f0",

          bgcolor:
            (cashCommissionDue?.summary.providers_with_dues ?? 0) > 0
              ? "#fffdf7"
              : "#ffffff",
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
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2.5,
                bgcolor: "#fef3c7",
                color: "#b45309",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <AccountBalanceWallet />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Cash Commission Due
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,
                  maxWidth: 720,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "#64748b",
                }}
              >
                Commission owed by providers who collected cash directly from
                customers.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              textAlign: {
                xs: "left",
                sm: "right",
              },
            }}
          >
            <Typography
              sx={{
                fontSize: 10.5,
                color: "#64748b",
                textTransform: "uppercase",

                fontWeight: 750,
                letterSpacing: "0.05em",
              }}
            >
              Total owed
            </Typography>

            <Typography
              sx={{
                mt: 0.3,
                fontSize: 22,
                fontWeight: 800,
                color:
                  (cashCommissionDue?.summary.total_amount_owed ?? 0) > 0
                    ? "#b45309"
                    : "#15803d",
              }}
            >
              {isLoadingCashDue
                ? "..."
                : formatMoney(
                    cashCommissionDue?.summary.total_amount_owed ?? 0,
                  )}
            </Typography>

            <Typography
              sx={{
                mt: 0.3,
                fontSize: 10.5,
                color: "#94a3b8",
              }}
            >
              {cashCommissionDue?.summary.providers_with_dues ?? 0} provider
              {(cashCommissionDue?.summary.providers_with_dues ?? 0) === 1
                ? ""
                : "s"}{" "}
              with dues
            </Typography>
          </Box>
        </Box>

        {isLoadingCashDue && (
          <Box
            sx={{
              mt: 2.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <CircularProgress size={18} />

            <Typography
              sx={{
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Loading commission dues...
            </Typography>
          </Box>
        )}

        {!isLoadingCashDue &&
          cashCommissionDue &&
          cashCommissionDue.providers.length > 0 && (
            <TableContainer
              sx={{
                mt: 2.5,
                border: "1px solid #fde68a",

                borderRadius: 2.5,
                bgcolor: "#ffffff",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: "#64748b",
                        bgcolor: "#fffbeb",
                      }}
                    >
                      Provider
                    </TableCell>

                    <TableCell
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: "#64748b",
                        bgcolor: "#fffbeb",
                      }}
                    >
                      Contact
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: "#64748b",
                        bgcolor: "#fffbeb",
                      }}
                    >
                      Amount Owed
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: "#64748b",
                        bgcolor: "#fffbeb",
                      }}
                    >
                      Last Updated
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {cashCommissionDue.providers.map((provider) => (
                    <TableRow key={provider.provider_id}>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 750,

                            color: "#334155",
                          }}
                        >
                          {provider.full_name}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: "#64748b",
                          }}
                        >
                          {provider.phone}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 10,
                            color: "#94a3b8",
                          }}
                        >
                          {provider.email || "No email"}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={formatMoney(provider.amount_owed)}
                          sx={{
                            bgcolor: "#fef3c7",

                            color: "#b45309",

                            fontSize: 10.5,

                            fontWeight: 750,
                          }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 10.5,
                            color: "#64748b",
                          }}
                        >
                          {formatDate(provider.last_updated)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

        {!isLoadingCashDue &&
          cashCommissionDue &&
          cashCommissionDue.providers.length === 0 && (
            <Alert
              severity="success"
              sx={{
                mt: 2,
                borderRadius: 2.5,
              }}
            >
              No provider currently owes cash commission.
            </Alert>
          )}
      </Paper>

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
              Search by customer, provider, service, phone or payment method.
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

              md: "minmax(280px, 2fr) repeat(2, minmax(150px, 1fr))",

              xl: "minmax(300px, 2fr) repeat(4, minmax(145px, 1fr))",
            },

            gap: 1.5,
          }}
        >
          <TextField
            label="Search payments"
            placeholder="Customer, provider, service, phone or method"
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
            <InputLabel id="payment-status-label">Status</InputLabel>

            <Select
              labelId="payment-status-label"
              label="Status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as PaymentStatusFilter);

                setPage(1);
              }}
            >
              {paymentStatusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="payment-method-label">Method</InputLabel>

            <Select
              labelId="payment-method-label"
              label="Method"
              value={methodFilter}
              onChange={(event) => {
                setMethodFilter(String(event.target.value));

                setPage(1);
              }}
            >
              <MenuItem value="all">All Methods</MenuItem>

              {paymentMethods.map((method) => (
                <MenuItem key={method} value={method}>
                  {formatLabel(method)}
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
            alignItems: "center",
            flexWrap: "wrap",
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
            Search payments
          </Button>

          <Typography
            sx={{
              ml: {
                sm: "auto",
              },

              fontSize: 11.5,
              color: "#64748b",
            }}
          >
            {pagination.total_records} payment
            {pagination.total_records === 1 ? "" : "s"} found
          </Typography>
        </Box>
      </Paper>

      {/* PAYMENT TABLE */}
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
            Loading payments...
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
                minWidth: 1370,
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Payment</TableCell>

                  <TableCell>Booking</TableCell>

                  <TableCell>Customer</TableCell>

                  <TableCell>Provider</TableCell>

                  <TableCell>Service</TableCell>

                  <TableCell>Method</TableCell>

                  <TableCell>Amount</TableCell>

                  <TableCell>Status</TableCell>

                  <TableCell>Paid At</TableCell>

                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {payments.map((payment) => (
                  <TableRow
                    key={payment.id}
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
                        #{payment.id}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 10.5,

                          color: "#94a3b8",
                        }}
                      >
                        {formatDate(payment.created_at)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={`#${payment.bookings.id}`}
                        size="small"
                        sx={{
                          height: 24,
                          bgcolor: "#f8fafc",

                          color: "#475569",

                          fontSize: 10.5,

                          fontWeight: 700,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,

                          color: "#334155",
                        }}
                      >
                        {
                          payment.bookings.users_bookings_customer_idTousers
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
                        {
                          payment.bookings.users_bookings_customer_idTousers
                            .phone
                        }
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {payment.bookings.users_bookings_provider_idTousers ? (
                        <>
                          <Typography
                            sx={{
                              fontSize: 13,

                              fontWeight: 700,

                              color: "#334155",
                            }}
                          >
                            {
                              payment.bookings.users_bookings_provider_idTousers
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
                            {
                              payment.bookings.users_bookings_provider_idTousers
                                .phone
                            }
                          </Typography>
                        </>
                      ) : (
                        <Chip
                          label="Not assigned"
                          size="small"
                          sx={{
                            height: 24,
                            bgcolor: "#f1f5f9",

                            color: "#64748b",

                            fontSize: 10.5,
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
                        {payment.bookings.services.name}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={formatLabel(payment.payment_method)}
                        size="small"
                        sx={{
                          height: 25,
                          bgcolor: "#f8fafc",

                          color: "#475569",

                          border: "1px solid #e2e8f0",

                          fontSize: 10.5,

                          fontWeight: 650,
                        }}
                      />
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
                        {formatMoney(payment.amount)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <PaymentStatusChip status={payment.payment_status} />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          maxWidth: 120,

                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        {formatDate(payment.paid_at)}
                      </Typography>
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
                        <Tooltip title="View payment">
                          <IconButton
                            size="small"
                            onClick={() => void handleOpenDetails(payment)}
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

                        <Tooltip title="Update status">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenStatusDialog(payment)}
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
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}

                {payments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      align="center"
                      sx={{
                        py: 8,
                      }}
                    >
                      <Payments
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
                        No payments found
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
              {pagination.total_records} payments
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

      {/* PAYMENT DETAILS */}
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
                Payment details
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {selectedPayment
                  ? `Payment #${selectedPayment.id}`
                  : "Payment information"}
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
                minHeight: 340,
                display: "flex",
                justifyContent: "center",

                alignItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : paymentDetail ? (
            <Box
              sx={{
                display: "grid",
                gap: 2,
              }}
            >
              {/* PAYMENT OVERVIEW */}
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

                    justifyContent: "space-between",

                    alignItems: {
                      xs: "flex-start",
                      sm: "center",
                    },

                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: "#94a3b8",
                        textTransform: "uppercase",

                        letterSpacing: "0.05em",
                      }}
                    >
                      Amount
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 28,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {formatMoney(paymentDetail.amount)}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.4,
                        fontSize: 11.5,
                        color: "#64748b",
                      }}
                    >
                      {formatLabel(paymentDetail.payment_method)}
                    </Typography>
                  </Box>

                  <PaymentStatusChip status={paymentDetail.payment_status} />
                </Box>
              </Paper>

              {/* IDs + TIMES */}
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
                    p: 2.1,
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
                    Payment ID
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#334155",
                    }}
                  >
                    #{paymentDetail.id}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.1,
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
                    Booking ID
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#334155",
                    }}
                  >
                    #{paymentDetail.bookings.id}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.1,
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
                    Created At
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      color: "#334155",
                    }}
                  >
                    {formatDate(paymentDetail.created_at)}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.1,
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
                    Paid At
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      color: "#334155",
                    }}
                  >
                    {formatDate(paymentDetail.paid_at)}
                  </Typography>
                </Paper>
              </Box>

              {/* SERVICE */}
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
                    mb: 1.2,
                  }}
                >
                  <ReceiptLong
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
                    Service
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 750,
                    color: "#334155",
                  }}
                >
                  {paymentDetail.bookings.services.name}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.4,
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: "#64748b",
                  }}
                >
                  {paymentDetail.bookings.services.description ||
                    "No description"}
                </Typography>

                <Typography
                  sx={{
                    mt: 1,
                    fontSize: 11,
                    color: "#94a3b8",
                  }}
                >
                  Base price:{" "}
                  {formatMoney(paymentDetail.bookings.services.base_price)}
                </Typography>
              </Paper>

              {/* CUSTOMER / PROVIDER */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, 1fr)",
                  },

                  gap: 2,
                }}
              >
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
                      mb: 1.2,
                    }}
                  >
                    <Person
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
                      Customer
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 13.5,
                      fontWeight: 750,
                      color: "#334155",
                    }}
                  >
                    {
                      paymentDetail.bookings.users_bookings_customer_idTousers
                        .full_name
                    }
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.4,
                      fontSize: 11.5,
                      color: "#64748b",
                    }}
                  >
                    {
                      paymentDetail.bookings.users_bookings_customer_idTousers
                        .phone
                    }
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,
                      fontSize: 11,
                      color: "#94a3b8",
                    }}
                  >
                    {paymentDetail.bookings.users_bookings_customer_idTousers
                      .email || "No email"}
                  </Typography>
                </Paper>

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
                      mb: 1.2,
                    }}
                  >
                    <Groups
                      sx={{
                        color: "#15803d",
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      Provider
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 13.5,
                      fontWeight: 750,
                      color: "#334155",
                    }}
                  >
                    {paymentDetail.bookings.users_bookings_provider_idTousers
                      ?.full_name || "Not assigned"}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.4,
                      fontSize: 11.5,
                      color: "#64748b",
                    }}
                  >
                    {paymentDetail.bookings.users_bookings_provider_idTousers
                      ?.phone || "—"}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,
                      fontSize: 11,
                      color: "#94a3b8",
                    }}
                  >
                    {paymentDetail.bookings.users_bookings_provider_idTousers
                      ?.email || "No email"}
                  </Typography>
                </Paper>
              </Box>

              {/* SERVICE LOCATION */}
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
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                  }}
                >
                  Service Location
                </Typography>

                <Typography
                  sx={{
                    mt: 0.8,
                    fontSize: 13,
                    fontWeight: 650,
                    color: "#334155",
                  }}
                >
                  {paymentDetail.bookings.service_address}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.3,
                    fontSize: 11.5,
                    color: "#64748b",
                  }}
                >
                  {paymentDetail.bookings.service_area}
                </Typography>
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

      {/* STATUS DIALOG */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => !isUpdating && setStatusDialogOpen(false)}
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
              Update Payment Status
            </Typography>

            <Typography
              sx={{
                mt: 0.3,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Payment #{selectedPayment?.id} ·{" "}
              {selectedPayment ? formatMoney(selectedPayment.amount) : ""}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            pt: "24px !important",
          }}
        >
          {selectedPayment && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <Typography
                sx={{
                  fontSize: 10.5,
                  color: "#94a3b8",
                  textTransform: "uppercase",

                  fontWeight: 750,
                }}
              >
                Current status
              </Typography>

              <Box sx={{ mt: 0.8 }}>
                <PaymentStatusChip status={selectedPayment.payment_status} />
              </Box>
            </Box>
          )}

          <FormControl fullWidth>
            <InputLabel id="update-payment-status-label">
              New Payment Status
            </InputLabel>

            <Select
              labelId="update-payment-status-label"
              label="New Payment Status"
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value as PaymentStatus)
              }
            >
              <MenuItem value="pending">Pending</MenuItem>

              <MenuItem value="paid">Paid</MenuItem>

              <MenuItem value="failed">Failed</MenuItem>

              <MenuItem value="refunded">Refunded</MenuItem>
            </Select>
          </FormControl>

          {selectedStatus === "refunded" &&
            selectedPayment?.payment_status !== "paid" && (
              <Alert
                severity="warning"
                sx={{
                  mt: 2,
                  borderRadius: 2.5,
                }}
              >
                Only a paid payment can be marked as refunded.
              </Alert>
            )}

          {selectedStatus === "paid" && (
            <Alert
              severity="info"
              sx={{
                mt: 2,
                borderRadius: 2.5,
              }}
            >
              Confirm that the payment was actually received before marking it
              as paid.
            </Alert>
          )}

          {selectedStatus === "failed" && (
            <Alert
              severity="warning"
              sx={{
                mt: 2,
                borderRadius: 2.5,
              }}
            >
              The payment will be recorded as failed.
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
            onClick={() => setStatusDialogOpen(false)}
            disabled={isUpdating}
            sx={{
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() => void handleUpdateStatus()}
            disabled={
              isUpdating || selectedStatus === selectedPayment?.payment_status
            }
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isUpdating ? "Updating..." : "Update Status"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}

export default PaymentsPage;
