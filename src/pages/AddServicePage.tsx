import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import api from "../api/api";

function AddServicePage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");
    setIsSaving(true);

    try {
      await api.post("/api/services", {
        name,
        description,
        basePrice: Number(basePrice),
        durationMinutes: Number(durationMinutes),
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
          apiError.response?.data?.message || "Could not create service.",
        );
      } else {
        setErrorMessage("Could not create service.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
            Add New Service
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create a service for Dwaar Sewa customers
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
              required
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
                {isSaving ? "Saving..." : "Save Service"}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default AddServicePage;
