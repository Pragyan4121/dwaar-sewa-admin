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
  Block,
  ChevronLeft,
  ChevronRight,
  Close,
  Home,
  Person,
  Refresh,
  Replay,
  Reviews,
  Search,
  Star,
  TaskAlt,
  Visibility,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { clearAdminSession } from "../api/session";

type AccountFilter = "all" | "active" | "inactive";

interface CustomerSummaryData {
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  saved_addresses: number;
  reviews_count: number;
}

interface Customer {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  summary: CustomerSummaryData;
}

interface CustomerPageSummary {
  total: number;
  active: number;
  inactive: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

interface CustomersResponse {
  message: string;
  customers: Customer[];
  summary: CustomerPageSummary;
  pagination: PaginationData;
}

interface CustomerAddress {
  id: number;
  label: string;
  full_address: string;
  service_area: string;
  landmark: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

interface RecentBooking {
  id: number;
  status: string;
  preferred_date: string;
  preferred_time: string | null;
  service_address: string;
  service_area: string;
  estimated_price: string;
  final_price: string | null;
  created_at: string;

  services: {
    id: number;
    name: string;
  };

  users_bookings_provider_idTousers: {
    id: number;
    full_name: string;
    phone: string;
  } | null;
}

interface RecentReview {
  id: number;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
}

interface CustomerDetail extends Omit<Customer, "summary"> {
  addresses: CustomerAddress[];
  recent_bookings: RecentBooking[];
  recent_reviews: RecentReview[];

  booking_summary: {
    total_bookings: number;
    pending_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
  };
}

interface CustomerDetailResponse {
  message: string;
  customer: CustomerDetail;
}

const initialSummary: CustomerPageSummary = {
  total: 0,
  active: 0,
  inactive: 0,
};

const initialPagination: PaginationData = {
  page: 1,
  limit: 20,
  total_records: 0,
  total_pages: 0,
  has_next_page: false,
  has_previous_page: false,
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

const formatStatus = (value: string) => {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getCustomerInitials = (name: string) => {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "C";
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const getBookingStatusStyle = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return {
      color: "#15803d",
      background: "#f0fdf4",
      border: "#bbf7d0",
    };
  }

  if (normalized === "cancelled") {
    return {
      color: "#b91c1c",
      background: "#fef2f2",
      border: "#fecaca",
    };
  }

  if (normalized === "pending" || normalized === "assigned") {
    return {
      color: "#b45309",
      background: "#fffbeb",
      border: "#fde68a",
    };
  }

  if (
    normalized === "accepted" ||
    normalized === "travelling" ||
    normalized === "arrived"
  ) {
    return {
      color: "#1d4ed8",
      background: "#eff6ff",
      border: "#bfdbfe",
    };
  }

  if (normalized === "in_progress") {
    return {
      color: "#6d28d9",
      background: "#f5f3ff",
      border: "#ddd6fe",
    };
  }

  return {
    color: "#475569",
    background: "#f8fafc",
    border: "#e2e8f0",
  };
};

function CustomersPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [summary, setSummary] = useState<CustomerPageSummary>(initialSummary);

  const [pagination, setPagination] =
    useState<PaginationData>(initialPagination);

  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");

  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");

  const [isLoading, setIsLoading] = useState(true);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(
    null,
  );

  const [actionType, setActionType] = useState<
    "deactivate" | "reactivate" | null
  >(null);

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

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const parameters = new URLSearchParams();

      parameters.set("page", String(page));
      parameters.set("limit", "20");
      parameters.set("status", accountFilter);

      if (appliedSearch) {
        parameters.set("search", appliedSearch);
      }

      const response = await api.get<CustomersResponse>(
        `/api/admin/customers?${parameters.toString()}`,
      );

      setCustomers(response.data.customers);
      setSummary(response.data.summary);
      setPagination(response.data.pagination);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load customers.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, accountFilter, appliedSearch, getApiErrorMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCustomers();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchCustomers]);

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setAccountFilter("all");
    setPage(1);
  };

  const handleOpenDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerDetail(null);
    setDetailDialogOpen(true);
    setIsLoadingDetail(true);
    setErrorMessage("");

    try {
      const response = await api.get<CustomerDetailResponse>(
        `/api/admin/customers/${customer.id}`,
      );

      setCustomerDetail(response.data.customer);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not load customer details.",
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
    customer: Customer,
    type: "deactivate" | "reactivate",
  ) => {
    setSelectedCustomer(customer);
    setActionType(type);
    setErrorMessage("");
    setSuccessMessage("");
    setActionDialogOpen(true);
  };

  const handleCustomerAction = async () => {
    if (!selectedCustomer || !actionType) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.patch(
        `/api/admin/customers/${selectedCustomer.id}/${actionType}`,
      );

      setSuccessMessage(
        actionType === "deactivate"
          ? "Customer account deactivated successfully."
          : "Customer account reactivated successfully.",
      );

      setActionDialogOpen(false);
      setSelectedCustomer(null);
      setActionType(null);

      await fetchCustomers();
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Could not update customer account.",
      );

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const hasActiveFilters = Boolean(appliedSearch) || accountFilter !== "all";

  const summaryCards = [
    {
      label: "Total Customers",
      value: summary.total,
      color: "#2563eb",
      background: "#eff6ff",
    },

    {
      label: "Active Customers",
      value: summary.active,
      color: "#15803d",
      background: "#f0fdf4",
    },

    {
      label: "Inactive Customers",
      value: summary.inactive,
      color: "#64748b",
      background: "#f1f5f9",
    },
  ];

  return (
    <AdminLayout title="Customers">
      {/* HEADER */}
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
            Customer Management
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Review customer accounts, bookings, addresses and activity.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => void fetchCustomers()}
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
          Refresh customers
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

      {/* SUMMARY CARDS */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, minmax(0, 1fr))",
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
              p: 2.5,
              minHeight: 125,
              borderRadius: 3.5,
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
                gap: 2,
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
                    mt: 1.2,
                    fontSize: 31,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "#0f172a",
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
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Person
                  sx={{
                    fontSize: 21,
                    color: item.color,
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
              Search by name, phone or email and filter by account status.
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
              md: "minmax(280px, 2fr) minmax(170px, 1fr) auto",
            },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            label="Search customers"
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
            <InputLabel id="customer-account-label">Account</InputLabel>

            <Select
              labelId="customer-account-label"
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
          {pagination.total_records} customer
          {pagination.total_records === 1 ? "" : "s"} found
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
            Loading customers...
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
            <Table sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Bookings</TableCell>
                  <TableCell>Completed</TableCell>
                  <TableCell>Cancelled</TableCell>
                  <TableCell>Addresses</TableCell>
                  <TableCell>Reviews</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
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
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: "#dbeafe",
                            color: "#1d4ed8",
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {getCustomerInitials(customer.full_name)}
                        </Avatar>

                        <Box>
                          <Typography
                            sx={{
                              fontSize: 13.5,
                              fontWeight: 750,
                              color: "#0f172a",
                            }}
                          >
                            {customer.full_name}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.2,
                              fontSize: 11,
                              color: "#64748b",
                            }}
                          >
                            {customer.phone}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 10.5,
                              color: "#94a3b8",
                            }}
                          >
                            {customer.email || "No email"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {customer.summary.total_bookings}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={customer.summary.completed_bookings}
                        size="small"
                        sx={{
                          minWidth: 34,
                          height: 25,
                          bgcolor: "#f0fdf4",
                          color: "#15803d",
                          fontWeight: 750,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={customer.summary.cancelled_bookings}
                        size="small"
                        sx={{
                          minWidth: 34,
                          height: 25,
                          bgcolor: "#fef2f2",
                          color: "#b91c1c",
                          fontWeight: 750,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                        }}
                      >
                        <Home
                          sx={{
                            fontSize: 17,
                            color: "#7c3aed",
                          }}
                        />

                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#334155",
                          }}
                        >
                          {customer.summary.saved_addresses}
                        </Typography>
                      </Box>
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
                            fontWeight: 700,
                            color: "#334155",
                          }}
                        >
                          {customer.summary.reviews_count}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={customer.is_active ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          height: 27,
                          fontSize: 11,
                          fontWeight: 700,
                          color: customer.is_active ? "#15803d" : "#64748b",

                          bgcolor: customer.is_active ? "#f0fdf4" : "#f1f5f9",

                          border: customer.is_active
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
                        {formatDate(customer.created_at)}
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
                        <Tooltip title="View customer">
                          <IconButton
                            size="small"
                            onClick={() => void handleOpenDetails(customer)}
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

                        {customer.is_active ? (
                          <Tooltip title="Deactivate customer">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleOpenAction(customer, "deactivate")
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
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Reactivate customer">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleOpenAction(customer, "reactivate")
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
                ))}

                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <Person
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
                        No customers found
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
              {pagination.total_records} customers
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

      {/* CUSTOMER DETAILS */}
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
                Customer details
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Review profile, bookings, addresses and recent activity.
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
                minHeight: 350,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : customerDetail ? (
            <Box
              sx={{
                display: "grid",
                gap: 2,
              }}
            >
              {/* PROFILE */}
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
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.7,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: "#dbeafe",
                        color: "#1d4ed8",
                        fontSize: 20,
                        fontWeight: 800,
                      }}
                    >
                      {getCustomerInitials(customerDetail.full_name)}
                    </Avatar>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 19,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {customerDetail.full_name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {customerDetail.phone}
                        {" · "}
                        {customerDetail.email || "No email"}
                      </Typography>

                      <Chip
                        label={
                          customerDetail.is_active
                            ? "Active Account"
                            : "Inactive Account"
                        }
                        size="small"
                        sx={{
                          mt: 1,
                          height: 27,
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: customerDetail.is_active
                            ? "#f0fdf4"
                            : "#f1f5f9",

                          color: customerDetail.is_active
                            ? "#15803d"
                            : "#64748b",
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Paper>

              {/* BOOKING SUMMARY */}
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
                  Booking Summary
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
                      bgcolor: "#eff6ff",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 21,
                        fontWeight: 800,
                        color: "#1d4ed8",
                      }}
                    >
                      {customerDetail.booking_summary.total_bookings}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: "#64748b",
                      }}
                    >
                      Total
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.7,
                      borderRadius: 2.5,
                      bgcolor: "#fffbeb",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 21,
                        fontWeight: 800,
                        color: "#b45309",
                      }}
                    >
                      {customerDetail.booking_summary.pending_bookings}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: "#64748b",
                      }}
                    >
                      Pending
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.7,
                      borderRadius: 2.5,
                      bgcolor: "#f0fdf4",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 21,
                        fontWeight: 800,
                        color: "#15803d",
                      }}
                    >
                      {customerDetail.booking_summary.completed_bookings}
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
                    <Typography
                      sx={{
                        fontSize: 21,
                        fontWeight: 800,
                        color: "#b91c1c",
                      }}
                    >
                      {customerDetail.booking_summary.cancelled_bookings}
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
              </Paper>

              {/* ADDRESSES */}
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
                    mb: 1.7,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Home
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
                    Saved Addresses
                  </Typography>

                  <Chip
                    label={customerDetail.addresses.length}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: 10,
                    }}
                  />
                </Box>

                {customerDetail.addresses.map((address) => (
                  <Box
                    key={address.id}
                    sx={{
                      p: 1.7,
                      mb: 1,
                      borderRadius: 2.5,
                      border: "1px solid #e2e8f0",
                      bgcolor: "#ffffff",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.7,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 750,
                          color: "#334155",
                        }}
                      >
                        {address.label}
                      </Typography>

                      {address.is_default && (
                        <Chip
                          label="Default"
                          size="small"
                          sx={{
                            height: 22,
                            bgcolor: "#eff6ff",
                            color: "#1d4ed8",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        />
                      )}

                      {!address.is_active && (
                        <Chip
                          label="Inactive"
                          size="small"
                          sx={{
                            height: 22,
                            bgcolor: "#f1f5f9",
                            color: "#64748b",
                            fontSize: 10,
                          }}
                        />
                      )}
                    </Box>

                    <Typography
                      sx={{
                        mt: 0.8,
                        fontSize: 12.5,
                        color: "#334155",
                      }}
                    >
                      {address.full_address}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.3,
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      {address.service_area}
                    </Typography>

                    {address.landmark && (
                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        Landmark: {address.landmark}
                      </Typography>
                    )}
                  </Box>
                ))}

                {customerDetail.addresses.length === 0 && (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#94a3b8",
                    }}
                  >
                    No saved addresses.
                  </Typography>
                )}
              </Paper>

              {/* RECENT BOOKINGS */}
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
                    mb: 1.7,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <TaskAlt
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
                    Recent Bookings
                  </Typography>
                </Box>

                {customerDetail.recent_bookings.map((booking) => {
                  const statusStyle = getBookingStatusStyle(booking.status);

                  return (
                    <Box
                      key={booking.id}
                      sx={{
                        p: 1.7,
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
                          gap: 2,
                          flexWrap: "wrap",
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 750,
                              color: "#0f172a",
                            }}
                          >
                            #{booking.id} — {booking.services.name}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.4,
                              fontSize: 11,
                              color: "#64748b",
                            }}
                          >
                            {formatPreferredDate(booking.preferred_date)}
                          </Typography>
                        </Box>

                        <Chip
                          label={formatStatus(booking.status)}
                          size="small"
                          sx={{
                            height: 25,
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: statusStyle.color,
                            bgcolor: statusStyle.background,

                            border: `1px solid ${statusStyle.border}`,
                          }}
                        />
                      </Box>

                      <Typography
                        sx={{
                          mt: 1,
                          fontSize: 11.5,
                          color: "#475569",
                        }}
                      >
                        {booking.service_area} · {booking.service_address}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 11,
                          color: "#64748b",
                        }}
                      >
                        Provider:{" "}
                        {booking.users_bookings_provider_idTousers?.full_name ||
                          "Not assigned"}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 12,
                          fontWeight: 750,
                          color: "#0f172a",
                        }}
                      >
                        NPR {booking.final_price || booking.estimated_price}
                      </Typography>
                    </Box>
                  );
                })}

                {customerDetail.recent_bookings.length === 0 && (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#94a3b8",
                    }}
                  >
                    No bookings found.
                  </Typography>
                )}
              </Paper>

              {/* REVIEWS */}
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
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Reviews
                    sx={{
                      color: "#f59e0b",
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    Recent Reviews
                  </Typography>
                </Box>

                {customerDetail.recent_reviews.length > 0 ? (
                  customerDetail.recent_reviews.map((review) => (
                    <Box
                      key={review.id}
                      sx={{
                        py: 1.4,
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
                            {review.rating}/5
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

      {/* ACCOUNT ACTION */}
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
              {actionType === "deactivate"
                ? "Deactivate Customer"
                : "Reactivate Customer"}
            </Typography>

            <Typography
              sx={{
                mt: 0.3,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              {selectedCustomer?.full_name || "Customer"}
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
            severity={actionType === "deactivate" ? "warning" : "info"}
            sx={{
              borderRadius: 2.5,
            }}
          >
            {actionType === "deactivate"
              ? `This will prevent ${selectedCustomer?.full_name} from using the account. Customers with active bookings cannot be deactivated.`
              : `This will reactivate ${selectedCustomer?.full_name}'s account.`}
          </Alert>
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
            color={actionType === "deactivate" ? "error" : "primary"}
            startIcon={actionType === "deactivate" ? <Block /> : <Replay />}
            onClick={() => void handleCustomerAction()}
            disabled={isProcessing}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isProcessing
              ? "Processing..."
              : actionType === "deactivate"
                ? "Deactivate Customer"
                : "Reactivate Customer"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}

export default CustomersPage;
