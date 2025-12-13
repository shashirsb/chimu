// src/api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL, // Backend base URL
});

// Optional: log all requests for debugging
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;  
  console.log(`🚀 [API Request] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

export default api;
