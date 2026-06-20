import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import api from "../api/api";

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

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

function SummaryCard({ title, value, subtitle }: SummaryCardProps) {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 3,
        minHeight: 130,
      }}
    >
      <Typography color="text.secondary" variant="subtitle1">
        {title}
      </Typography>

      <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>
        {value}
      </Typography>

      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

function DashboardPage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/login");
  };

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
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
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

    fetchDashboardSummary();
  }, [navigate]);

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Paper
          elevation={1}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Dwaar Sewa Admin Dashboard
            </Typography>

            <Typography color="text.secondary">
              Business overview and current system status
            </Typography>
          </Box>

          <Button variant="contained" color="error" onClick={handleLogout}>
            Logout
          </Button>
        </Paper>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        )}

        {summary && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 3,
            }}
          >
            <SummaryCard
              title="Total Customers"
              value={summary.users.total_customers}
            />

            <SummaryCard
              title="Total Providers"
              value={summary.users.total_providers}
              subtitle={`${summary.users.active_providers} active`}
            />

            <SummaryCard
              title="Total Services"
              value={summary.services.total}
              subtitle={`${summary.services.active} active`}
            />

            <SummaryCard
              title="Total Bookings"
              value={summary.bookings.total}
            />

            <SummaryCard
              title="Pending Bookings"
              value={summary.bookings.pending}
            />

            <SummaryCard
              title="Assigned Bookings"
              value={summary.bookings.assigned}
            />

            <SummaryCard
              title="In Progress"
              value={summary.bookings.in_progress}
            />

            <SummaryCard
              title="Completed Bookings"
              value={summary.bookings.completed}
            />

            <SummaryCard
              title="Cancelled Bookings"
              value={summary.bookings.cancelled}
            />

            <SummaryCard
              title="Payment Records"
              value={summary.payments.total_records}
            />

            <SummaryCard
              title="Total Paid Amount"
              value={`${summary.payments.currency} ${summary.payments.total_paid_amount}`}
            />
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default DashboardPage;
