import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
});

function clearAdminSession() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  },
);

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
