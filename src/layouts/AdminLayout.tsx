import { useEffect, useState, type ReactNode } from "react";
import {
  AppBar,
  Avatar,
  Box,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Assessment,
  Category,
  Dashboard,
  Logout,
  Menu,
  MiscellaneousServices,
  People,
  PersonSearch,
  ReceiptLong,
  Reviews,
  LocalOffer,
  Settings,
  ShoppingCart,
} from "@mui/icons-material";
import EngineeringIcon from "@mui/icons-material/Engineering";
import { useLocation, useNavigate } from "react-router";
import api from "../api/api";

const drawerWidth = 278;

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: ReactNode;
  group: "Overview" | "Operations" | "Management";
}

interface CurrentSessionResponse {
  user: {
    id: number;
    full_name: string;
    phone: string;
    email: string | null;
    role_id: number;
    role_name: string;
    is_active: boolean;
  };
}

interface StoredAdminUser {
  full_name?: string;
  email?: string | null;
}

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <Dashboard />,
    group: "Overview",
  },
  {
    label: "Bookings",
    path: "/bookings",
    icon: <ShoppingCart />,
    group: "Operations",
  },
  {
    label: "Providers",
    path: "/providers",
    icon: <People />,
    group: "Operations",
  },
  {
    label: "Customers",
    path: "/customers",
    icon: <PersonSearch />,
    group: "Operations",
  },
  {
    label: "Payments",
    path: "/payments",
    icon: <ReceiptLong />,
    group: "Operations",
  },
  {
    label: "Reviews",
    path: "/reviews",
    icon: <Reviews />,
    group: "Operations",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: <Assessment />,
    group: "Operations",
  },
  {
    label: "Experience Types",
    path: "/experience-types",
    icon: <EngineeringIcon />,
    group: "Management",
  },
  {
    label: "Categories",
    path: "/categories",
    icon: <Category />,
    group: "Management",
  },
  {
    label: "Services",
    path: "/services",
    icon: <MiscellaneousServices />,
    group: "Management",
  },
  {
    label: "Promotions",
    path: "/promotions",
    icon: <LocalOffer />,
    group: "Management",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: <Settings />,
    group: "Management",
  },
];

const navigationGroups: NavigationItem["group"][] = [
  "Overview",
  "Operations",
  "Management",
];

function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [adminUser, setAdminUser] = useState<StoredAdminUser>({});

  useEffect(() => {
    let isMounted = true;

    const verifyAdminSession = async () => {
      try {
        const response = await api.get<CurrentSessionResponse>("/api/auth/me");

        const sessionUser = response.data.user;

        if (
          sessionUser.role_name !== "admin" ||
          sessionUser.is_active !== true
        ) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");

          navigate("/login", {
            replace: true,
          });

          return;
        }

        localStorage.setItem("adminUser", JSON.stringify(sessionUser));

        if (isMounted) {
          setAdminUser({
            full_name: sessionUser.full_name,
            email: sessionUser.email,
          });
        }
      } catch {
        const storedUser = localStorage.getItem("adminUser");

        if (storedUser && isMounted) {
          try {
            const parsedUser = JSON.parse(storedUser) as StoredAdminUser;
            setAdminUser(parsedUser);
          } catch {
            setAdminUser({});
          }
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    void verifyAdminSession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const adminName = adminUser.full_name?.trim() || "Administrator";
  const adminEmail = adminUser.email?.trim() || "System Administrator";

  const nameParts = adminName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  let adminInitials = "A";

  if (nameParts.length === 1) {
    adminInitials = nameParts[0].charAt(0).toUpperCase();
  }

  if (nameParts.length >= 2) {
    adminInitials =
      `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
  }

  const handleDrawerToggle = () => {
    setMobileOpen((currentValue) => !currentValue);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    navigate("/login", {
      replace: true,
    });
  };

  if (isCheckingSession) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          bgcolor: "#f8fafc",
        }}
      >
        <CircularProgress size={34} />

        <Typography
          sx={{
            fontSize: 13,
            color: "#64748b",
          }}
        >
          Loading admin workspace...
        </Typography>
      </Box>
    );
  }

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#0f172a",
        color: "#ffffff",
      }}
    >
      {/* Branding */}
      <Box
        sx={{
          px: 2.5,
          pt: 2.5,
          pb: 2,
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
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              bgcolor: "#16a34a",
              boxShadow: "0 10px 24px rgba(22,163,74,0.35)",
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 17,
                letterSpacing: "-0.03em",
              }}
            >
              DS
            </Typography>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              Dwaar Sewa
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                fontSize: 10.5,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
              }}
            >
              Admin Console
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mx: 2,
          mb: 1.5,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      />

      {/* Navigation */}
      <Box
        sx={{
          px: 1.5,
          overflowY: "auto",
          flexGrow: 1,
          pb: 2,
          scrollbarWidth: "thin",

          "&::-webkit-scrollbar": {
            width: 6,
          },

          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(255,255,255,0.14)",
            borderRadius: 99,
          },
        }}
      >
        {navigationGroups.map((group) => {
          const groupItems = navigationItems.filter(
            (item) => item.group === group,
          );

          return (
            <Box key={group} sx={{ mb: 2 }}>
              <Typography
                sx={{
                  px: 1.5,
                  mb: 0.8,
                  fontSize: 10.5,
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 800,
                }}
              >
                {group}
              </Typography>

              <List disablePadding>
                {groupItems.map((item) => {
                  const isSelected =
                    location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`);

                  return (
                    <ListItemButton
                      key={item.path}
                      selected={isSelected}
                      onClick={() => handleNavigate(item.path)}
                      sx={{
                        mb: 0.5,
                        px: 1.4,
                        minHeight: 46,
                        borderRadius: 2.5,
                        color: isSelected
                          ? "#ffffff"
                          : "rgba(255,255,255,0.68)",
                        position: "relative",
                        overflow: "hidden",
                        transition: "all 180ms ease",

                        "&:hover": {
                          bgcolor: "rgba(255,255,255,0.07)",
                          color: "#ffffff",
                        },

                        "&.Mui-selected": {
                          bgcolor: "rgba(22,163,74,0.18)",
                          color: "#ffffff",
                        },

                        "&.Mui-selected:hover": {
                          bgcolor: "rgba(22,163,74,0.23)",
                        },

                        "&.Mui-selected::before": {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          top: 9,
                          bottom: 9,
                          width: 3,
                          borderRadius: "0 3px 3px 0",
                          bgcolor: "#22c55e",
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 39,
                          color: isSelected
                            ? "#4ade80"
                            : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              fontSize: 13.5,
                              fontWeight: isSelected ? 700 : 500,
                            }}
                          >
                            {item.label}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* User / Logout */}
      <Box
        sx={{
          px: 1.5,
          pb: 1.5,
        }}
      >
        <Divider
          sx={{
            borderColor: "rgba(255,255,255,0.08)",
            mb: 1.5,
          }}
        />

        <Box
          sx={{
            px: 1.2,
            py: 1.2,
            mb: 1,
            borderRadius: 2.5,
            bgcolor: "rgba(255,255,255,0.04)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
            }}
          >
            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: "#16a34a",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {adminInitials}
            </Avatar>

            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                noWrap
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                {adminName}
              </Typography>

              <Typography
                noWrap
                sx={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {adminEmail}
              </Typography>
            </Box>
          </Box>
        </Box>

        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2.5,
            minHeight: 44,
            color: "#fca5a5",

            "&:hover": {
              bgcolor: "rgba(239,68,68,0.08)",
              color: "#fecaca",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 39,
              color: "inherit",
            }}
          >
            <Logout />
          </ListItemIcon>

          <ListItemText
            primary={
              <Typography
                sx={{
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                Logout
              </Typography>
            }
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#f8fafc",
      }}
    >
      {/* Top Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: {
            md: `calc(100% - ${drawerWidth}px)`,
          },
          ml: {
            md: `${drawerWidth}px`,
          },
          bgcolor: "rgba(255,255,255,0.94)",
          color: "#0f172a",
          borderBottom: "1px solid #e2e8f0",
          backdropFilter: "blur(12px)",
        }}
      >
        <Toolbar
          sx={{
            minHeight: "76px !important",
            px: {
              xs: 2,
              sm: 3,
              lg: 4,
            },
            gap: 2,
          }}
        >
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              display: {
                md: "none",
              },
              border: "1px solid #e2e8f0",
              borderRadius: 2,
            }}
          >
            <Menu />
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              noWrap
              sx={{
                fontSize: {
                  xs: 18,
                  sm: 21,
                },
                fontWeight: 800,
                letterSpacing: "-0.025em",
                color: "#0f172a",
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 0.15,
                fontSize: 12,
                color: "#64748b",
                display: {
                  xs: "none",
                  sm: "block",
                },
              }}
            >
              Manage and monitor Dwaar Sewa operations
            </Typography>
          </Box>

          <Tooltip title="Administrator account">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                px: 1.2,
                py: 0.7,
                borderRadius: 2.5,
                border: "1px solid #e2e8f0",
                bgcolor: "#ffffff",
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "#dcfce7",
                  color: "#15803d",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {adminInitials}
              </Avatar>

              <Box
                sx={{
                  display: {
                    xs: "none",
                    sm: "block",
                  },
                  minWidth: 0,
                }}
              >
                <Typography
                  noWrap
                  sx={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                >
                  {adminName}
                </Typography>

                <Typography
                  noWrap
                  sx={{
                    fontSize: 10.5,
                    color: "#64748b",
                  }}
                >
                  Administrator
                </Typography>
              </Box>
            </Box>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: {
            md: drawerWidth,
          },
          flexShrink: {
            md: 0,
          },
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: {
              xs: "block",
              md: "none",
            },

            "& .MuiDrawer-paper": {
              width: drawerWidth,
              border: 0,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: {
              xs: "none",
              md: "block",
            },

            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              border: 0,
              boxShadow: "8px 0 30px rgba(15,23,42,0.08)",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            md: `calc(100% - ${drawerWidth}px)`,
          },
          minWidth: 0,
          bgcolor: "#f8fafc",
        }}
      >
        <Toolbar sx={{ minHeight: "76px !important" }} />

        <Box
          sx={{
            p: {
              xs: 2,
              sm: 3,
              lg: 4,
            },
            maxWidth: 1700,
            mx: "auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export default AdminLayout;
