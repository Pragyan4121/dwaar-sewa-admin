import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router";
import api from "../api/api";

interface ServiceResponse {
  message: string;
  service: {
    id: number;
    name: string;
    description: string | null;
    base_price: string;
    duration_minutes: number;
    is_active: boolean;
  };
}

function EditServicePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchService = async () => {
      try {
        const response = await api.get<ServiceResponse>(
          `/api/services/admin/${id}`,
        );

        const service = response.data.service;

        setName(service.name);
        setDescription(service.description || "");
        setBasePrice(service.base_price);
        setDurationMinutes(String(service.duration_minutes));
        setIsActive(service.is_active);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error
        ) {
          const apiError = error as {
            response?: {
              data?: {
                message?: string;
              };
            };
          };

          setErrorMessage(
            apiError.response?.data?.message || "Could not load service.",
          );
        } else {
          setErrorMessage("Could not load service.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchService();
  }, [id]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setIsSaving(true);

    try {
      await api.patch(`/api/services/${id}`, {
        name,
        description,
        basePrice: Number(basePrice),
        durationMinutes: Number(durationMinutes),
        isActive,
      });

      navigate("/services");
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "response" in error) {
        const apiError = error as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

        setErrorMessage(
          apiError.response?.data?.message || "Could not update service.",
        );
      } else {
        setErrorMessage("Could not update service.");
      }
    } finally {
      setIsSaving(false);
    }
  };

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
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
            Edit Service
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Update service details, pricing and status
          </Typography>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Service Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              fullWidth
              required
              margin="normal"
            />

            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />

            <TextField
              label="Base Price (NPR)"
              type="number"
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
              fullWidth
              required
              margin="normal"
            />

            <TextField
              label="Duration (Minutes)"
              type="number"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              fullWidth
              required
              margin="normal"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
              }
              label={isActive ? "Service is Active" : "Service is Inactive"}
              sx={{ mt: 2 }}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 3,
              }}
            >
              <Button variant="outlined" onClick={() => navigate("/services")}>
                Cancel
              </Button>

              <Button type="submit" variant="contained" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default EditServicePage;
