import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";

import { clearAdminSession, hasValidAdminSession } from "./api/session";

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

/*
 * This only checks the cached, non-sensitive admin snapshot (see
 * api/session.ts) — it's a UX shortcut so the app doesn't flash the
 * wrong screen, not the real authorization check. The actual token is
 * an httpOnly cookie the server validates on every API call; if it's
 * missing or expired, the axios interceptor in api/api.ts will bounce
 * the user back to /login on the first 401.
 */
function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!hasValidAdminSession()) {
    clearAdminSession();

    return <Navigate to="/login" replace />;
  }

  return children;
}

function LoginRoute() {
  if (hasValidAdminSession()) {
    return <Navigate to="/dashboard" replace />;
  }

  clearAdminSession();

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
