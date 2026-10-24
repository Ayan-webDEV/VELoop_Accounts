import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.API_URL || "http://localhost:5000/api",
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("velop_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && localStorage.getItem("velop_token")) {
      localStorage.removeItem("velop_token");
      localStorage.removeItem("velop_admin");
      window.dispatchEvent(new Event("velop:logout"));
    }
    return Promise.reject(e);
  },
);
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
export const dateLabel = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
export const errorMessage = (e) =>
  e.response?.data?.message || e.message || "Something went wrong";
export default api;
