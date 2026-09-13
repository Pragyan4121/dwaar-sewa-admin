import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Rating,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Assessment,
  CalendarMonth,
  ChevronRight,
  Groups,
  Insights,
  Payments,
  Refresh,
  Search,
  TaskAlt,
  TrendingDown,
  TrendingUp,
  WorkOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { clearAdminSession } from "../api/session";

interface ReportsOverview {
  total_bookings: number;
  total_customers: number;
  total_providers: number;
  total_services: number;
  total_paid_amount: string | number;
  total_paid_transactions: number;
  total_refunded_amount: string | number;
  total_refunded_transactions: number;
  completion_rate: number;
  cancellation_rate: number;
}

interface BookingSummary {
  pending: number;
  accepted: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

interface ReportsOverviewResponse {
  message: string;
  overview: ReportsOverview;
  booking_summary: BookingSummary;
}

interface TopService {
  service_id: number;
  service_name: string;

  category: {
    id: number;
    name: string;
  } | null;

  base_price: string | number | null;
  total_bookings: number;
  estimated_revenue: string | number;
  final_revenue: string | number;
}

interface TopServicesResponse {
  message: string;
  services: TopService[];
}

interface TopProvider {
  provider_id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  verification_status: string;
  average_rating: string | number;
  total_reviews: number;
  completed_bookings: number;
  total_revenue: string | number;
}

interface TopProvidersResponse {
  message: string;
  providers: TopProvider[];
}

interface DailyTrend {
  date: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  paid_revenue: number;
}

interface DailyTrendsResponse {
  message: string;
  trends: DailyTrend[];
}

const initialOverview: ReportsOverview = {
  total_bookings: 0,
  total_customers: 0,
  total_providers: 0,
  total_services: 0,
  total_paid_amount: 0,
  total_paid_transactions: 0,
  total_refunded_amount: 0,
  total_refunded_transactions: 0,
  completion_rate: 0,
  cancellation_rate: 0,
};

const initialBookingSummary: BookingSummary = {
  pending: 0,
  accepted: 0,
  assigned: 0,
  in_progress: 0,
  completed: 0,
  cancelled: 0,
};

const bookingStatusStyles: Record<
  keyof BookingSummary,
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
    color: "#1d4ed8",
    background: "#eff6ff",
    border: "#bfdbfe",
  },

  assigned: {
    color: "#2563eb",
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

const formatPercent = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;

  return `${safeValue.toFixed(1)}%`;
};

function ReportsPage() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState<ReportsOverview>(initialOverview);

  const [bookingSummary, setBookingSummary] = useState<BookingSummary>(
    initialBookingSummary,
  );

  const [topServices, setTopServices] = useState<TopService[]>([]);

  const [topProviders, setTopProviders] = useState<TopProvider[]>([]);

  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [appliedDateFrom, setAppliedDateFrom] = useState("");

  const [appliedDateTo, setAppliedDateTo] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

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

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const parameters = new URLSearchParams();

      if (appliedDateFrom) {
        parameters.set("dateFrom", appliedDateFrom);
      }

      if (appliedDateTo) {
        parameters.set("dateTo", appliedDateTo);
      }

      const queryString = parameters.toString();

      const [
        overviewResponse,
        servicesResponse,
        providersResponse,
        trendsResponse,
      ] = await Promise.all([
        api.get<ReportsOverviewResponse>(
          `/api/admin/reports/overview${queryString ? `?${queryString}` : ""}`,
        ),

        api.get<TopServicesResponse>(
          `/api/admin/reports/top-services${
            queryString ? `?${queryString}` : ""
          }`,
        ),

        api.get<TopProvidersResponse>(
          `/api/admin/reports/top-providers${
            queryString ? `?${queryString}` : ""
          }`,
        ),

        api.get<DailyTrendsResponse>(
          `/api/admin/reports/daily-trends${
            queryString ? `?${queryString}` : ""
          }`,
        ),
      ]);

      setOverview(overviewResponse.data.overview);

      setBookingSummary(overviewResponse.data.booking_summary);

      setTopServices(servicesResponse.data.services);

      setTopProviders(providersResponse.data.providers);

      setDailyTrends(trendsResponse.data.trends);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load reports.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [appliedDateFrom, appliedDateTo, getApiErrorMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchReports();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchReports]);

  const handleApplyFilters = () => {
    if (
      dateFrom &&
      dateTo &&
      new Date(dateFrom).getTime() > new Date(dateTo).getTime()
    ) {
      setErrorMessage("Start date cannot be after end date.");

      return;
    }

    setErrorMessage("");
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setErrorMessage("");
  };

  const hasDateFilter = Boolean(appliedDateFrom) || Boolean(appliedDateTo);

  const overviewCards = [
    {
      label: "Total Bookings",
      value: overview.total_bookings,
      icon: <Assessment />,
      color: "#2563eb",
      background: "#eff6ff",
    },

    {
      label: "Paid Revenue",
      value: formatMoney(overview.total_paid_amount),
      icon: <Payments />,
      color: "#15803d",
      background: "#f0fdf4",
    },

    {
      label: "Completion Rate",
      value: formatPercent(overview.completion_rate),
      icon: <TrendingUp />,
      color: "#16a34a",
      background: "#f0fdf4",
    },

    {
      label: "Cancellation Rate",
      value: formatPercent(overview.cancellation_rate),
      icon: <TrendingDown />,
      color: "#dc2626",
      background: "#fef2f2",
    },

    {
      label: "Customers",
      value: overview.total_customers,
      icon: <Groups />,
      color: "#7c3aed",
      background: "#f5f3ff",
    },

    {
      label: "Providers",
      value: overview.total_providers,
      icon: <WorkOutlined />,
      color: "#0284c7",
      background: "#f0f9ff",
    },

    {
      label: "Services",
      value: overview.total_services,
      icon: <TaskAlt />,
      color: "#d97706",
      background: "#fffbeb",
    },

    {
      label: "Paid Transactions",
      value: overview.total_paid_transactions,
      icon: <Payments />,
      color: "#0f766e",
      background: "#f0fdfa",
    },
  ];

  const maxDailyBookings = Math.max(
    ...dailyTrends.map((trend) => trend.total_bookings),
    1,
  );

  return (
    <AdminLayout title="Reports">
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
            Reports & Analytics
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Monitor bookings, revenue, providers and service performance.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => void fetchReports()}
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
          Refresh reports
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

      {/* DATE FILTER */}
      <Paper
        elevation={0}
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },
          mb: 3,
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
            flexWrap: "wrap",
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
              Report period
            </Typography>

            <Typography
              sx={{
                mt: 0.2,
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Filter all analytics by the same date range.
            </Typography>
          </Box>

          {hasDateFilter && (
            <Chip
              icon={<CalendarMonth />}
              label={`${
                appliedDateFrom || "Beginning"
              } → ${appliedDateTo || "Today"}`}
              size="small"
              sx={{
                bgcolor: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: 700,

                "& .MuiChip-icon": {
                  color: "inherit",
                },
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr auto",
            },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            label="Date From"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
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
            onChange={(event) => setDateTo(event.target.value)}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={handleApplyFilters}
              sx={{
                minHeight: 40,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "none",

                "&:hover": {
                  boxShadow: "none",
                },
              }}
            >
              Apply
            </Button>

            {hasDateFilter && (
              <Button
                variant="text"
                onClick={handleClearFilters}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Clear
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {isLoading ? (
        <Box
          sx={{
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
          <CircularProgress size={36} />

          <Typography
            sx={{
              fontSize: 13,
              color: "#64748b",
            }}
          >
            Loading analytics...
          </Typography>
        </Box>
      ) : (
        <>
          {/* OVERVIEW */}
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
            {overviewCards.map((item) => (
              <Paper
                key={item.label}
                elevation={0}
                sx={{
                  p: 2.2,
                  minHeight: 125,
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
                        fontSize: typeof item.value === "number" ? 28 : 19,
                        lineHeight: 1.15,
                        fontWeight: 800,
                        color: "#0f172a",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      flexShrink: 0,
                      borderRadius: 2.5,
                      bgcolor: item.background,
                      color: item.color,
                      display: "grid",
                      placeItems: "center",

                      "& svg": {
                        fontSize: 21,
                      },
                    }}
                  >
                    {item.icon}
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>

          {/* REVENUE REFUND SUMMARY */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "2fr 1fr",
              },
              gap: 2,
              mb: 3,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3.5,
                border: "1px solid #e2e8f0",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                }}
              >
                <Insights
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
                  Booking Performance
                </Typography>
              </Box>

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
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                      mb: 0.7,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Completion rate
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#15803d",
                      }}
                    >
                      {formatPercent(overview.completion_rate)}
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min(Math.max(overview.completion_rate, 0), 100)}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      bgcolor: "#dcfce7",

                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        bgcolor: "#16a34a",
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                      mb: 0.7,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Cancellation rate
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#dc2626",
                      }}
                    >
                      {formatPercent(overview.cancellation_rate)}
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      Math.max(overview.cancellation_rate, 0),
                      100,
                    )}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      bgcolor: "#fee2e2",

                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        bgcolor: "#dc2626",
                      },
                    }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 2.5,
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                {(
                  Object.entries(bookingSummary) as [
                    keyof BookingSummary,
                    number,
                  ][]
                ).map(([status, count]) => {
                  const style = bookingStatusStyles[status];

                  return (
                    <Chip
                      key={status}
                      label={`${formatLabel(status)}: ${count}`}
                      size="small"
                      sx={{
                        height: 28,
                        fontSize: 11,
                        fontWeight: 700,
                        color: style.color,
                        bgcolor: style.background,
                        border: `1px solid ${style.border}`,
                      }}
                    />
                  );
                })}
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3.5,
                border: "1px solid #e2e8f0",
              }}
            >
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Refund Summary
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Refunded transactions in the selected period.
              </Typography>

              <Typography
                sx={{
                  mt: 2,
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#7c3aed",
                }}
              >
                {formatMoney(overview.total_refunded_amount)}
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                {overview.total_refunded_transactions} refunded transaction
                {overview.total_refunded_transactions === 1 ? "" : "s"}
              </Typography>
            </Paper>
          </Box>

          {/* TOP SERVICES / PROVIDERS */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl: "1fr 1fr",
              },
              gap: 2,
              mb: 3,
            }}
          >
            {/* TOP SERVICES */}
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 3.5,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #e2e8f0",
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
                    Top Services
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,
                      fontSize: 11.5,
                      color: "#64748b",
                    }}
                  >
                    Best performing services by bookings.
                  </Typography>
                </Box>

                <ChevronRight
                  sx={{
                    color: "#94a3b8",
                  }}
                />
              </Box>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell align="right">Bookings</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {topServices.map((service, index) => (
                    <TableRow key={service.service_id} hover>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.2,
                          }}
                        >
                          <Box
                            sx={{
                              width: 30,
                              height: 30,
                              borderRadius: 2,
                              bgcolor: index === 0 ? "#fef3c7" : "#f1f5f9",
                              color: index === 0 ? "#b45309" : "#64748b",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {index + 1}
                          </Box>

                          <Box>
                            <Typography
                              sx={{
                                fontSize: 12.5,
                                fontWeight: 750,
                                color: "#334155",
                              }}
                            >
                              {service.service_name}
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 10.5,
                                color: "#94a3b8",
                              }}
                            >
                              {service.category?.name || "Uncategorized"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 750,
                          }}
                        >
                          {service.total_bookings}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            color: "#15803d",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(service.final_revenue)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}

                  {topServices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "#94a3b8",
                          }}
                        >
                          No service data found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* TOP PROVIDERS */}
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 3.5,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #e2e8f0",
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
                    Top Providers
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,
                      fontSize: 11.5,
                      color: "#64748b",
                    }}
                  >
                    Highest-performing providers.
                  </Typography>
                </Box>

                <ChevronRight
                  sx={{
                    color: "#94a3b8",
                  }}
                />
              </Box>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Provider</TableCell>
                    <TableCell align="right">Completed</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {topProviders.map((provider, index) => (
                    <TableRow key={provider.provider_id} hover>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.2,
                          }}
                        >
                          <Box
                            sx={{
                              width: 30,
                              height: 30,
                              borderRadius: 2,
                              bgcolor: index === 0 ? "#dcfce7" : "#f1f5f9",
                              color: index === 0 ? "#15803d" : "#64748b",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {index + 1}
                          </Box>

                          <Box>
                            <Typography
                              sx={{
                                fontSize: 12.5,
                                fontWeight: 750,
                                color: "#334155",
                              }}
                            >
                              {provider.full_name}
                            </Typography>

                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mt: 0.2,
                              }}
                            >
                              <Rating
                                value={Number(provider.average_rating)}
                                precision={0.1}
                                readOnly
                                size="small"
                                sx={{
                                  fontSize: 14,
                                }}
                              />

                              <Typography
                                sx={{
                                  fontSize: 10,
                                  color: "#94a3b8",
                                }}
                              >
                                {Number(provider.average_rating).toFixed(1)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 750,
                          }}
                        >
                          {provider.completed_bookings}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            color: "#15803d",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(provider.total_revenue)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}

                  {topProviders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "#94a3b8",
                          }}
                        >
                          No provider data found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* DAILY TRENDS */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              overflowX: "auto",
              mb: 3,

              "& .MuiTableCell-head": {
                bgcolor: "#f8fafc",
                color: "#475569",
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.045em",
                whiteSpace: "nowrap",
              },
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Daily Booking & Revenue Trends
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 11.5,
                  color: "#64748b",
                }}
              >
                Daily booking volume, completion, cancellations and paid
                revenue.
              </Typography>
            </Box>

            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Total Bookings</TableCell>
                  <TableCell>Completed</TableCell>
                  <TableCell>Cancelled</TableCell>
                  <TableCell>Activity</TableCell>
                  <TableCell align="right">Paid Revenue</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {dailyTrends.map((trend) => {
                  const activityPercentage =
                    (trend.total_bookings / maxDailyBookings) * 100;

                  return (
                    <TableRow key={trend.date} hover>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#334155",
                          }}
                        >
                          {trend.date}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 800,
                          }}
                        >
                          {trend.total_bookings}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={trend.completed_bookings}
                          size="small"
                          sx={{
                            minWidth: 34,
                            height: 24,
                            bgcolor: "#f0fdf4",
                            color: "#15803d",
                            fontWeight: 750,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={trend.cancelled_bookings}
                          size="small"
                          sx={{
                            minWidth: 34,
                            height: 24,
                            bgcolor: "#fef2f2",
                            color: "#b91c1c",
                            fontWeight: 750,
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ minWidth: 160 }}>
                        <LinearProgress
                          variant="determinate"
                          value={activityPercentage}
                          sx={{
                            height: 6,
                            borderRadius: 999,
                            bgcolor: "#e2e8f0",

                            "& .MuiLinearProgress-bar": {
                              borderRadius: 999,
                              bgcolor: "#2563eb",
                            },
                          }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            color: "#15803d",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(trend.paid_revenue)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {dailyTrends.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 7 }}>
                      <Insights
                        sx={{
                          fontSize: 40,
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
                        No trend data found
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 12,
                          color: "#94a3b8",
                        }}
                      >
                        Try another report period.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </AdminLayout>
  );
}

export default ReportsPage;
