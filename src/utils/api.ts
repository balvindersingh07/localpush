import axios from "axios";

// 🟣 LIVE BACKEND URL (HTTPS)
export const api = axios.create({
  baseURL: "https://localpush.onrender.com",  // backend HTTPS URL
  withCredentials: true,                      // allow cookies/JWT if needed
  headers: {
    "Content-Type": "application/json",
  },
});

// 🟢 Automatically attach JWT token in headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
