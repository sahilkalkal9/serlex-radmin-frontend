import api from "@/utils/api";
import { getAutoLocation } from "@/utils/location";

export const clearAuthSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // deviceId intentionally preserved
};

export const logoutAndRedirect = async (router, redirectPath = "/login") => {
  let logoutLocation = {
    name: "",
    coordinates: {
      latitude: null,
      longitude: null,
    },
  };

  try {
    logoutLocation = await getAutoLocation();
  } catch {
    logoutLocation.name = "Location unavailable";
  }

  try {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      await api.post("/activity/logout", { logoutLocation });
    }
  } catch (error) {
    if (error?.response?.status !== 404) {
      console.error("Logout activity update failed:", error);
    }
  } finally {
    clearAuthSession();

    if (router?.replace) {
      router.replace(redirectPath);
    } else if (typeof window !== "undefined") {
      window.location.href = redirectPath;
    }
  }
};
