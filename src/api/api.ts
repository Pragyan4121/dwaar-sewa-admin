import axios from "axios";

import { clearAdminSession } from "./session";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  // The admin JWT is delivered as an httpOnly cookie (see
  // /api/auth/admin/login on the backend). withCredentials makes the
  // browser send that cookie on every request instead of us attaching a
  // Bearer header read from localStorage.
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    const requestUrl = error.config?.url || "";

    const isAdminLoginRequest = requestUrl.includes("/api/auth/admin/login");

    /*
     * Do not redirect when the administrator simply enters
     * incorrect credentials on the login page.
     */
    if (!isAdminLoginRequest && (status === 401 || status === 403)) {
      clearAdminSession();

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
