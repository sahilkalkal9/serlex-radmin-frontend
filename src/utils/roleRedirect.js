const allowedSubRoles = ["sales_admin", "purchase_admin", "ppc_admin"];

export const isAdminUser = (user) => {
  return Boolean(user && allowedSubRoles.includes(user.subRole));
};

export const getRedirectPathByUser = (user) => {
  if (!user) return "/login";
  if (isAdminUser(user)) return "/dashboard";

  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
  return "/login";
};

export { clearAuthData } from "./deviceId";

export const getStoredUser = () => {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  if (!token || !savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
};

export const hasRequiredAccess = (user, allowedSubRolesList = allowedSubRoles) => {
  if (!user) return false;

  const roles = Array.isArray(allowedSubRolesList) ? allowedSubRolesList : [allowedSubRolesList];

  return roles.includes(user.subRole);
};

export const ROLE_BANNER_CONFIG = {
  sales_admin: { label: "Sales Admin", bg: "#ff4b0b", text: "#ffffff" },
  purchase_admin: { label: "Purchase Admin", bg: "#3b82f6", text: "#ffffff" },
  ppc_admin: { label: "PPC Admin", bg: "#10b981", text: "#ffffff" },
};

export const getRoleBanner = (user) => {
  if (!user || !user.subRole) return null;
  return ROLE_BANNER_CONFIG[user.subRole] || null;
};
