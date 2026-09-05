import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import {
  AdminPanelSettings,
  ArrowForward,
  LockOutlined,
  PersonOutlined,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import axios from "axios";

import api from "../api/api";

interface AdminUser {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  role_id: number;
  role_name: string;
  is_active: boolean;
}

interface LoginResponse {
  message: string;
  token: string;
  user: AdminUser;
}

interface ApiErrorResponse {
  message?: string;
}

function LoginPage() {
  const navigate = useNavigate();

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedIdentifier = loginIdentifier.trim();

    if (!normalizedIdentifier) {
      setErrorMessage("Phone number or email is required.");

      return;
    }

    if (!password) {
      setErrorMessage("Password is required.");

      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      const loginPayload = normalizedIdentifier.includes("@")
        ? {
            email: normalizedIdentifier.toLowerCase(),

            password,
          }
        : {
            phone: normalizedIdentifier,
            password,
          };

      const response = await api.post<LoginResponse>(
        "/api/auth/admin/login",
        loginPayload,
      );

      if (response.data.user.role_name !== "admin") {
        localStorage.removeItem("adminToken");

        localStorage.removeItem("adminUser");

        setErrorMessage("Only administrators can access this panel.");

        return;
      }

      if (!response.data.user.is_active) {
        localStorage.removeItem("adminToken");

        localStorage.removeItem("adminUser");

        setErrorMessage("This administrator account is inactive.");

        return;
      }

      localStorage.setItem("adminToken", response.data.token);

      localStorage.setItem("adminUser", JSON.stringify(response.data.user));

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        setErrorMessage(
          error.response?.data?.message || "Login failed. Please try again.",
        );
      } else {
        setErrorMessage("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "1.05fr 0.95fr",
        },
        bgcolor: "#f8fafc",
      }}
    >
      {/* LEFT BRAND PANEL */}
      <Box
        sx={{
          display: {
            xs: "none",
            lg: "flex",
          },

          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 6,
          bgcolor: "#0f172a",
          color: "#ffffff",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            bgcolor: "rgba(34,197,94,0.10)",
            top: -120,
            right: -100,
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 280,
            height: 280,
            borderRadius: "50%",
            bgcolor: "rgba(59,130,246,0.08)",
            bottom: -80,
            left: -60,
          }}
        />

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: "#22c55e",
                color: "#052e16",
                display: "grid",
                placeItems: "center",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              DS
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                Dwaar Sewa
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                Administration Portal
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            maxWidth: 520,
          }}
        >
          <Typography
            sx={{
              fontSize: {
                lg: 42,
                xl: 48,
              },
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: "-0.045em",
            }}
          >
            Manage Dwaar Sewa with confidence.
          </Typography>

          <Typography
            sx={{
              mt: 2,
              maxWidth: 470,
              fontSize: 15,
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.64)",
            }}
          >
            Oversee bookings, providers, customers, payments, reviews, reports
            and platform operations from one secure admin workspace.
          </Typography>

          <Box
            sx={{
              mt: 4,
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            {["Bookings", "Providers", "Payments", "Analytics"].map((item) => (
              <Box
                key={item}
                sx={{
                  px: 1.5,
                  py: 0.8,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: "rgba(255,255,255,0.05)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {item}
              </Box>
            ))}
          </Box>
        </Box>

        <Typography
          sx={{
            position: "relative",
            zIndex: 1,
            fontSize: 11,
            color: "rgba(255,255,255,0.38)",
          }}
        >
          Secure access for authorized administrators only.
        </Typography>
      </Box>

      {/* LOGIN PANEL */}
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: {
            xs: 2,
            sm: 4,
            md: 6,
          },
          py: 5,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 460,
          }}
        >
          {/* MOBILE BRAND */}
          <Box
            sx={{
              display: {
                xs: "flex",
                lg: "none",
              },
              alignItems: "center",
              gap: 1.3,
              mb: 4,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: "#0f172a",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              DS
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Dwaar Sewa
              </Typography>

              <Typography
                sx={{
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                Admin Portal
              </Typography>
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: {
                xs: 3,
                sm: 4,
              },
              borderRadius: 4,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                mb: 2.5,
                borderRadius: 2.5,
                bgcolor: "#ecfdf5",
                color: "#15803d",
                display: "grid",
                placeItems: "center",
              }}
            >
              <AdminPanelSettings />
            </Box>

            <Typography
              component="h1"
              sx={{
                fontSize: 28,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.035em",
              }}
            >
              Welcome back
            </Typography>

            <Typography
              sx={{
                mt: 0.7,
                mb: 3,
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "#64748b",
              }}
            >
              Sign in with your administrator phone number or email.
            </Typography>

            {errorMessage && (
              <Alert
                severity="error"
                sx={{
                  mb: 2.5,
                  borderRadius: 2.5,
                }}
                onClose={() => setErrorMessage("")}
              >
                {errorMessage}
              </Alert>
            )}

            <Box component="form" onSubmit={handleLogin}>
              <Typography
                sx={{
                  mb: 0.7,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Phone number or email
              </Typography>

              <TextField
                value={loginIdentifier}
                onChange={(event) => setLoginIdentifier(event.target.value)}
                fullWidth
                required
                size="small"
                placeholder="Enter phone number or email"
                autoComplete="username"
                disabled={isLoading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlined
                          sx={{
                            fontSize: 20,
                            color: "#94a3b8",
                          }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    minHeight: 46,
                    borderRadius: 2.5,
                    bgcolor: "#ffffff",
                  },
                }}
              />

              <Typography
                sx={{
                  mt: 2,
                  mb: 0.7,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Password
              </Typography>

              <TextField
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                fullWidth
                required
                size="small"
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined
                          sx={{
                            fontSize: 20,
                            color: "#94a3b8",
                          }}
                        />
                      </InputAdornment>
                    ),

                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => setShowPassword((current) => !current)}
                          disabled={isLoading}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <VisibilityOff fontSize="small" />
                          ) : (
                            <Visibility fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    minHeight: 46,
                    borderRadius: 2.5,
                    bgcolor: "#ffffff",
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isLoading}
                endIcon={!isLoading ? <ArrowForward /> : undefined}
                sx={{
                  mt: 3,
                  minHeight: 48,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontSize: 14,
                  fontWeight: 800,
                  bgcolor: "#0f172a",
                  boxShadow: "none",

                  "&:hover": {
                    bgcolor: "#1e293b",
                    boxShadow: "none",
                  },

                  "&.Mui-disabled": {
                    bgcolor: "#cbd5e1",
                    color: "#ffffff",
                  },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Sign in to Admin Panel"
                )}
              </Button>
            </Box>
          </Paper>

          <Typography
            sx={{
              mt: 2.5,
              textAlign: "center",
              fontSize: 10.5,
              color: "#94a3b8",
            }}
          >
            Dwaar Sewa · Authorized administrator access
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default LoginPage;
