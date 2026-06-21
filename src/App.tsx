import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ServicesPage from "./pages/ServicesPage";
import AddServicePage from "./pages/AddServicePage";
import EditServicePage from "./pages/EditServicePage";

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const hasAdminToken = Boolean(localStorage.getItem("adminToken"));

  if (!hasAdminToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function LoginRoute() {
  const hasAdminToken = Boolean(localStorage.getItem("adminToken"));

  if (hasAdminToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
}

function App() {
  return (
    <Routes>
      <Route
        path="/services/:id/edit"
        element={
          <ProtectedRoute>
            <EditServicePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/services/add"
        element={
          <ProtectedRoute>
            <AddServicePage />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginRoute />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/services"
        element={
          <ProtectedRoute>
            <ServicesPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
