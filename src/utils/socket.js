import { io } from "socket.io-client";

let socket = null;
let listeners = {};

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

const notifyListeners = (event, data) => {
  if (listeners[event]) {
    listeners[event].forEach((fn) => fn(data));
  }
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
    console.log("\u{1F50C} WebSocket connected");
  });

  socket.on("disconnect", (reason) => {
    console.log("\u{1F50C} WebSocket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.log("\u{1F50C} WebSocket connection error:", error.message);
  });

  // Real-time events from backend
  socket.on("allocation:changed", (data) => {
    notifyListeners("allocation:changed", data);
  });

  socket.on("target:updated", (data) => {
    notifyListeners("target:updated", data);
  });

  socket.on("po:updated", (data) => {
    notifyListeners("po:updated", data);
  });

  return socket;
};

export const onSocketEvent = (event, callback) => {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  return () => {
    listeners[event] = listeners[event].filter((fn) => fn !== callback);
  };
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  listeners = {};
};

export const sendPing = () => {
  if (socket?.connected) {
    socket.emit("ping", (response) => {
      console.log("\u{1F3D3} Pong received:", response);
    });
  }
};
