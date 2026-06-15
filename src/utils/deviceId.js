export const getOrCreateDeviceId = () => {
  if (typeof window === "undefined") return null;
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
};

export const clearAuthData = () => {
  const deviceId = localStorage.getItem("deviceId");
  localStorage.clear();
  if (deviceId) localStorage.setItem("deviceId", deviceId);
};
