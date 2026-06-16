"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Target,
  Save,
  X,
  Eye,
} from "lucide-react";

import api from "@/utils/api";
import { useSetTopbar } from "@/contexts/TopbarContext";
import { getStoredUser, ROLE_BANNER_CONFIG } from "@/utils/roleRedirect";
import { onSocketEvent } from "@/utils/socket";

const getRoleLabel = (subRole) => {
  const banner = ROLE_BANNER_CONFIG[subRole];
  if (!banner) return { dept: "Sales", exec: "Sales Executives", manager: "Sales Managers" };
  if (subRole === "purchase_admin") return { dept: "Purchase", exec: "Purchase Users", manager: "Purchase Managers" };
  if (subRole === "ppc_admin") return { dept: "PPC", exec: "PPC Users", manager: "PPC Managers" };
  return { dept: "Sales", exec: "Sales Executives", manager: "Sales Managers" };
};
import { logoutAndRedirect } from "@/utils/session";
import NotificationMenu from "@/components/NotificationMenu";
import UserMenu from "@/components/UserMenu";
import Modal from "@/components/ui/Modal";

const PERIOD_OPTIONS = ["Monthly", "Quarterly", "Yearly"];

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatMoneyShort(value) {
  const num = Number(value || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function generateMonthOptions(count = 18) {
  const result = [];
  const base = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
    result.push({ key, label });
  }
  return result;
}

function getPeriodKey(period, monthKey) {
  if (!monthKey) return "";
  if (period === "Quarterly") {
    const [year, month] = monthKey.split("-").map(Number);
    const quarter = Math.ceil(month / 3);
    return `${year}-Q${quarter}`;
  }
  if (period === "Yearly") return monthKey.split("-")[0];
  return monthKey;
}

function getUserName(user) {
  return (
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.email?.split("@")?.[0] ||
    "Admin User"
  );
}

function getInitials(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "AU";
  return parts
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();
}

const monthOptions = generateMonthOptions(18);
const defaultMonthKey = getCurrentMonthKey();

export default function UserAllocationPage() {
  const router = useRouter();

  const [managers, setManagers] = useState([]);
  const [unallocatedUsers, setUnallocatedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [expandedManager, setExpandedManager] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedPeriod, setSelectedPeriod] = useState("Monthly");
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthKey);

  const [currentUser, setCurrentUser] = useState(null);
  const [roleLabel, setRoleLabel] = useState({ dept: "Sales", exec: "Sales Executives", manager: "Sales Managers" });
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetManagerId, setTargetManagerId] = useState(null);
  const [targetForm, setTargetForm] = useState({
    selfTarget: "",
    teamTarget: "",
    remarks: "",
    targetPeriod: "Monthly",
    targetMonthKey: defaultMonthKey,
  });
  const [savingTarget, setSavingTarget] = useState(false);

  const [adminTarget, setAdminTarget] = useState(null);

  const [showPoModal, setShowPoModal] = useState(false);
  const [poList, setPoList] = useState([]);
  const [loadingPos, setLoadingPos] = useState(false);
  const [poModalManagerName, setPoModalManagerName] = useState("");

  const currentPeriodKey = useMemo(() => {
    return getPeriodKey(selectedPeriod, selectedMonth);
  }, [selectedPeriod, selectedMonth]);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAndRedirect(router);
  }, [loggingOut, router]);

  const currentUserName = getUserName(currentUser);
  const currentUserInitials = getInitials(currentUserName);
  const notificationCount = notifications.length;

  const topbarChildren = useMemo(
    () => (
      <div className="grid w-full grid-cols-1 gap-2 min-[520px]:grid-cols-[48px_minmax(172px,auto)] min-[900px]:w-auto min-[900px]:grid-cols-[48px_auto]">
        <NotificationMenu count={notificationCount} items={notifications} />
        <UserMenu
          userName={currentUserName}
          userInitials={currentUserInitials}
          onDashboard={() => router.push("/dashboard")}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </div>
    ),
    [notificationCount, notifications, currentUserName, currentUserInitials, router, handleLogout, loggingOut]
  );

  useSetTopbar({
    title: "Team Allocation",
    subtitle: `Allocate ${roleLabel.exec} to ${roleLabel.manager} and set targets`,
    children: topbarChildren,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [managersRes, usersRes] = await Promise.all([
        api.get("/user-allocations/managers/with-allocations", {
          params: { period: selectedPeriod, periodKey: currentPeriodKey },
        }),
        api.get("/user-allocations/unallocated"),
      ]);

      setManagers(managersRes?.data?.managers || []);
      setUnallocatedUsers(usersRes?.data?.users || []);

      const storedUser = getStoredUser();
      if (storedUser?.id) {
        try {
          const targetRes = await api.get(`/admin/admin-targets/${storedUser.id}`);
          const targets = targetRes?.data?.targets || [];
          const match = targets.find((t) => t.period === selectedPeriod && t.periodKey === currentPeriodKey);
          setAdminTarget(match || null);
        } catch {
          setAdminTarget(null);
        }
      }

      setErrorMessage("");
    } catch (error) {
      console.error("Fetch error:", error);
      setErrorMessage("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, currentPeriodKey]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    setCurrentUser(user);
    setRoleLabel(getRoleLabel(user.subRole));
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsub1 = onSocketEvent("allocation:changed", () => fetchData());
    const unsub2 = onSocketEvent("target:updated", () => fetchData());
    return () => { unsub1(); unsub2(); };
  }, [fetchData]);

  const sortedManagers = useMemo(() => {
    return [...managers].sort((a, b) => {
      if (a._id < b._id) return 1;
      if (a._id > b._id) return -1;
      return 0;
    });
  }, [managers]);

  const summary = useMemo(() => {
    let totalDistributed = 0;
    let totalAchieved = 0;
    let totalSelfTarget = 0;
    let totalTeamTarget = 0;
    let totalPersonalAchieved = 0;
    let totalTeamAchieved = 0;
    managers.forEach((mgr) => {
      if (mgr.target) {
        totalDistributed += Number(mgr.target.targetAmount || 0);
        totalSelfTarget += Number(mgr.target.selfTarget || 0);
        totalTeamTarget += Number(mgr.target.teamTarget || 0);
        totalAchieved += Number(mgr.target.achievedAmount || 0);
        totalPersonalAchieved += Number(mgr.target.personalAchieved || 0);
        totalTeamAchieved += Number(mgr.target.teamAchieved || 0);
      }
    });
    return {
      totalDistributed,
      totalAchieved,
      totalSelfTarget,
      totalTeamTarget,
      totalPersonalAchieved,
      totalTeamAchieved,
      achievementPercent: totalDistributed > 0 ? Math.min(Math.round((totalAchieved / totalDistributed) * 100), 100) : 0,
    };
  }, [managers]);

  const sortedUnallocatedUsers = useMemo(() => {
    return [...unallocatedUsers].sort((a, b) => {
      if (a._id < b._id) return 1;
      if (a._id > b._id) return -1;
      return 0;
    });
  }, [unallocatedUsers]);

  const filteredUnallocatedUsers = useMemo(() => {
    if (!search.trim()) return sortedUnallocatedUsers;
    const searchLower = search.toLowerCase();
    return sortedUnallocatedUsers.filter((user) =>
      [user.name, user.email, user.employeeId]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(searchLower))
    );
  }, [search, sortedUnallocatedUsers]);

  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedUsers.length === filteredUnallocatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUnallocatedUsers.map((u) => u._id));
    }
  };

  const handleAllocate = async () => {
    if (!selectedManager || selectedUsers.length === 0) {
      setErrorMessage("Please select a manager and at least one user");
      return;
    }

    try {
      setAllocating(true);
      const response = await api.post("/user-allocations/bulk-allocate", {
        salesManagerId: selectedManager,
        userIds: selectedUsers,
      });

      setSuccessMessage(
        `${response.data?.allocations?.length || 0} user(s) allocated successfully`
      );
      setSelectedUsers([]);
      setSelectedManager(null);
      setShowModal(false);
      await fetchData();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Allocation error:", error);
      setErrorMessage(error.response?.data?.message || "Failed to allocate users");
    } finally {
      setAllocating(false);
    }
  };

  const handleDeallocate = async (allocationId) => {
    if (!window.confirm("Are you sure you want to deallocate this user?")) {
      return;
    }

    try {
      await api.put(`/user-allocations/${allocationId}/deallocate`);
      setSuccessMessage("User deallocated successfully");
      await fetchData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Deallocation error:", error);
      setErrorMessage(error.response?.data?.message || "Failed to deallocate user");
    }
  };

  const openTargetModal = (managerId, existingTarget = null) => {
    setTargetManagerId(managerId);
    setTargetForm({
      selfTarget: existingTarget?.selfTarget?.toString() || "",
      teamTarget: existingTarget?.teamTarget?.toString() || existingTarget?.targetAmount?.toString() || "",
      remarks: existingTarget?.remarks || "",
      targetPeriod: existingTarget?.period || selectedPeriod,
      targetMonthKey: selectedMonth,
    });
    setShowTargetModal(true);
  };

  const closeTargetModal = () => {
    if (savingTarget) return;
    setShowTargetModal(false);
    setTargetManagerId(null);
    setTargetForm({ selfTarget: "", teamTarget: "", remarks: "" });
  };

  const handleTargetFormChange = (field) => (e) => {
    const value = e.target.value;
    setTargetForm((prev) => ({ ...prev, [field]: value }));
  };

  const targetPeriodKey = useMemo(() => {
    return getPeriodKey(targetForm.targetPeriod, targetForm.targetMonthKey);
  }, [targetForm.targetPeriod, targetForm.targetMonthKey]);

  const handleSaveTarget = async (e) => {
    e.preventDefault();

    const selfAmt = Number(targetForm.selfTarget) || 0;
    const teamAmt = Number(targetForm.teamTarget) || 0;
    const totalAmt = selfAmt + teamAmt;

    if (!targetManagerId || (!selfAmt && !teamAmt)) {
      setErrorMessage("Please enter at least one target");
      return;
    }

    try {
      setSavingTarget(true);
      const pKey = getPeriodKey(targetForm.targetPeriod, targetForm.targetMonthKey);
      await api.post("/manager-targets", {
        managerId: targetManagerId,
        period: targetForm.targetPeriod,
        periodKey: pKey,
        targetAmount: totalAmt,
        selfTarget: selfAmt,
        teamTarget: teamAmt,
        remarks: targetForm.remarks,
      });

      setSuccessMessage("Manager target set successfully");
      closeTargetModal();
      await fetchData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Save target error:", error);
      setErrorMessage(error.response?.data?.message || "Failed to save target");
    } finally {
      setSavingTarget(false);
    }
  };

  const handleViewPos = async (managerId, managerName) => {
    try {
      setLoadingPos(true);
      setPoModalManagerName(managerName);
      const res = await api.get(`/manager-targets/${managerId}/pos`, {
        params: { period: selectedPeriod, periodKey: currentPeriodKey },
      });
      setPoList(res?.data?.pos || []);
      setShowPoModal(true);
    } catch (error) {
      console.error("Fetch POs error:", error);
      setErrorMessage("Failed to load PO entries");
    } finally {
      setLoadingPos(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh overflow-x-hidden bg-[#fbfbfd] text-[#071033]">
        <section className="mx-auto w-full max-w-[1780px] space-y-4 px-3 py-4 sm:px-5 lg:px-7">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin w-8 h-8 text-[#ff4b0b]" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#fbfbfd] text-[#071033]">
      <section className="mx-auto w-full max-w-[1780px] space-y-4 px-3 py-4 sm:px-5 lg:px-7">
        {/* Success Message */}
        {successMessage && (
          <div className="rounded-[8px] border border-[#d1f0d1] bg-[#e7f8ef] p-4 flex items-center gap-2 text-[#05925f]">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-[12px] font-bold">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-[8px] border border-[#f5a8a8] bg-[#fde7e7] p-4 flex items-center gap-2 text-[#c83e3e]">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-[12px] font-bold">{errorMessage}</span>
          </div>
        )}

        {/* Period Filter */}
        <div className="rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)]">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold text-[#071033] shrink-0">
              Target Period:
            </span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-9 rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
            >
              {monthOptions.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
            <span className="text-[11px] font-bold text-[#ff4b0b] ml-2">
              Key: {currentPeriodKey}
            </span>
          </div>
        </div>

        {/* Summary Card */}
        <div className="rounded-[20px] border-2 border-[#ff5a1f] bg-gradient-to-r from-[#fff5ef] to-[#fff0e8] p-5 shadow-[0_10px_24px_rgba(255,90,31,0.10)]">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-[#ff5a1f]" />
            <span className="text-[13px] font-bold text-[#ff5a1f]">{roleLabel.dept} Target Flow</span>
            <span className="ml-auto rounded-full bg-[#fff0e8] px-2.5 py-0.5 text-[10px] font-bold text-[#ff5a1f]">
              {selectedPeriod} • {currentPeriodKey}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-[14px] bg-white/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a8390]">
                Target by Superadmin
              </p>
              <p className="mt-1 text-[24px] font-extrabold text-[#1f2340] leading-tight">
                {formatMoneyShort(adminTarget?.targetAmount || 0)}
              </p>
              {adminTarget?.remarks && (
                <p className="mt-1 text-[10px] font-medium text-[#7d7782] truncate">{adminTarget.remarks}</p>
              )}
              {!adminTarget && (
                <p className="mt-1 text-[10px] font-medium italic text-[#9aa1b5]">Not set yet</p>
              )}
            </div>

            <div className="rounded-[14px] bg-white/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a8390]">
                Distributed to Managers
              </p>
              <p className="mt-1 text-[24px] font-extrabold text-[#2563eb] leading-tight">
                {formatMoneyShort(summary.totalDistributed)}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#7d7782]">
                <span>Self: {formatMoneyShort(summary.totalSelfTarget)}</span>
                <span className="text-[#c5c0c8]">|</span>
                <span>Team: {formatMoneyShort(summary.totalTeamTarget)}</span>
              </div>
              <p className="mt-0.5 text-[10px] font-medium text-[#7d7782]">
                Across {managers.length} manager{managers.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="rounded-[14px] bg-white/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a8390]">
                Total Achieved
              </p>
              <p className="mt-1 text-[24px] font-extrabold text-[#2ea44f] leading-tight">
                {formatMoneyShort(summary.totalAchieved)}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[#7d7782]">
                <span>Personal: {formatMoneyShort(summary.totalPersonalAchieved)}</span>
                <span className="text-[#c5c0c8]">|</span>
                <span>Team: {formatMoneyShort(summary.totalTeamAchieved)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0e8e2]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2ea44f] to-[#3cc560] transition-all duration-700"
                    style={{ width: `${Math.max(summary.achievementPercent, 2)}%` }}
                  />
                </div>
                <span className="text-[12px] font-extrabold text-[#2ea44f]">{summary.achievementPercent}%</span>
              </div>
            </div>
          </div>

          {adminTarget?.targetAmount > 0 && (
            <div className="mt-3 flex items-center gap-3 text-[11px] font-medium text-[#7d7782]">
              <span>Remaining to distribute: {formatMoneyShort(Math.max((adminTarget.targetAmount || 0) - summary.totalDistributed, 0))}</span>
              <span className="text-[#c5c0c8]">|</span>
              <span>Pending achievement: {formatMoneyShort(Math.max(summary.totalDistributed - summary.totalAchieved, 0))}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Unallocated Users */}
          <div className="lg:col-span-1 rounded-[8px] border border-[#e8ebf2] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.03)] p-5">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#eef0f6]">
              <h2 className="text-[14px] font-bold text-[#071033] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7580a5]" />
                Unallocated Users
              </h2>
              <span className="rounded-full bg-[#e7f0ff] px-2.5 py-1 text-[11px] font-bold text-[#1d86f5]">
                {unallocatedUsers.length}
              </span>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-[8px] border border-[#e7e9f1] bg-white pl-3 pr-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
              />
            </div>

            {filteredUnallocatedUsers.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={handleSelectAllFiltered}
                  className="text-[11px] font-bold text-[#1d86f5] hover:text-[#ff4b0b]"
                >
                  {selectedUsers.length === filteredUnallocatedUsers.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUnallocatedUsers.length === 0 ? (
                <p className="text-[12px] font-bold text-[#7580a5] text-center py-8">
                  No unallocated users
                </p>
              ) : (
                filteredUnallocatedUsers.map((user) => (
                  <label
                    key={user._id}
                    className="flex items-center gap-3 p-3 rounded-[8px] border border-[#eef0f6] bg-white hover:bg-[#fbfbfd] cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                      className="w-4 h-4 accent-[#1d86f5] rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[12px] truncate text-[#071033]">{user.name}</p>
                      <p className="text-[10px] truncate text-[#7580a5]">{user.email}</p>
                      <p className="text-[10px] text-[#9aa1b5]">{user.employeeId}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {selectedUsers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full mt-5 h-10 rounded-[8px] bg-[#ff4b0b] text-white text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-[#e63a0a] transition"
              >
                <Plus className="w-4 h-4" />
                Allocate ({selectedUsers.length})
              </button>
            )}
          </div>

          {/* Right: Managers with Allocations */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-[14px] font-bold text-[#071033] px-2">{roleLabel.manager}</h2>

            {sortedManagers.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-[#7580a5] text-[13px]">
                No {roleLabel.manager.toLowerCase().replace(" ", " ")} found
              </div>
            ) : (
              sortedManagers.map((manager) => (
                <div
                  key={manager._id}
                  className="rounded-[8px] border border-[#e8ebf2] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.03)] overflow-hidden"
                >
                  {/* Manager Header */}
                  <button
                    onClick={() =>
                      setExpandedManager(
                        expandedManager === manager._id ? null : manager._id
                      )
                    }
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#fbfbfd] transition"
                  >
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-[13px] text-[#071033] truncate">{manager.name}</p>
                      <p className="text-[11px] text-[#7580a5] truncate">{manager.email}</p>
                      <p className="text-[10px] text-[#9aa1b5]">{manager.employeeId}</p>
                      {manager.target ? (
                        <div className="mt-1.5 flex items-center gap-3">
                          <span className="text-[11px] font-bold text-[#626a82]">
                            Self Target: {formatMoneyShort(manager.target.selfTarget)}
                          </span>
                          <span className="text-[11px] font-bold text-[#ff4b0b]">
                            Team Target: {formatMoneyShort(manager.target.teamTarget)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#9aa1b5] mt-1">No target set</p>
                      )}
                    </div>

                    {manager.target ? (
                      <div className="flex items-center gap-5 shrink-0">
                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-[#7580a5]">Self Ach.</p>
                          <p className="text-[17px] font-bold text-[#1f7a43] leading-tight">
                            {formatMoneyShort(manager.target.personalAchieved)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-[#7580a5]">Team Ach.</p>
                          <p className="text-[17px] font-bold text-[#1d86f5] leading-tight">
                            {formatMoneyShort(manager.target.teamAchieved)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-[#7580a5]">Total Ach.</p>
                          <p className="text-[17px] font-bold text-[#2ea44f] leading-tight">
                            {formatMoneyShort(manager.target.achievedAmount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-[#e7f0ff] px-2.5 py-1 text-[11px] font-bold text-[#1d86f5]">
                            {manager.allocatedCount}
                          </span>
                          {expandedManager === manager._id ? (
                            <ChevronUp className="w-5 h-5 text-[#7580a5]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#7580a5]" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="rounded-full bg-[#e7f0ff] px-2.5 py-1 text-[11px] font-bold text-[#1d86f5]">
                          {manager.allocatedCount}
                        </span>
                        {expandedManager === manager._id ? (
                          <ChevronUp className="w-5 h-5 text-[#7580a5]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#7580a5]" />
                        )}
                      </div>
                    )}
                  </button>

                  {/* Target Action Bar */}
                  <div className="border-t border-[#eef0f6] bg-[#faf9fd] px-5 py-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#626a82]">
                      {selectedPeriod} Target ({currentPeriodKey})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewPos(manager._id, manager.name)}
                        className="flex items-center gap-1 h-8 rounded-[8px] border border-[#dde1ef] bg-white text-[11px] font-bold px-3 text-[#47516b] hover:bg-[#f0f2f7] transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View POs
                      </button>
                      <button
                        type="button"
                        onClick={() => openTargetModal(manager._id, manager.target)}
                        className="flex items-center gap-1.5 h-8 rounded-[8px] bg-[#ff4b0b] text-white text-[11px] font-bold px-3 hover:bg-[#e63a0a] transition"
                      >
                        <Target className="w-3.5 h-3.5" />
                        {manager.target ? "Update Target" : "Set Target"}
                      </button>
                    </div>
                  </div>

                  {/* Manager Allocations */}
                  {expandedManager === manager._id && (
                    <div className="border-t border-[#eef0f6] bg-[#fbfbfd] p-4 space-y-2">
                      {manager.allocatedUsers.length === 0 ? (
                        <p className="text-[12px] font-bold text-[#7580a5] text-center py-4">
                          No users allocated to this manager
                        </p>
                      ) : (
                        manager.allocatedUsers.map((allocation) => (
                          <div
                            key={allocation._id}
                            className="flex items-center justify-between p-3 bg-white border border-[#eef0f6] rounded-[8px] hover:bg-[#fbfbfd] transition"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[12px] text-[#071033] truncate">
                                {allocation.salesUser.name}
                              </p>
                              <p className="text-[10px] text-[#7580a5] truncate">
                                {allocation.salesUser.email}
                              </p>
                              <p className="text-[10px] text-[#9aa1b5]">
                                {allocation.salesUser.employeeId}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-[#626a82]">Achieved</p>
                                <p className="text-[12px] font-bold text-[#2ea44f]">
                                  {formatMoneyShort(allocation.achievedAmount || 0)}
                                </p>
                                {(allocation.poCount > 0) && (
                                  <p className="text-[9px] text-[#9aa1b5]">
                                    {allocation.poCount} PO{allocation.poCount !== 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeallocate(allocation._id)}
                                className="p-2 text-[#ee3d83] hover:bg-[#fde7e7] rounded-lg transition shrink-0"
                                title="Deallocate user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Allocation Modal */}
        <Modal
          open={showModal}
          title="Select Manager"
          subtitle="Choose a manager to allocate the selected users"
          onClose={() => {
            setShowModal(false);
            setSelectedManager(null);
          }}
        >
          <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
            {sortedManagers.map((manager) => (
                <button
                  key={manager._id}
                  type="button"
                  onClick={() => setSelectedManager(manager._id)}
                className={`w-full text-left p-4 rounded-[8px] border-2 transition ${
                  selectedManager === manager._id
                    ? "border-[#ff4b0b] bg-[#fff8f2]"
                    : "border-[#eef0f6] hover:border-[#ff4b0b]"
                }`}
              >
                <p className="font-bold text-[12px] text-[#071033]">{manager.name}</p>
                <p className="text-[11px] text-[#7580a5]">{manager.email}</p>
                <p className="text-[10px] text-[#9aa1b5]">
                  {manager.allocatedCount} users already allocated
                </p>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setSelectedManager(null);
              }}
              className="flex-1 h-10 rounded-[8px] border border-[#e8ebf2] bg-white text-[11px] font-bold text-[#071033] hover:bg-[#fbfbfd] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAllocate}
              disabled={!selectedManager || allocating}
              className="flex-1 h-10 rounded-[8px] bg-[#ff4b0b] text-white text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-[#e63a0a] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {allocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Allocating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Allocate Users
                </>
              )}
            </button>
          </div>
        </Modal>

        {/* Target Modal */}
        {showTargetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
            <div className="relative max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-[16px] border border-[#e8ebf2] bg-white shadow-[0_16px_38px_rgba(0,0,0,0.18)]">
              <div className="sticky top-0 z-20 border-b border-[#eef0f6] bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-bold text-[#071033]">
                      Set Manager Target
                    </h3>
                    <p className="text-[11px] font-bold text-[#ff4b0b] mt-0.5">
                      {targetForm.targetPeriod} • {targetPeriodKey}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeTargetModal}
                    disabled={savingTarget}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eef0f6] hover:bg-[#fbfbfd] disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveTarget} className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#626a82]">
                      Period <span className="text-[#ff4b0b]">*</span>
                    </label>
                    <select
                      value={targetForm.targetPeriod}
                      onChange={handleTargetFormChange("targetPeriod")}
                      className="w-full h-11 rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
                    >
                      {PERIOD_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#626a82]">
                      Base Month <span className="text-[#ff4b0b]">*</span>
                    </label>
                    <select
                      value={targetForm.targetMonthKey}
                      onChange={handleTargetFormChange("targetMonthKey")}
                      className="w-full h-11 rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
                    >
                      {monthOptions.map((item) => (
                        <option key={item.key} value={item.key}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#626a82]">
                      Self Target <span className="text-[#ff4b0b]">*</span>
                    </label>
                    <input
                      type="number"
                      value={targetForm.selfTarget}
                      onChange={handleTargetFormChange("selfTarget")}
                      placeholder="Own sales target"
                      className="w-full h-11 rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
                    />
                    <p className="mt-0.5 text-[9px] text-[#9aa1b5]">Manager keeps for self</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#626a82]">
                      Team Target <span className="text-[#ff4b0b]">*</span>
                    </label>
                    <input
                      type="number"
                      value={targetForm.teamTarget}
                      onChange={handleTargetFormChange("teamTarget")}
                      placeholder="Distribute to team"
                      className="w-full h-11 rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
                    />
                    <p className="mt-0.5 text-[9px] text-[#9aa1b5]">Gets distributed to team</p>
                  </div>
                </div>
                {(() => {
                  const selfAmt = Number(targetForm.selfTarget) || 0;
                  const teamAmt = Number(targetForm.teamTarget) || 0;
                  const total = selfAmt + teamAmt;
                  if (total > 0) {
                    return (
                      <p className="text-[11px] font-bold text-[#1d86f5]">
                        Total: {formatMoney(total)}
                      </p>
                    );
                  }
                  return null;
                })()}

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#626a82]">
                    Remarks
                  </label>
                  <textarea
                    value={targetForm.remarks}
                    onChange={handleTargetFormChange("remarks")}
                    rows={3}
                    placeholder="Optional remarks"
                    className="w-full resize-none rounded-[8px] border border-[#e7e9f1] bg-white px-3 py-2.5 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeTargetModal}
                    disabled={savingTarget}
                    className="flex-1 h-11 rounded-[8px] border border-[#e8ebf2] bg-white text-[11px] font-bold text-[#071033] hover:bg-[#fbfbfd] disabled:opacity-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingTarget}
                    className="flex-1 h-11 rounded-[8px] bg-[#ff4b0b] text-white text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-[#e63a0a] disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {savingTarget ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Target
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PO List Modal */}
        {showPoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
            <div className="relative max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-[16px] border border-[#e8ebf2] bg-white shadow-[0_16px_38px_rgba(0,0,0,0.18)]">
              <div className="sticky top-0 z-20 border-b border-[#eef0f6] bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-bold text-[#071033]">
                      PO Entries — {poModalManagerName}
                    </h3>
                    <p className="text-[11px] font-bold text-[#ff4b0b] mt-0.5">
                      {selectedPeriod} • {currentPeriodKey}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#e7f0ff] px-2.5 py-1 text-[10px] font-bold text-[#1d86f5]">
                      {poList.length} PO{poList.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPoModal(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eef0f6] hover:bg-[#fbfbfd]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {loadingPos ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#ff4b0b]" />
                  </div>
                ) : poList.length === 0 ? (
                  <p className="text-center py-12 text-[12px] font-bold text-[#7580a5]">
                    No POs found for this period
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-[10px] border border-[#d1f0d1] bg-[#eefaf2] px-4 py-2 mb-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold text-[#1f7a43]">
                        Total PO Value
                      </span>
                      <span className="text-[14px] font-bold text-[#1f7a43]">
                        {formatMoneyShort(
                          poList.reduce((sum, po) => sum + (Number(po.poValue) || 0), 0)
                        )}
                      </span>
                    </div>
                    {poList.map((po) => (
                      <div
                        key={po._id}
                        className="rounded-[10px] border border-[#eef0f6] bg-white p-3 hover:bg-[#fbfbfd] transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-[12px] text-[#071033] truncate">
                                {po.companyName}
                              </p>
                              <span className="shrink-0 rounded-full bg-[#fff2ed] px-2 py-0.5 text-[9px] font-bold text-[#ff4b0b] uppercase">
                                {po.category || "-"}
                              </span>
                              {po.creatorType === "manager" ? (
                                <span className="shrink-0 rounded-full bg-[#e7f0ff] px-2 py-0.5 text-[9px] font-bold text-[#1d86f5]">
                                  Self
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full bg-[#f0faf4] px-2 py-0.5 text-[9px] font-bold text-[#1f7a43]">
                                  Team
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[10px] font-medium text-[#7580a5] truncate">
                              PO# {po.poNo || "-"} • {new Date(po.poDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • {po.trackingStatus || po.status || "-"}
                            </p>
                            {po.createdBy?.name && (
                              <p className="mt-0.5 text-[9px] font-medium text-[#9aa1b5]">
                                By: {po.createdBy.name} ({po.createdBy.role === "subadmin" ? "Manager" : roleLabel.exec.replace(/s$/, "")})
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-[14px] font-bold text-[#2ea44f]">
                            {formatMoneyShort(po.poValue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}