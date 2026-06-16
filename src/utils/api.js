import axios from "axios";
import { initSocket, disconnectSocket } from "./socket";

const api = axios.create({

  // baseURL: "http://localhost:5000/api",
  baseURL: "https://backend.serlextechnologies.com/api",
  headers: {
    "Content-Type": "application/json",
  }, 
}); 

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        initSocket(token);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      disconnectSocket();
      // deviceId intentionally preserved
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
