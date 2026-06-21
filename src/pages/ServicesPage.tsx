import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import api from "../api/api";

interface Service {
  id: number;
  name: string;
  description: string | null;
  base_price: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServicesResponse {
  message: string;
  services: Service[];
}

function ServicesPage() {
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await api.get<ServicesResponse>(
          "/api/services/admin/all",
        );

        setServices(response.data.services);
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
            apiError.response?.data?.message || "Could not load services.",
          );
        } else {
          setErrorMessage("Could not load services.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
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
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Services Management
            </Typography>

            <Typography color="text.secondary">
              View and manage Dwaar Sewa services
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>

            <Button
              variant="contained"
              onClick={() => navigate("/services/add")}
            >
              Add Service
            </Button>
          </Box>
        </Paper>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Service Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Base Price</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id} hover>
                  <TableCell>{service.id}</TableCell>

                  <TableCell>
                    <Typography sx={{ fontWeight: "bold" }}>
                      {service.name}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {service.description || "No description"}
                  </TableCell>

                  <TableCell>NPR {service.base_price}</TableCell>

                  <TableCell>{service.duration_minutes} minutes</TableCell>

                  <TableCell>
                    <Chip
                      label={service.is_active ? "Active" : "Inactive"}
                      color={service.is_active ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/services/${service.id}/edit`)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {services.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No services found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
}

export default ServicesPage;
