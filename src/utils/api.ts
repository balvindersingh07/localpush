import axios from "axios";

// 🟣 LIVE BACKEND URL (RENDER)
export const api = axios.create({
  baseURL: "https://localpush.onrender.com", 
  withCredentials: false,
});

// 🟢 Automatically add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
