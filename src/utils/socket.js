import { io } from "socket.io-client";

let socket = null;

const getSocketUrl = () => {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  }

  if (hostname.includes("vercel.app")) {
    return "https://backend-crm-3jds.onrender.com";
  }

  const domainMap = {
    "admin.serlextechnologies.com": "https://backend.serlextechnologies.com",
    "sales.serlextechnologies.com": "https://backend.serlextechnologies.com",
    "purchase.serlextechnologies.com": "https://backend.serlextechnologies.com",
    "ppc.serlextechnologies.com": "https://backend.serlextechnologies.com",
    "crm.techvrm.com": "https://backend.serlextechnologies.com",
  };

  return domainMap[hostname] || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
};

export const initSocket = (token) => {
  if (!token) return null;

  if (socket?.connected) {
    return socket;
  }

  const url = getSocketUrl();
  if (!url) return null;

  socket = io(url, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("🔌 WebSocket connected");
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 WebSocket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.log("🔌 WebSocket connection error:", error.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const sendPing = () => {
  if (socket?.connected) {
    socket.emit("ping", (response) => {
      console.log("🏓 Pong received:", response);
    });
  }
};