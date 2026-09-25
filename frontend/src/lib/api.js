import axios from "axios";

// VITE_API_URL wins; otherwise local dev talks to the local API and
// production builds talk to the deployed one.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5055/api" : "https://ai-hrms-e0v1.onrender.com/api");

const TOKEN_KEY = "hrms.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 on any call except login means the session is gone.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      tokenStore.clear();
      window.dispatchEvent(new Event("hrms:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  if (err?.code === "ECONNABORTED") return "The server took too long to respond. It may be waking up; try again in a moment.";
  if (err?.message === "Network Error") return "Can't reach the server. Check your connection or try again shortly.";
  return err?.response?.data?.message || fallback;
};

export default api;
