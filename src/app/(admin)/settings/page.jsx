"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  Monitor,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import Typo from "@/components/ui/typo";
import Button from "@/components/ui/Button";
import { useSetTopbar } from "@/contexts/TopbarContext";
import { getStoredUser } from "@/utils/roleRedirect";
import api from "@/utils/api";

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Department Admin", value: "radmin" },
  { label: "Manager", value: "subadmin" },
  { label: "Sales User", value: "sales_user" },
  { label: "Purchase User", value: "purchase_user" },
  { label: "PPC User", value: "ppc_user" },
];

const SUB_ROLE_OPTIONS = [
  { label: "Sales Manager", value: "sales_manager" },
  { label: "Purchase Manager", value: "po_manager" },
  { label: "PPC Manager", value: "ppc_manager" },
  { label: "HR Manager", value: "hr_manager" },
  { label: "Accounts Manager", value: "accounts_manager" },
  { label: "Operations Manager", value: "operations_manager" },
];

const DEPARTMENT_OPTIONS = [
  "Sales",
  "Purchase",
  "PPC",
  "HR",
  "Accounts",
  "Operations",
  "Administration",
];

const emptyForm = {
  name: "",
  email: "",
  employeeId: "",
  mobileNumber: "",
  department: "Sales",
  designation: "",
  managerName: "",
  territory: "",
  joiningDate: "",
  username: "",
  dob: "",
  role: "sales_user",
  subRole: "",
  pin: "",
  status: "approved",
};

export default function AdminSettingsPage() {
  const [user, setUser] = useState(null);

  const [settings, setSettings] = useState({
    compactTables: true,
    reportNotifications: true,
    meetingReminders: true,
  });

  const [managerNodes, setManagerNodes] = useState([]);
  const [unallocatedUsers, setUnallocatedUsers] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [treeError, setTreeError] = useState("");

  const flatStats = useMemo(() => {
    let managers = managerNodes.length;
    let allocatedUsers = 0;
    let salesManagers = 0;
    let purchaseManagers = 0;
    let ppcManagers = 0;
    managerNodes.forEach((m) => {
      allocatedUsers += m.children?.length || 0;
      if (m.subRole === "sales_manager") salesManagers++;
      else if (m.subRole === "po_manager") purchaseManagers++;
      else if (m.subRole === "ppc_manager") ppcManagers++;
    });
    return {
      admins: 1,
      managers,
      salesManagers,
      purchaseManagers,
      ppcManagers,
      allocated: allocatedUsers,
      unallocated: unallocatedUsers.length,
      total: managers + allocatedUsers + unallocatedUsers.length,
    };
  }, [managerNodes, unallocatedUsers]);

  useEffect(() => {
    setUser(getStoredUser());
    const savedSettings = localStorage.getItem("adminPanelSettings");
    if (savedSettings) {
      try { setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) })); }
      catch { localStorage.removeItem("adminPanelSettings"); }
    }
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    try {
      setLoadingTree(true);
      setTreeError("");
      const { data } = await api.get("/admin/hierarchy");
      if (!data?.success) throw new Error(data?.message || "Failed to load hierarchy");
      setManagerNodes(data.managerNodes || []);
      setUnallocatedUsers(data.unallocatedUsers || []);
    } catch (error) {
      setTreeError(error?.response?.data?.message || error?.message || "Failed to load hierarchy");
      setManagerNodes([]);
      setUnallocatedUsers([]);
    } finally {
      setLoadingTree(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem("adminPanelSettings", JSON.stringify(settings));
    alert("Settings saved");
  };

  useSetTopbar({
    title: "Settings",
    subtitle: "Manage admin preferences and organization hierarchy.",
  });

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#fbfbfd] text-[#071033]">

      <section className="mx-auto w-full max-w-[1780px] space-y-4 px-3 py-4 sm:px-5 lg:px-7">
        <div className="rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)] min-[380px]:p-5 mb-4">
          <ProfileCard user={user} />
        </div>

        {/* <StatsCard stats={flatStats} /> */}

        <div className="rounded-[8px] border border-[#e8ebf2] bg-white p-3 shadow-[0_10px_22px_rgba(15,23,42,0.03)] min-[380px]:p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-[#eef0f6] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-[#10145a] min-[380px]:text-[16px]">
                Organization Hierarchy
              </h2>
              <p className="mt-1 text-[11px] font-semibold text-[#68729d] min-[380px]:text-[12px]">
                Managers and their allocated team members
              </p>
            </div>

            <button
              type="button"
              onClick={fetchHierarchy}
              disabled={loadingTree}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#e6e9f2] bg-white px-4 text-[12px] font-bold text-[#2b356f] transition hover:bg-[#fbfbfd] disabled:opacity-60"
            >
              {loadingTree ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>

          <div className="mt-4">
            {loadingTree ? (
              <LoadingState />
            ) : treeError ? (
              <ErrorState message={treeError} onRetry={fetchHierarchy} />
            ) : managerNodes.length === 0 && unallocatedUsers.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                {managerNodes.map((manager) => (
                  <ManagerNode key={manager.id} manager={manager} />
                ))}
                {unallocatedUsers.length > 0 && (
                  <div className="rounded-[12px] border border-dashed border-[#ffd7c7] bg-[#fffaf7] p-4">
                    <p className="mb-3 text-[13px] font-bold text-[#ff4b0b]">
                      Unallocated Members ({unallocatedUsers.length})
                    </p>
                    <div className="space-y-3">
                      {unallocatedUsers.map((u) => (
                        <div key={u.id} className="group relative min-w-0 rounded-[12px] border border-[#ffd7c7] bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition hover:border-[#ffb99f] min-[380px]:p-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffeee8] text-[#d1451e] min-[380px]:h-11 min-[380px]:w-11">
                              <UserRound className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="max-w-full truncate text-[13px] font-extrabold text-[#071033] min-[380px]:text-[14px]">
                                {u.name || "Unnamed"}
                              </h3>
                              <div className="mt-2 grid gap-1 text-[11px] font-semibold text-[#68729d] min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
                                <span className="flex min-w-0 items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
                                  <span className="min-w-0 truncate">{u.email || "-"}</span>
                                </span>
                                <span className="flex min-w-0 items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
                                  <span className="min-w-0 truncate">{u.mobileNumber || "-"}</span>
                                </span>
                                <span className="flex min-w-0 items-center gap-1.5">
                                  <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
                                  <span className="min-w-0 truncate">{u.designation || "-"}</span>
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-1 shrink-0">
                              <div className="rounded-[8px] bg-[#fbfbfd] px-3 py-1.5 text-center">
                                <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#9aa3bf]">Emp ID</p>
                                <p className="text-[10px] font-extrabold text-[#2b356f]">{u.employeeId || "-"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
      </main>
  );
}

function ManagerNode({ manager }) {
  const [open, setOpen] = useState(true);
  const children = manager.children || [];
  return (
    <div className="min-w-0">
      <div className="group relative min-w-0 rounded-[12px] border border-[#e8ebf2] bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:border-[#ffb99f] min-[380px]:p-4">
        <div className="flex min-w-0 flex-col gap-3 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              disabled={!children.length}
              className={[
                "mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[#445184]",
                children.length
                  ? "border-[#e6e9f2] bg-[#fbfbfd] hover:bg-[#fff4ef]"
                  : "cursor-default border-transparent bg-transparent opacity-40",
              ].join(" ")}
            >
              {children.length ? (
                open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-[#c4cad8]" />
              )}
            </button>

            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf3ff] text-[#1d86f5] min-[380px]:h-11 min-[380px]:w-11">
              <UserRound className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="max-w-full truncate text-[13px] font-extrabold text-[#071033] min-[380px]:text-[14px]">
                  {manager.name || "Unnamed"}
                </h3>
                <span className="rounded-full bg-[#eaf3ff] px-2 py-1 text-[10px] font-extrabold capitalize text-[#1168c7]">
                  {manager.subRole?.replace(/_/g, " ") || "Manager"}
                </span>
              </div>

              <div className="mt-2 grid gap-1 text-[11px] font-semibold text-[#68729d] min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
                  <span className="min-w-0 truncate">{manager.email || "-"}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
                  <span className="min-w-0 truncate">{manager.mobileNumber || "-"}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
                  <span className="min-w-0 truncate">{manager.designation || "-"}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 min-[560px]:shrink-0">
            <div className="min-w-0 rounded-[8px] bg-[#fbfbfd] px-3 py-2">
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#9aa3bf]">Emp ID</p>
              <p className="mt-0.5 truncate text-[11px] font-extrabold text-[#2b356f]">{manager.employeeId || "-"}</p>
            </div>
            <div className="min-w-0 rounded-[8px] bg-[#fbfbfd] px-3 py-2">
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#9aa3bf]">Team</p>
              <p className="mt-0.5 truncate text-[11px] font-extrabold text-[#2b356f]">{children.length}</p>
            </div>
          </div>
        </div>
      </div>

      {children.length > 0 && open && (
        <div className="ml-3 mt-3 min-w-0 space-y-3 border-l border-[#d9deea] pl-3 min-[380px]:ml-5 min-[380px]:pl-5">
          {children.map((user) => (
            <div key={user.id} className="group relative min-w-0 rounded-[12px] border border-[#e8ebf2] bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition hover:border-[#ffb99f] min-[380px]:p-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4cad8]" />
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eafaf1] text-[#19a765] min-[380px]:h-11 min-[380px]:w-11">
                  <UsersRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="max-w-full truncate text-[13px] font-extrabold text-[#071033] min-[380px]:text-[14px]">
                      {user.name || "Unnamed"}
                    </h3>
                    <span className="rounded-full bg-[#eafaf1] px-2 py-1 text-[10px] font-extrabold capitalize text-[#11824d]">
                      Sales Executive
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-[11px] font-semibold text-[#68729d] min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
                      <span className="min-w-0 truncate">{user.email || "-"}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
                      <span className="min-w-0 truncate">{user.mobileNumber || "-"}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
                      <span className="min-w-0 truncate">{user.designation || "-"}</span>
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1 shrink-0">
                  <div className="rounded-[8px] bg-[#fbfbfd] px-3 py-1.5 text-center">
                    <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#9aa3bf]">Emp ID</p>
                    <p className="text-[10px] font-extrabold text-[#2b356f]">{user.employeeId || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileCard({ user }) {
  return (
    <article className="min-w-0 rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)] min-[380px]:p-5">
      <div className="flex min-w-0 items-center gap-3 min-[380px]:gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffe5d8] text-[#ff4b0b] min-[380px]:h-16 min-[380px]:w-16">
          <UserRound className="h-6 w-6 min-[380px]:h-8 min-[380px]:w-8" />
        </span>

        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold text-[#071033] min-[380px]:text-[18px]">
            {user?.name || "Admin User"}
          </h2>
          <p className="mt-1 truncate text-[11px] font-bold text-[#68729d] min-[380px]:text-[12px]">
            {user?.email || "-"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-[10px] bg-[#fbfbfd] p-3 text-[11px] font-bold text-[#2b356f] min-[380px]:p-4 min-[380px]:text-[12px]">
        <Info label="Employee ID" value={user?.employeeId} />
        <Info label="Department" value={user?.department} />
        <Info label="Designation" value={user?.designation} />
        <Info label="Role" value={user?.role} />
      </div>
    </article>
  );
}

function StatsCard({ stats }) {
  return (
    <article className="rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)] min-[380px]:p-5">
      <h2 className="text-[15px] font-bold text-[#10145a] min-[380px]:text-[16px]">
        People Summary
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2 min-[380px]:gap-3">
        <MiniStat label="Admins" value={stats.admins} />
        <MiniStat label="Managers" value={stats.managers} />
      </div>

      <div className="mt-2 rounded-[10px] border border-[#eef0f6] bg-[#fbfbfd] p-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#68729d]">Managers Breakdown</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[16px] font-black text-[#1d86f5]">{stats.salesManagers}</p><p className="text-[9px] font-semibold text-[#9aa3bf]">Sales</p></div>
          <div><p className="text-[16px] font-black text-[#19b96d]">{stats.purchaseManagers}</p><p className="text-[9px] font-semibold text-[#9aa3bf]">Purchase</p></div>
          <div><p className="text-[16px] font-black text-[#8b2fd4]">{stats.ppcManagers}</p><p className="text-[9px] font-semibold text-[#9aa3bf]">PPC</p></div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 min-[380px]:gap-3">
        <MiniStat label="Allocated" value={stats.allocated} />
        <MiniStat label="Unallocated" value={stats.unallocated} />
        <MiniStat label="Total" value={stats.total} highlight />
      </div>
    </article>
  );
}

function PreferencesCard({ settings, setSettings, saveSettings }) {
  return (
    <article className="rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)] min-[380px]:p-5">
      <h2 className="text-[15px] font-bold text-[#10145a] min-[380px]:text-[16px]">
        Panel Preferences
      </h2>

      <div className="mt-4 space-y-3">
        <ToggleRow
          icon={Monitor}
          title="Compact tables"
          description="Use denser rows for reports and management tables."
          checked={settings.compactTables}
          onChange={(value) =>
            setSettings((prev) => ({ ...prev, compactTables: value }))
          }
        />

        <ToggleRow
          icon={Bell}
          title="Report notifications"
          description="Show recent report and activity indicators in the panel."
          checked={settings.reportNotifications}
          onChange={(value) =>
            setSettings((prev) => ({ ...prev, reportNotifications: value }))
          }
        />

        <ToggleRow
          icon={ShieldCheck}
          title="Meeting reminders"
          description="Keep planning and activity tracker reminders enabled."
          checked={settings.meetingReminders}
          onChange={(value) =>
            setSettings((prev) => ({ ...prev, meetingReminders: value }))
          }
        />
      </div>

      <button
        type="button"
        onClick={saveSettings}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#ff3b0d] px-5 text-[12px] font-bold text-white transition hover:bg-[#e9350c] min-[420px]:w-auto"
      >
        <Save className="h-4 w-4" />
        Save Settings
      </button>
    </article>
  );
}

function HierarchyNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(true);

  const children = node.children || [];
  const hasChildren = children.length > 0;
  const badge = getBadge(node);

  return (
    <div className="min-w-0">
      <div
        className={[
          "group relative min-w-0 rounded-[12px] border bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:border-[#ffb99f] hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)] min-[380px]:p-4",
          depth === 0 ? "border-[#ffd7c7]" : "border-[#e8ebf2]",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-col gap-3 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              disabled={!hasChildren}
              className={[
                "mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[#445184]",
                hasChildren
                  ? "border-[#e6e9f2] bg-[#fbfbfd] hover:bg-[#fff4ef]"
                  : "cursor-default border-transparent bg-transparent opacity-40",
              ].join(" ")}
              aria-label={open ? "Collapse" : "Expand"}
            >
              {hasChildren ? (
                open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-[#c4cad8]" />
              )}
            </button>

            <div
              className={[
                "grid h-10 w-10 shrink-0 place-items-center rounded-full min-[380px]:h-11 min-[380px]:w-11",
                badge.iconBg,
                badge.iconText,
              ].join(" ")}
            >
              {badge.icon}
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="max-w-full truncate text-[13px] font-extrabold text-[#071033] min-[380px]:text-[14px]">
                  {node.name || "Unnamed Person"}
                </h3>

                <span
                  className={[
                    "rounded-full px-2 py-1 text-[10px] font-extrabold capitalize",
                    badge.badgeBg,
                    badge.badgeText,
                  ].join(" ")}
                >
                  {formatRole(node)}
                </span>
              </div>

              <div className="mt-2 grid gap-1 text-[11px] font-semibold text-[#68729d] min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
                <TinyInfo icon={Mail} text={node.email} />
                <TinyInfo icon={Phone} text={node.mobileNumber} />
                <TinyInfo icon={BriefcaseBusiness} text={node.designation} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 min-[560px]:shrink-0">
            <SmallPill label="Emp ID" value={node.employeeId} />
            <SmallPill label="Dept" value={node.department} />
          </div>
        </div>
      </div>

      {hasChildren && open && (
        <div
          className={[
            "ml-3 mt-3 min-w-0 space-y-3 border-l border-[#d9deea] pl-3 min-[380px]:ml-5 min-[380px]:pl-5",
            depth >= 2 ? "ml-2 pl-2 min-[380px]:ml-4 min-[380px]:pl-4" : "",
          ].join(" ")}
        >
          {children.map((child) => (
            <HierarchyNode
              key={child._id || child.id}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddPersonModal({ onClose, onSubmit, saving }) {
  const [form, setForm] = useState(emptyForm);

  const updateField = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "email") {
        const generatedUsername = value
          .split("@")[0]
          ?.replace(/[^a-zA-Z0-9._-]/g, "");

        if (!prev.username || prev.username === prev.email.split("@")[0]) {
          next.username = generatedUsername;
        }
      }

      if (name === "role" && value !== "subadmin" && value !== "radmin") {
        next.subRole = "";
      }

      if (name === "role") {
        if (value === "sales_user") next.department = "Sales";
        if (value === "purchase_user") next.department = "Purchase";
        if (value === "ppc_user") next.department = "PPC";
        if (value === "admin") next.department = "Administration";
        if (value === "subadmin") next.department = "Administration";
        if (value === "radmin") next.department = "Administration";
      }

      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.role === "subadmin" && !form.subRole) {
      alert("Please select manager type");
      return;
    }

    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#071033]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[96dvh] w-full overflow-hidden rounded-t-[18px] bg-white shadow-2xl sm:max-w-[920px] sm:rounded-[18px]">
        <div className="flex items-start justify-between gap-3 border-b border-[#eef0f6] px-4 py-4 min-[380px]:px-5">
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold text-[#071033] min-[380px]:text-[20px]">
              Add Person
            </h2>
            <p className="mt-1 text-[11px] font-semibold text-[#68729d] min-[380px]:text-[12px]">
              Create admin, manager, or user from this modal.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fbfbfd] text-[#445184] hover:bg-[#fff0ea]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(96dvh-82px)] overflow-y-auto px-4 py-4 min-[380px]:px-5"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Full Name" required value={form.name} onChange={(value) => updateField("name", value)} placeholder="Enter name" />
            <Input label="Email" required type="email" value={form.email} onChange={(value) => updateField("email", value)} placeholder="name@company.com" />
            <Input label="Employee ID" required value={form.employeeId} onChange={(value) => updateField("employeeId", value)} placeholder="EMP001" />
            <Input label="Mobile Number" required value={form.mobileNumber} onChange={(value) => updateField("mobileNumber", value)} placeholder="9876543210" />

            <Select label="Role" required value={form.role} onChange={(value) => updateField("role", value)} options={ROLE_OPTIONS} />

            {form.role === "radmin" && (
              <Select
                label="Admin Type"
                required
                value={form.subRole}
                onChange={(value) => updateField("subRole", value)}
                options={[
                  { label: "Sales Admin", value: "sales_admin" },
                  { label: "Purchase Admin", value: "purchase_admin" },
                  { label: "PPC Admin", value: "ppc_admin" },
                ]}
                placeholder="Select admin type"
              />
            )}

            {form.role === "subadmin" && (
              <Select
                label="Manager Type"
                required
                value={form.subRole}
                onChange={(value) => updateField("subRole", value)}
                options={SUB_ROLE_OPTIONS}
                placeholder="Select manager type"
              />
            )}

            <Select
              label="Department"
              required
              value={form.department}
              onChange={(value) => updateField("department", value)}
              options={DEPARTMENT_OPTIONS.map((item) => ({
                label: item,
                value: item,
              }))}
            />

            <Input label="Designation" required value={form.designation} onChange={(value) => updateField("designation", value)} placeholder="Executive / Manager" />
            <Input label="Manager Name" value={form.managerName} onChange={(value) => updateField("managerName", value)} placeholder="Optional" />
            <Input label="Territory" value={form.territory} onChange={(value) => updateField("territory", value)} placeholder="Optional" />
            <Input label="Joining Date" required type="date" value={form.joiningDate} onChange={(value) => updateField("joiningDate", value)} />
            <Input label="DOB" required type="date" value={form.dob} onChange={(value) => updateField("dob", value)} />
            <Input label="Username" required value={form.username} onChange={(value) => updateField("username", value)} placeholder="username" />
            <Input label="PIN" required type="password" value={form.pin} onChange={(value) => updateField("pin", value)} placeholder="Minimum 4 digits" />

            <Select
              label="Status"
              required
              value={form.status}
              onChange={(value) => updateField("status", value)}
              options={[
                { label: "Approved", value: "approved" },
                { label: "Pending", value: "pending" },
                { label: "Inactive", value: "inactive" },
              ]}
            />
          </div>

          <div className="sticky bottom-0 mt-5 flex flex-col gap-2 border-t border-[#eef0f6] bg-white pt-4 min-[420px]:flex-row min-[420px]:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-[8px] border border-[#e1e5ef] px-5 text-[12px] font-bold text-[#445184] hover:bg-[#fbfbfd] disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#ff3b0d] px-5 text-[12px] font-bold text-white hover:bg-[#e9350c] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Adding..." : "Add Person"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="shrink-0 text-[#68729d]">{label}</span>
      <span className="min-w-0 truncate text-right capitalize text-[#071033]">
        {value || "-"}
      </span>
    </div>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div className={["rounded-[10px] border p-3", highlight ? "border-[#ffd7c7] bg-[#fff4ef]" : "border-[#eef0f6] bg-[#fbfbfd]"].join(" ")}>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#68729d]">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-black text-[#071033]">{value}</p>
    </div>
  );
}

function ToggleRow({ icon: Icon, title, description, checked, onChange }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[10px] border border-[#eef0f6] p-3 min-[380px]:gap-4 min-[380px]:p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf3ff] text-[#1d86f5] min-[380px]:h-11 min-[380px]:w-11">
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-[#071033] min-[380px]:text-[13px]">
          {title}
        </p>
        <p className="mt-1 text-[10px] font-semibold leading-5 text-[#68729d] min-[380px]:text-[11px]">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#19b96d]" : "bg-[#d5dae8]"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-[11px] font-extrabold text-[#2b356f]">
        {label}
        {required && <span className="text-[#ff3b0d]"> *</span>}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-[8px] border border-[#e1e5ef] bg-white px-3 text-[12px] font-semibold text-[#071033] outline-none transition placeholder:text-[#a6aec8] focus:border-[#ff8b65] focus:ring-2 focus:ring-[#fff0ea]"
      />
    </label>
  );
}

function Select({ label, value, onChange, options, placeholder, required = false }) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-[11px] font-extrabold text-[#2b356f]">
        {label}
        {required && <span className="text-[#ff3b0d]"> *</span>}
      </span>

      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-[8px] border border-[#e1e5ef] bg-white px-3 text-[12px] font-semibold text-[#071033] outline-none transition focus:border-[#ff8b65] focus:ring-2 focus:ring-[#fff0ea]"
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TinyInfo({ icon: Icon, text }) {
  if (!text) return null;

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#9aa3bf]" />
      <span className="min-w-0 truncate">{text}</span>
    </span>
  );
}

function SmallPill({ label, value }) {
  return (
    <div className="min-w-0 rounded-[8px] bg-[#fbfbfd] px-3 py-2">
      <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#9aa3bf]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-extrabold text-[#2b356f]">
        {value || "-"}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-[300px] place-items-center rounded-[12px] border border-dashed border-[#d9deea] bg-[#fbfbfd] p-6">
      <div className="text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#ff3b0d]" />
        <p className="mt-3 text-[12px] font-bold text-[#68729d]">
          Loading hierarchy...
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-[12px] border border-[#ffd7c7] bg-[#fff4ef] p-5 text-center">
      <p className="break-words text-[13px] font-bold text-[#b72b08]">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#ff3b0d] px-4 text-[12px] font-bold text-white"
      >
        <RefreshCcw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[300px] place-items-center rounded-[12px] border border-dashed border-[#d9deea] bg-[#fbfbfd] p-6">
      <div className="max-w-[320px] text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff0ea] text-[#ff3b0d]">
          <UsersRound className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-[15px] font-extrabold text-[#071033]">
          No hierarchy found
        </h3>

        <p className="mt-2 text-[12px] font-semibold leading-5 text-[#68729d]">
          Use Team Allocation to assign users to managers.
        </p>
      </div>
    </div>
  );
}

function getBadge(node) {
  if (["admin", "superadmin", "radmin"].includes(node.role)) {
    return {
      icon: <ShieldCheck className="h-5 w-5" />,
      iconBg: "bg-[#fff0ea]",
      iconText: "text-[#ff3b0d]",
      badgeBg: "bg-[#fff0ea]",
      badgeText: "text-[#d73309]",
    };
  }

  if (node.role === "subadmin") {
    return {
      icon: <UserRound className="h-5 w-5" />,
      iconBg: "bg-[#eaf3ff]",
      iconText: "text-[#1d86f5]",
      badgeBg: "bg-[#eaf3ff]",
      badgeText: "text-[#1168c7]",
    };
  }

  return {
    icon: <UsersRound className="h-5 w-5" />,
    iconBg: "bg-[#eafaf1]",
    iconText: "text-[#19a765]",
    badgeBg: "bg-[#eafaf1]",
    badgeText: "text-[#11824d]",
  };
}

function formatRole(node) {
  if (node.role === "subadmin") {
    return (node.subRole || "manager").replaceAll("_", " ");
  }

  return (node.role || "user").replaceAll("_", " ");
}