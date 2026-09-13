import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import {
  ArrowForward,
  AssignmentTurnedIn,
  Cancel,
  Engineering,
  HourglassTop,
  MiscellaneousServices,
  Paid,
  People,
  Person,
  ReceiptLong,
  TaskAlt,
  TrendingUp,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import AdminLayout from "../layouts/AdminLayout";
import { clearAdminSession } from "../api/session";

interface DashboardSummary {
  users: {
    total_customers: number;
    total_providers: number;
    active_providers: number;
  };

  services: {
    total: number;
    active: number;
  };

  bookings: {
    total: number;
    pending: number;
    assigned: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };

  payments: {
    total_records: number;
    total_paid_amount: string;
    currency: string;
  };
}

interface DashboardResponse {
  message: string;
  summary: DashboardSummary;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone: "green" | "blue" | "violet" | "amber";
}

const metricTone = {
  green: {
    iconBg: "#dcfce7",
    iconColor: "#15803d",
    accent: "#16a34a",
  },
  blue: {
    iconBg: "#dbeafe",
    iconColor: "#1d4ed8",
    accent: "#2563eb",
  },
  violet: {
    iconBg: "#ede9fe",
    iconColor: "#6d28d9",
    accent: "#7c3aed",
  },
  amber: {
    iconBg: "#fef3c7",
    iconColor: "#b45309",
    accent: "#d97706",
  },
};

function MetricCard({ title, value, subtitle, icon, tone }: MetricCardProps) {
  const colors = metricTone[tone];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3.5,
        border: "1px solid #e2e8f0",
        bgcolor: "#ffffff",
        minHeight: 160,
        position: "relative",
        overflow: "hidden",
        transition: "transform 180ms ease, box-shadow 180ms ease",

        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: colors.accent,
        }}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 12,
              color: "#64748b",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {title}
          </Typography>

          <Typography
            sx={{
              mt: 1.3,
              fontSize: 32,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#0f172a",
            }}
          >
            {value}
          </Typography>

          <Typography
            sx={{
              mt: 1.2,
              fontSize: 12.5,
              color: "#64748b",
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2.5,
            display: "grid",
            placeItems: "center",
            bgcolor: colors.iconBg,
            color: colors.iconColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}

interface StatusRowProps {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}

function StatusRow({ label, value, total, color, icon }: StatusRowProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <Box
      sx={{
        py: 1.6,
        borderBottom: "1px solid #f1f5f9",

        "&:last-of-type": {
          borderBottom: 0,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: `${color}14`,
              color,
            }}
          >
            {icon}
          </Box>

          <Typography
            sx={{
              fontSize: 13.5,
              fontWeight: 650,
              color: "#334155",
            }}
          >
            {label}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          {value}
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          mt: 1.2,
          height: 5,
          borderRadius: 999,
          bgcolor: "#f1f5f9",

          "& .MuiLinearProgress-bar": {
            borderRadius: 999,
            bgcolor: color,
          },
        }}
      />
    </Box>
  );
}

function DashboardPage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      try {
        const response = await api.get<DashboardResponse>(
          "/api/admin/dashboard/summary",
        );

        setSummary(response.data.summary);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error
        ) {
          const apiError = error as {
            response?: {
              status?: number;
              data?: {
                message?: string;
              };
            };
          };

          if (
            apiError.response?.status === 401 ||
            apiError.response?.status === 403
          ) {
            clearAdminSession();
            navigate("/login");
            return;
          }

          setErrorMessage(
            apiError.response?.data?.message ||
              "Could not load dashboard information.",
          );
        } else {
          setErrorMessage("Could not load dashboard information.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboardSummary();
  }, [navigate]);

  const completionRate = useMemo(() => {
    if (!summary || summary.bookings.total === 0) {
      return 0;
    }

    return Math.round(
      (summary.bookings.completed / summary.bookings.total) * 100,
    );
  }, [summary]);

  const providerActivationRate = useMemo(() => {
    if (!summary || summary.users.total_providers === 0) {
      return 0;
    }

    return Math.round(
      (summary.users.active_providers / summary.users.total_providers) * 100,
    );
  }, [summary]);

  const activeServiceRate = useMemo(() => {
    if (!summary || summary.services.total === 0) {
      return 0;
    }

    return Math.round((summary.services.active / summary.services.total) * 100);
  }, [summary]);

  return (
    <AdminLayout title="Dashboard">
      {isLoading && (
        <Box
          sx={{
            minHeight: 480,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <CircularProgress size={36} />

          <Typography variant="body2" color="text.secondary">
            Loading operations overview...
          </Typography>
        </Box>
      )}

      {!isLoading && errorMessage && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 3,
          }}
        >
          {errorMessage}
        </Alert>
      )}

      {!isLoading && summary && (
        <>
          <Box
            sx={{
              mb: 3.5,
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
                Operations overview
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 14,
                  color: "#64748b",
                }}
              >
                Monitor platform activity, bookings and service performance.
              </Typography>
            </Box>

            <Chip
              icon={<TrendingUp />}
              label={`${completionRate}% completion rate`}
              sx={{
                bgcolor: "#dcfce7",
                color: "#166534",
                fontWeight: 700,

                "& .MuiChip-icon": {
                  color: "#16a34a",
                },
              }}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2,
              mb: 3,
            }}
          >
            <MetricCard
              title="Customers"
              value={summary.users.total_customers}
              subtitle="Registered platform customers"
              icon={<Person />}
              tone="blue"
            />

            <MetricCard
              title="Providers"
              value={summary.users.total_providers}
              subtitle={`${summary.users.active_providers} currently active`}
              icon={<People />}
              tone="green"
            />

            <MetricCard
              title="Bookings"
              value={summary.bookings.total}
              subtitle={`${summary.bookings.in_progress} currently in progress`}
              icon={<ReceiptLong />}
              tone="violet"
            />

            <MetricCard
              title="Total Paid"
              value={`${summary.payments.currency} ${summary.payments.total_paid_amount}`}
              subtitle={`${summary.payments.total_records} payment records`}
              icon={<Paid />}
              tone="amber"
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(0, 1.5fr) minmax(320px, 0.8fr)",
              },
              gap: 2.5,
              mb: 3,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: {
                  xs: 2,
                  sm: 2.5,
                },
                borderRadius: 3.5,
                border: "1px solid #e2e8f0",
                bgcolor: "#ffffff",
              }}
            >
              <Box
                sx={{
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    Booking activity
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.4,
                      fontSize: 12.5,
                      color: "#64748b",
                    }}
                  >
                    Current distribution across booking statuses
                  </Typography>
                </Box>

                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate("/bookings")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  View bookings
                </Button>
              </Box>

              <StatusRow
                label="Pending"
                value={summary.bookings.pending}
                total={summary.bookings.total}
                color="#d97706"
                icon={<HourglassTop fontSize="small" />}
              />

              <StatusRow
                label="Assigned"
                value={summary.bookings.assigned}
                total={summary.bookings.total}
                color="#2563eb"
                icon={<AssignmentTurnedIn fontSize="small" />}
              />

              <StatusRow
                label="In Progress"
                value={summary.bookings.in_progress}
                total={summary.bookings.total}
                color="#7c3aed"
                icon={<TaskAlt fontSize="small" />}
              />

              <StatusRow
                label="Completed"
                value={summary.bookings.completed}
                total={summary.bookings.total}
                color="#16a34a"
                icon={<TaskAlt fontSize="small" />}
              />

              <StatusRow
                label="Cancelled"
                value={summary.bookings.cancelled}
                total={summary.bookings.total}
                color="#dc2626"
                icon={<Cancel fontSize="small" />}
              />
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3.5,
                border: "1px solid #e2e8f0",
                bgcolor: "#ffffff",
              }}
            >
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Platform health
              </Typography>

              <Typography
                sx={{
                  mt: 0.4,
                  mb: 2.5,
                  fontSize: 12.5,
                  color: "#64748b",
                }}
              >
                Operational readiness indicators
              </Typography>

              <Box sx={{ mb: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.8,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 650,
                      color: "#475569",
                    }}
                  >
                    Provider activation
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {providerActivationRate}%
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={providerActivationRate}
                  sx={{
                    height: 7,
                    borderRadius: 999,
                    bgcolor: "#f1f5f9",

                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      bgcolor: "#16a34a",
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.8,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 650,
                      color: "#475569",
                    }}
                  >
                    Active services
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {activeServiceRate}%
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={activeServiceRate}
                  sx={{
                    height: 7,
                    borderRadius: 999,
                    bgcolor: "#f1f5f9",

                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      bgcolor: "#2563eb",
                    },
                  }}
                />
              </Box>

              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 0.8,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 650,
                      color: "#475569",
                    }}
                  >
                    Booking completion
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {completionRate}%
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={completionRate}
                  sx={{
                    height: 7,
                    borderRadius: 999,
                    bgcolor: "#f1f5f9",

                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      bgcolor: "#7c3aed",
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: "#f8fafc",
                  border: "1px solid #f1f5f9",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                  }}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "#dcfce7",
                      color: "#15803d",
                    }}
                  >
                    <MiscellaneousServices fontSize="small" />
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 750,
                        color: "#0f172a",
                      }}
                    >
                      {summary.services.active} active services
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.2,
                        fontSize: 11.5,
                        color: "#64748b",
                      }}
                    >
                      {summary.services.total} total configured services
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Quick actions
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                mb: 2,
                fontSize: 12.5,
                color: "#64748b",
              }}
            >
              Jump directly to frequently used admin tasks.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1.5,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<ReceiptLong />}
                onClick={() => navigate("/bookings")}
                sx={{
                  justifyContent: "flex-start",
                  p: 1.6,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#334155",
                  borderColor: "#e2e8f0",

                  "&:hover": {
                    borderColor: "#cbd5e1",
                    bgcolor: "#f8fafc",
                  },
                }}
              >
                Manage bookings
              </Button>

              <Button
                variant="outlined"
                startIcon={<Engineering />}
                onClick={() => navigate("/providers")}
                sx={{
                  justifyContent: "flex-start",
                  p: 1.6,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#334155",
                  borderColor: "#e2e8f0",

                  "&:hover": {
                    borderColor: "#cbd5e1",
                    bgcolor: "#f8fafc",
                  },
                }}
              >
                Review providers
              </Button>

              <Button
                variant="outlined"
                startIcon={<Paid />}
                onClick={() => navigate("/payments")}
                sx={{
                  justifyContent: "flex-start",
                  p: 1.6,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#334155",
                  borderColor: "#e2e8f0",

                  "&:hover": {
                    borderColor: "#cbd5e1",
                    bgcolor: "#f8fafc",
                  },
                }}
              >
                View payments
              </Button>

              <Button
                variant="outlined"
                startIcon={<MiscellaneousServices />}
                onClick={() => navigate("/services")}
                sx={{
                  justifyContent: "flex-start",
                  p: 1.6,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#334155",
                  borderColor: "#e2e8f0",

                  "&:hover": {
                    borderColor: "#cbd5e1",
                    bgcolor: "#f8fafc",
                  },
                }}
              >
                Manage services
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </AdminLayout>
  );
}

export default DashboardPage;
