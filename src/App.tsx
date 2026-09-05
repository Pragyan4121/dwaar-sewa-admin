import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";

import AddServicePage from "./pages/AddServicePage";
import BookingsPage from "./pages/BookingsPage";
import CategoriesPage from "./pages/CategoriesPage";
import CustomersPage from "./pages/CustomersPage";
import DashboardPage from "./pages/DashboardPage";
import EditServicePage from "./pages/EditServicePage";
import ExperienceTypesPage from "./pages/ExperienceTypesPage";
import LoginPage from "./pages/LoginPage";
import PaymentsPage from "./pages/PaymentsPage";
import ProvidersPage from "./pages/ProvidersPage";
import ReportsPage from "./pages/ReportsPage";
import ReviewsPage from "./pages/ReviewsPage";
import ServicesPage from "./pages/ServicesPage";
import SettingsPage from "./pages/SettingsPage";
import PromotionsPage from "./pages/promotionsPage";

interface ProtectedRouteProps {
  children: ReactNode;
}

interface StoredAdminUser {
  role_name?: string;
  is_active?: boolean;
}

function clearInvalidAdminSession() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
}

function hasValidAdminSession(): boolean {
  const token = localStorage.getItem("adminToken");
  const storedUser = localStorage.getItem("adminUser");

  if (!token || !storedUser) {
    return false;
  }

  try {
    const adminUser = JSON.parse(storedUser) as StoredAdminUser;

    return adminUser.role_name === "admin" && adminUser.is_active === true;
  } catch {
    clearInvalidAdminSession();
    return false;
  }
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!hasValidAdminSession()) {
    clearInvalidAdminSession();

    return <Navigate to="/login" replace />;
  }

  return children;
}

function LoginRoute() {
  if (hasValidAdminSession()) {
    return <Navigate to="/dashboard" replace />;
  }

  clearInvalidAdminSession();

  return <LoginPage />;
}

function App() {
  return (
    <Routes>
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
        path="/experience-types"
        element={
          <ProtectedRoute>
            <ExperienceTypesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <CategoriesPage />
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

      <Route
        path="/services/add"
        element={
          <ProtectedRoute>
            <AddServicePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/:id/edit"
        element={
          <ProtectedRoute>
            <EditServicePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/promotions"
        element={
          <ProtectedRoute>
            <PromotionsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <BookingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/providers"
        element={
          <ProtectedRoute>
            <ProvidersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <CustomersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <PaymentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reviews"
        element={
          <ProtectedRoute>
            <ReviewsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={hasValidAdminSession() ? "/dashboard" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;
