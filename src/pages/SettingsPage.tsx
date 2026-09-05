import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  Business,
  CreditCard,
  Engineering,
  Refresh,
  Save,
  Settings,
  Tune,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import api from "../api/api";
import AdminLayout from "../layouts/AdminLayout";

type SettingValueType = "string" | "number" | "boolean" | "json";

interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string | null;
  value_type: SettingValueType;
  description: string | null;
  is_public: boolean;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

interface SettingsResponse {
  message: string;
  settings: SystemSetting[];
}

type EditableSettings = Record<string, string | boolean>;

const BUSINESS_KEYS = [
  "business_name",
  "support_phone",
  "support_email",
  "default_service_area",
];

const BOOKING_KEYS = [
  "customer_cancellation_window_minutes",
  "cash_payment_enabled",
];

const FINANCE_KEYS = ["provider_commission_percent"];

const MAINTENANCE_KEYS = [
  "maintenance_mode",
  "maintenance_badge",
  "maintenance_title",
  "maintenance_message",
  "maintenance_return_title",
  "maintenance_return_message",
  "maintenance_support_title",
  "maintenance_thank_you_title",
  "maintenance_thank_you_message",
  "maintenance_side_note",
  "maintenance_service_message",
  "maintenance_footer_item_1",
  "maintenance_footer_item_2",
  "maintenance_footer_item_3",
  "maintenance_brand_tagline",
];

const ALL_GROUPED_KEYS = [
  ...BUSINESS_KEYS,
  ...BOOKING_KEYS,
  ...FINANCE_KEYS,
  ...MAINTENANCE_KEYS,
];

const MULTILINE_KEYS = [
  "maintenance_message",
  "maintenance_return_message",
  "maintenance_thank_you_message",
  "maintenance_side_note",
  "maintenance_service_message",
];

const SETTING_LABELS: Record<string, string> = {
  business_name: "Business Name",
  support_phone: "Support Phone",
  support_email: "Support Email",
  default_service_area: "Default Service Area",

  customer_cancellation_window_minutes: "Cancellation Window",
  cash_payment_enabled: "Cash Payment",

  provider_commission_percent: "Provider Commission",

  maintenance_mode: "Maintenance Mode",
  maintenance_badge: "Maintenance Badge",
  maintenance_title: "Main Title",
  maintenance_message: "Main Message",
  maintenance_return_title: "Return Section Title",
  maintenance_return_message: "Return Section Message",
  maintenance_support_title: "Support Section Title",
  maintenance_thank_you_title: "Thank You Title",
  maintenance_thank_you_message: "Thank You Message",
  maintenance_side_note: "Side Note",
  maintenance_service_message: "Service Availability Message",
  maintenance_footer_item_1: "Footer Item 1",
  maintenance_footer_item_2: "Footer Item 2",
  maintenance_footer_item_3: "Footer Item 3",
  maintenance_brand_tagline: "Brand Tagline",
};

const formatSettingLabel = (key: string) => {
  return (
    SETTING_LABELS[key] ||
    key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const parseSettingValue = (setting: SystemSetting): string | boolean => {
  if (setting.value_type === "boolean") {
    return setting.setting_value === "true";
  }

  return setting.setting_value ?? "";
};

function SettingsPage() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [formValues, setFormValues] = useState<EditableSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get<SettingsResponse>("/api/settings/admin");

      setSettings(response.data.settings);

      const values = response.data.settings.reduce<EditableSettings>(
        (result, setting) => {
          result[setting.setting_key] = parseSettingValue(setting);
          return result;
        },
        {},
      );

      setFormValues(values);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not load settings.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getApiErrorMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSettings();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchSettings]);

  const groupedSettings = {
    business: settings.filter((setting) =>
      BUSINESS_KEYS.includes(setting.setting_key),
    ),

    booking: settings.filter((setting) =>
      BOOKING_KEYS.includes(setting.setting_key),
    ),

    finance: settings.filter((setting) =>
      FINANCE_KEYS.includes(setting.setting_key),
    ),

    maintenance: settings.filter((setting) =>
      MAINTENANCE_KEYS.includes(setting.setting_key),
    ),

    other: settings.filter(
      (setting) => !ALL_GROUPED_KEYS.includes(setting.setting_key),
    ),
  };

  const maintenanceModeEnabled = formValues.maintenance_mode === true;

  const handleValueChange = (key: string, value: string | boolean) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  };

  const validateSettings = () => {
    if ("provider_commission_percent" in formValues) {
      const commissionValue = Number(formValues.provider_commission_percent);

      if (
        !Number.isFinite(commissionValue) ||
        commissionValue < 0 ||
        commissionValue > 100
      ) {
        setErrorMessage("Provider commission must be between 0 and 100.");
        return false;
      }
    }

    if ("customer_cancellation_window_minutes" in formValues) {
      const cancellationWindow = Number(
        formValues.customer_cancellation_window_minutes,
      );

      if (!Number.isInteger(cancellationWindow) || cancellationWindow < 0) {
        setErrorMessage(
          "Cancellation window must be a non-negative whole number.",
        );

        return false;
      }
    }

    if (
      typeof formValues.support_email === "string" &&
      formValues.support_email.trim() !== ""
    ) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(formValues.support_email.trim())) {
        setErrorMessage("Please enter a valid support email address.");
        return false;
      }
    }

    for (const setting of settings) {
      if (setting.value_type !== "number") {
        continue;
      }

      const value = Number(formValues[setting.setting_key]);

      if (!Number.isFinite(value)) {
        setErrorMessage(
          `${formatSettingLabel(setting.setting_key)} must be a valid number.`,
        );

        return false;
      }

      if (value < 0) {
        setErrorMessage(
          `${formatSettingLabel(setting.setting_key)} cannot be negative.`,
        );

        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateSettings()) {
      return;
    }

    setIsSaving(true);

    try {
      const requestSettings = settings.reduce<Record<string, unknown>>(
        (result, setting) => {
          const value = formValues[setting.setting_key];

          if (setting.value_type === "number") {
            result[setting.setting_key] = Number(value);
          } else if (setting.value_type === "boolean") {
            result[setting.setting_key] = Boolean(value);
          } else if (setting.value_type === "json") {
            result[setting.setting_key] =
              typeof value === "string" ? value : JSON.stringify(value);
          } else {
            result[setting.setting_key] = String(value ?? "");
          }

          return result;
        },
        {},
      );

      await api.patch("/api/settings/admin", {
        settings: requestSettings,
      });

      setSuccessMessage("Settings updated successfully.");

      await fetchSettings();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Could not update settings.");

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderSettingField = (setting: SystemSetting) => {
    const currentValue = formValues[setting.setting_key];

    if (setting.value_type === "boolean") {
      const isMaintenanceMode = setting.setting_key === "maintenance_mode";

      return (
        <Paper
          key={setting.id}
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2.5,
            border: isMaintenanceMode
              ? maintenanceModeEnabled
                ? "1px solid #fca5a5"
                : "1px solid #bbf7d0"
              : "1px solid #e2e8f0",
            bgcolor: isMaintenanceMode
              ? maintenanceModeEnabled
                ? "#fff7f7"
                : "#f7fff9"
              : "#f8fafc",
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(currentValue)}
                onChange={(event) =>
                  handleValueChange(setting.setting_key, event.target.checked)
                }
                color={isMaintenanceMode ? "warning" : "success"}
              />
            }
            label={
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#334155",
                    }}
                  >
                    {formatSettingLabel(setting.setting_key)}
                  </Typography>

                  {isMaintenanceMode && (
                    <Chip
                      label={
                        maintenanceModeEnabled
                          ? "Platform Offline"
                          : "Platform Online"
                      }
                      size="small"
                      color={maintenanceModeEnabled ? "warning" : "success"}
                      sx={{
                        height: 21,
                        fontSize: 9,
                        fontWeight: 800,
                      }}
                    />
                  )}

                  <Chip
                    label={setting.is_public ? "Public" : "Private"}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  />
                </Box>

                <Typography
                  sx={{
                    mt: 0.3,
                    fontSize: 10.5,
                    lineHeight: 1.5,
                    color: "#64748b",
                  }}
                >
                  {setting.description || "No description"}
                </Typography>
              </Box>
            }
            sx={{
              alignItems: "flex-start",
              m: 0,
              width: "100%",
            }}
          />
        </Paper>
      );
    }

    const isNumber = setting.value_type === "number";

    const isCommission = setting.setting_key === "provider_commission_percent";

    const isCancellationWindow =
      setting.setting_key === "customer_cancellation_window_minutes";

    const isMultiline = MULTILINE_KEYS.includes(setting.setting_key);

    const isMaintenanceSetting = setting.setting_key.startsWith("maintenance_");

    return (
      <Box
        key={setting.id}
        sx={{
          gridColumn: isMultiline ? { xs: "auto", md: "1 / -1" } : "auto",
        }}
      >
        <Box
          sx={{
            mb: 0.7,
            display: "flex",
            alignItems: "center",
            gap: 0.8,
            flexWrap: "wrap",
          }}
        >
          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "#475569",
            }}
          >
            {formatSettingLabel(setting.setting_key)}
          </Typography>

          <Chip
            label={setting.is_public ? "Public" : "Private"}
            size="small"
            sx={{
              height: 19,
              fontSize: 8.5,
              fontWeight: 700,
              bgcolor: setting.is_public ? "#eff6ff" : "#f1f5f9",
              color: setting.is_public ? "#1d4ed8" : "#64748b",
            }}
          />

          {isMaintenanceSetting && (
            <Chip
              label="Maintenance Page"
              size="small"
              sx={{
                height: 19,
                fontSize: 8.5,
                fontWeight: 700,
                bgcolor: "#fff7ed",
                color: "#c2410c",
              }}
            />
          )}
        </Box>

        <TextField
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) => {
            const value = event.target.value;

            if (isNumber && value !== "" && Number(value) < 0) {
              return;
            }

            if (isCommission && value !== "" && Number(value) > 100) {
              return;
            }

            if (isCancellationWindow && value.includes(".")) {
              return;
            }

            handleValueChange(setting.setting_key, value);
          }}
          type={
            isNumber
              ? "number"
              : setting.setting_key === "support_email"
                ? "email"
                : "text"
          }
          multiline={isMultiline}
          minRows={isMultiline ? 3 : undefined}
          maxRows={isMultiline ? 6 : undefined}
          fullWidth
          size="small"
          slotProps={{
            htmlInput: {
              min: isNumber ? 0 : undefined,
              max: isCommission ? 100 : undefined,
              step: isCommission ? 0.01 : isCancellationWindow ? 1 : undefined,
            },
          }}
          helperText={
            setting.description ||
            (setting.is_public ? "Public setting" : "Private setting")
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2.2,
            },
          }}
        />
      </Box>
    );
  };

  const renderSettingsSection = (
    title: string,
    description: string,
    sectionSettings: SystemSetting[],
    icon: ReactNode,
  ) => {
    if (sectionSettings.length === 0) {
      return null;
    }

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          bgcolor: "#ffffff",
        }}
      >
        <Box
          sx={{
            px: {
              xs: 2,
              sm: 2.5,
            },
            py: 2.2,
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              bgcolor: "#eff6ff",
              color: "#2563eb",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 0.2,
                fontSize: 11.5,
                color: "#64748b",
              }}
            >
              {description}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            p: {
              xs: 2,
              sm: 2.5,
            },
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2.2,
          }}
        >
          {sectionSettings.map(renderSettingField)}
        </Box>
      </Paper>
    );
  };

  const renderMaintenanceSection = () => {
    if (groupedSettings.maintenance.length === 0) {
      return null;
    }

    const maintenanceModeSetting = groupedSettings.maintenance.find(
      (setting) => setting.setting_key === "maintenance_mode",
    );

    const maintenanceContentSettings = MAINTENANCE_KEYS.filter(
      (key) => key !== "maintenance_mode",
    )
      .map((key) =>
        groupedSettings.maintenance.find(
          (setting) => setting.setting_key === key,
        ),
      )
      .filter((setting): setting is SystemSetting => Boolean(setting));

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3.5,
          border: maintenanceModeEnabled
            ? "1px solid #fdba74"
            : "1px solid #e2e8f0",
          overflow: "hidden",
          bgcolor: "#ffffff",
        }}
      >
        <Box
          sx={{
            px: {
              xs: 2,
              sm: 2.5,
            },
            py: 2.2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            borderBottom: "1px solid #e2e8f0",
            bgcolor: maintenanceModeEnabled ? "#fffaf5" : "#ffffff",
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
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: maintenanceModeEnabled ? "#fff7ed" : "#eff6ff",
                color: maintenanceModeEnabled ? "#ea580c" : "#2563eb",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Engineering />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Maintenance Mode & Page Editor
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 11.5,
                  color: "#64748b",
                }}
              >
                Control platform availability and edit every message shown on
                the maintenance screen.
              </Typography>
            </Box>
          </Box>

          <Chip
            label={
              maintenanceModeEnabled
                ? "Maintenance Active"
                : "Platform Available"
            }
            color={maintenanceModeEnabled ? "warning" : "success"}
            size="small"
            sx={{
              fontWeight: 800,
            }}
          />
        </Box>

        <Box
          sx={{
            p: {
              xs: 2,
              sm: 2.5,
            },
          }}
        >
          {maintenanceModeEnabled && (
            <Alert
              severity="warning"
              sx={{
                mb: 2.5,
                borderRadius: 2.5,
              }}
            >
              Maintenance mode is currently enabled. Customer and provider
              access may be restricted until you switch it off and save the
              settings.
            </Alert>
          )}

          {maintenanceModeSetting && (
            <Box sx={{ mb: 3 }}>
              {renderSettingField(maintenanceModeSetting)}
            </Box>
          )}

          <Box
            sx={{
              mb: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Maintenance Screen Content
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                fontSize: 11.5,
                color: "#64748b",
              }}
            >
              These values control the text customers and providers see while
              maintenance mode is active.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2.2,
            }}
          >
            {maintenanceContentSettings.map(renderSettingField)}
          </Box>
        </Box>
      </Paper>
    );
  };

  return (
    <AdminLayout title="Settings">
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          flexDirection: {
            xs: "column",
            sm: "row",
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
            System Settings
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Manage business, booking, finance, maintenance and platform
            configuration.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => void fetchSettings()}
            disabled={isLoading || isSaving}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              borderColor: "#e2e8f0",
              color: "#475569",
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={!isSaving ? <Save /> : undefined}
            onClick={() => void handleSave()}
            disabled={isLoading || isSaving}
            sx={{
              minWidth: 150,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            {isSaving ? (
              <>
                <CircularProgress size={17} color="inherit" sx={{ mr: 1 }} />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </Box>
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

      {isLoading ? (
        <Box
          sx={{
            minHeight: 400,
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
            Loading settings...
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2.5,
          }}
        >
          {renderSettingsSection(
            "Business Information",
            "Basic public information used across Dwaar Sewa.",
            groupedSettings.business,
            <Business />,
          )}

          {renderSettingsSection(
            "Booking & Payment",
            "Control cancellation rules and payment availability.",
            groupedSettings.booking,
            <CreditCard />,
          )}

          {renderSettingsSection(
            "Provider Finance",
            "Manage provider commission and financial rules.",
            groupedSettings.finance,
            <Tune />,
          )}

          {renderMaintenanceSection()}

          {renderSettingsSection(
            "Other Settings",
            "Additional platform configuration values.",
            groupedSettings.other,
            <Settings />,
          )}

          {settings.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                borderRadius: 3.5,
                textAlign: "center",
                border: "1px dashed #cbd5e1",
              }}
            >
              <Settings
                sx={{
                  fontSize: 42,
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
                No system settings found
              </Typography>
            </Paper>
          )}
        </Box>
      )}
    </AdminLayout>
  );
}

export default SettingsPage;
