"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import api from "@/utils/api";
import { useSetTopbar } from "@/contexts/TopbarContext";
import { getStoredUser } from "@/utils/roleRedirect";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const adminApprovalStyles = {
  true: "bg-[#e7f8ef] text-[#05925f]",
  false: "bg-[#fff4dd] text-[#d58a00]",
};

function formatLabel(value, fallback = "-") {
  if (!value) return fallback;
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatToAMPM(time) {
  if (!time) return "-";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [whEditId, setWhEditId] = useState(null);
  const [whForm, setWhForm] = useState({ startTime: "10:00", endTime: "18:00" });
  const [savingWh, setSavingWh] = useState(false);

  const [activeTab, setActiveTab] = useState("members");
  const [roleTab, setRoleTab] = useState("all");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/users");
      setUsers((data?.users || []).filter((u) => !["admin", "superadmin", "radmin"].includes(u.role)));
    } catch (error) {
      console.error("Admin users fetch error:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const boot = async () => {
      await Promise.resolve();
      setCurrentUser(getStoredUser());
      await fetchUsers();
    };
    boot();
  }, [fetchUsers]);

  const departments = useMemo(
    () => [...new Set(users.map((user) => user.department).filter(Boolean))].sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
          [user.name, user.email, user.employeeId, user.mobileNumber, user.department, user.designation, user.deviceId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesDepartment = department === "all" || user.department === department;
      const matchesStatus = status === "all" || user.status === status;
      const matchesTab = activeTab === "past" ? user.status === "inactive" : user.status !== "inactive";
      const matchesRoleTab =
        roleTab === "all" ||
        (roleTab === "executives" && ["sales_user", "purchase_user", "ppc_user"].includes(user.role)) ||
        (roleTab === "managers" && user.role === "subadmin") ||
        (roleTab === "admins" && user.role === "radmin");
      return matchesSearch && matchesDepartment && matchesStatus && matchesTab && matchesRoleTab;
    });
  }, [department, search, status, users, activeTab, roleTab]);

  const stats = useMemo(
    () => {
      const basePool = users.filter((user) => activeTab === "past" ? user.status === "inactive" : user.status !== "inactive");
      return {
        total: users.length,
        active: users.filter((user) => user.status !== "inactive").length,
        inactive: users.filter((user) => user.status === "inactive").length,
        approved: users.filter((user) => user.status === "approved").length,
        pending: users.filter((user) => user.status === "pending").length,
        adminApproved: users.filter((user) => user.isApprovedByAdmin).length,
        adminPending: users.filter((user) => !user.isApprovedByAdmin && !["admin", "superadmin", "radmin"].includes(user.role)).length,
        executives: basePool.filter((u) => ["sales_user", "purchase_user", "ppc_user"].includes(u.role)).length,
        managers: basePool.filter((u) => u.role === "subadmin").length,
        admins: basePool.filter((u) => u.role === "radmin").length,
      };
    },
    [users, activeTab]
  );

  const updateStatus = async (userId, nextStatus) => {
    if (!userId || updatingId) return;
    try {
      setUpdatingId(userId);
      const { data } = await api.patch(`/admin/users/${userId}/status`, { status: nextStatus });
      setUsers((prev) =>
        prev.map((user) => (user._id === userId ? data?.user || { ...user, status: nextStatus } : user))
      );
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update user status");
    } finally {
      setUpdatingId("");
    }
  };

  const saveWorkingHours = async (userId) => {
    if (!userId || savingWh) return;
    try {
      setSavingWh(true);
      const { data } = await api.patch(`/admin/users/${userId}/working-hours`, whForm);
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? data.user : u)));
        setWhEditId(null);
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update working hours");
    } finally {
      setSavingWh(false);
    }
  };

  const clearDevice = async (userId) => {
    if (!userId || updatingId) return;
    if (!window.confirm("Clear device ID for this user?")) return;
    try {
      setUpdatingId(userId);
      const { data } = await api.patch(`/admin/users/${userId}/clear-device`);
      if (data.success) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? data.user : u)));
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to clear device");
    } finally {
      setUpdatingId("");
    }
  };

  useSetTopbar({
    title: "Team Management",
    subtitle: "Manage users, approvals, and working hours.",
    actions: (
      <Button icon={Plus} onClick={() => setShowAddModal(true)} size="lg">
        Add Person
      </Button>
    ),
  });

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#fbfbfd] text-[#071033]">
      <section className="mx-auto w-full max-w-[1780px] space-y-4 px-3 py-4 sm:px-5 lg:px-7">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Total Users" value={stats.total} color="#1d86f5" />
          <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} color="#19b96d" />
          <StatCard icon={ShieldCheck} label="Pending Approval" value={stats.pending} color="#f29322" />
          <StatCard icon={XCircle} label="Inactive" value={stats.inactive} color="#ee3d83" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard icon={UserCheck} label="Admin Approved" value={stats.adminApproved} color="#1677ff" />
          <StatCard icon={ShieldCheck} label="Awaiting Admin Approval" value={stats.adminPending} color="#ff5d1a" />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setActiveTab("members"); setRoleTab("all"); }}
            className={`rounded-[8px] px-5 py-2.5 text-[12px] font-bold transition ${
              activeTab === "members"
                ? "bg-[#ff4b0b] text-white shadow-[0_4px_12px_rgba(255,75,11,0.25)]"
                : "border border-[#e8ebf2] bg-white text-[#7580a5] hover:bg-[#fbfbfd]"
            }`}
          >
            Active Members ({stats.active})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("past"); setRoleTab("all"); }}
            className={`rounded-[8px] px-5 py-2.5 text-[12px] font-bold transition ${
              activeTab === "past"
                ? "bg-[#ff4b0b] text-white shadow-[0_4px_12px_rgba(255,75,11,0.25)]"
                : "border border-[#e8ebf2] bg-white text-[#7580a5] hover:bg-[#fbfbfd]"
            }`}
          >
            Past Members ({stats.inactive})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "executives", label: "Executives" },
            { key: "managers", label: "Managers" },
            { key: "admins", label: "Admins" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRoleTab(key)}
              className={`rounded-[6px] px-4 py-2 text-[11px] font-bold transition ${
                roleTab === key
                  ? "bg-[#1d2540] text-white shadow-[0_3px_10px_rgba(29,37,64,0.2)]"
                  : "border border-[#e8ebf2] bg-white text-[#7580a5] hover:bg-[#fbfbfd]"
              }`}
            >
              {label} {key !== "all" ? `(${stats[key]})` : ""}
            </button>
          ))}
        </div>

        <div className="rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_180px]">
            <label className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7580a5]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, employee ID, email or department"
                className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white pl-10 pr-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
              />
            </label>
            <SelectFilter value={department} onChange={setDepartment} options={[{ value: "all", label: "All Departments" }, ...departments.map((item) => ({ value: item, label: item }))]} />
            <SelectFilter value={status} onChange={setStatus} options={[{ value: "all", label: "All Status" }, { value: "approved", label: "Approved" }, { value: "pending", label: "Pending" }, { value: "inactive", label: "Inactive" }]} />
          </div>
        </div>

        <div className="overflow-hidden rounded-[8px] border border-[#e8ebf2] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.03)]">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-[#eef0f6] bg-[#fbfbfd]">
                <tr>
                  {["User", "ID & Dept", "Working Hours", "Admin Approval", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-[11px] font-bold text-[#16205f]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] font-bold text-[#7a83a8]">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[#ff4b0b]" />
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <UserRow
                      key={user._id}
                      user={user}
                      currentUser={currentUser}
                      updating={updatingId === user._id}
                      onUpdate={updateStatus}
                      onClearDevice={clearDevice}
                      whEditId={whEditId}
                      whForm={whForm}
                      setWhEditId={setWhEditId}
                      setWhForm={setWhForm}
                      savingWh={savingWh}
                      onSaveWh={saveWorkingHours}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[12px] font-bold text-[#7a83a8]">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {loading ? (
              <div className="rounded-[12px] border border-[#eef0f6] p-8 text-center text-[12px] font-bold text-[#7a83a8]">
                Loading users...
              </div>
            ) : filteredUsers.length ? (
              filteredUsers.map((user) => (
                <UserCard
                  key={user._id}
                  user={user}
                  currentUser={currentUser}
                  updating={updatingId === user._id}
                  onUpdate={updateStatus}
                  onClearDevice={clearDevice}
                  whEditId={whEditId}
                  whForm={whForm}
                  setWhEditId={setWhEditId}
                  setWhForm={setWhForm}
                  savingWh={savingWh}
                  onSaveWh={saveWorkingHours}
                />
              ))
            ) : (
              <div className="rounded-[12px] border border-[#eef0f6] p-8 text-center text-[12px] font-bold text-[#7a83a8]">
                No users found.
              </div>
            )}
          </div>
        </div>
      </section>

      <AddPersonModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(newUser) => {
          setUsers((prev) => [newUser, ...prev]);
          setShowAddModal(false);
        }}
      />
    </main>
  );
}

function SelectFilter({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <article className="flex min-h-[112px] items-center gap-4 rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.035)]">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${color}18`, color }}>
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <p className="text-[11px] font-bold text-[#4e5a8d]">{label}</p>
        <p className="mt-2 text-[24px] font-bold text-[#0a0c60]">{value}</p>
      </div>
    </article>
  );
}

function UserAvatar({ user }) {
  const initial = (user.name || user.email || "U").slice(0, 1).toUpperCase();
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffe5d8] text-[13px] font-bold text-[#06143a]">
      {initial}
    </span>
  );
}

function AdminApprovalBadge({ approved, role }) {
  if (["admin", "superadmin", "radmin"].includes(role)) {
    return <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold bg-[#eaf3ff] text-[#1677ff]">Self</span>;
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${adminApprovalStyles[String(approved)]}`}>
      {approved ? "Approved" : "Pending"}
    </span>
  );
}

function ActionButtons({ user, currentUser, onUpdate, updating, onClearDevice }) {
  const isSelf = String(currentUser?.id || currentUser?._id || "") === String(user._id);
  if (isSelf || ["admin", "superadmin", "radmin"].includes(user.role)) return null;

  const isInactive = user.status === "inactive";

  return (
    <div className="flex flex-col gap-2">
      {isInactive ? (
        <button
          type="button"
          disabled={updating}
          onClick={() => onUpdate(user._id, "approved")}
          className="h-8 rounded-[7px] bg-[#19b96d] px-3 text-[11px] font-bold text-white disabled:opacity-60"
        >
          Activate
        </button>
      ) : user.isApprovedByAdmin ? (
        <>
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdate(user._id, "pending")}
            className="h-8 rounded-[7px] border border-[#e7e9f1] bg-white px-3 text-[11px] font-bold text-[#7a83a8] hover:border-orange-200 hover:text-[#ff4b0b] disabled:opacity-60"
          >
            Deactivate
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdate(user._id, "inactive")}
            className="flex items-center justify-center gap-1.5 h-8 rounded-[7px] bg-[#ffeeed] px-3 text-[11px] font-bold text-[#cc4b37] hover:bg-[#ffe1db] disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={updating}
          onClick={() => onUpdate(user._id, "approved")}
          className="h-8 rounded-[7px] bg-[#ff4b0b] px-3 text-[11px] font-bold text-white disabled:opacity-60"
        >
          Approve
        </button>
      )}
      {user.deviceId && (
        <button
          type="button"
          disabled={updating}
          onClick={() => onClearDevice(user._id)}
          className="h-8 rounded-[7px] border border-[#e7e9f1] bg-white px-3 text-[11px] font-bold text-[#7a83a8] hover:border-red-200 hover:text-red-500 disabled:opacity-60"
        >
          Clear Device
        </button>
      )}
    </div>
  );
}

function WorkingHoursCell({ user, whEditId, whForm, setWhEditId, setWhForm, savingWh, onSaveWh }) {
  const editing = whEditId === user._id;
  const wh = user.workingHours || { startTime: "10:00", endTime: "18:00" };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="time"
          value={whForm.startTime}
          onChange={(e) => setWhForm((p) => ({ ...p, startTime: e.target.value }))}
          className="w-[72px] rounded border border-[#e7e9f1] px-1 py-1 text-[10px] font-bold text-[#2b356f] outline-none focus:border-[#ff4b0b]"
        />
        <span className="text-[10px] text-[#7a83a8]">to</span>
        <input
          type="time"
          value={whForm.endTime}
          onChange={(e) => setWhForm((p) => ({ ...p, endTime: e.target.value }))}
          className="w-[72px] rounded border border-[#e7e9f1] px-1 py-1 text-[10px] font-bold text-[#2b356f] outline-none focus:border-[#ff4b0b]"
        />
        <button
          type="button"
          disabled={savingWh}
          onClick={() => onSaveWh(user._id)}
          className="ml-1 rounded p-1 text-[#19b96d] hover:bg-green-50 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setWhEditId(null)}
          className="rounded p-1 text-[#7a83a8] hover:bg-gray-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setWhForm({ startTime: wh.startTime, endTime: wh.endTime });
        setWhEditId(user._id);
      }}
      className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-bold text-[#2b356f] hover:bg-[#f5f6fa]"
    >
      <Clock className="h-3.5 w-3.5 text-[#7a83a8]" />
      {formatToAMPM(wh.startTime)} - {formatToAMPM(wh.endTime)}
    </button>
  );
}

function UserRow({ user, currentUser, updating, onUpdate, onClearDevice, whEditId, whForm, setWhEditId, setWhForm, savingWh, onSaveWh }) {
  return (
    <tr className="border-b border-[#eef0f6] last:border-b-0">
      <td className="px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold text-[#071033]">{user.name || "-"}</p>
            <p className="truncate text-[10px] font-semibold text-[#68729d]">{user.designation || "-"}</p>
            <p className="truncate text-[9px] font-mono text-[#9aa1b5]">Device: {user.deviceId || "Not set"}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <p className="text-[11px] font-bold text-[#2b356f]">{user.department || "-"}</p>
        <p className="text-[10px] font-semibold text-[#68729d]">{user.employeeId || "-"}</p>
      </td>
      <td className="px-3 py-2.5">
        <WorkingHoursCell user={user} whEditId={whEditId} whForm={whForm} setWhEditId={setWhEditId} setWhForm={setWhForm} savingWh={savingWh} onSaveWh={onSaveWh} />
      </td>
      <td className="px-3 py-2.5">
        <AdminApprovalBadge approved={user.isApprovedByAdmin} role={user.role} />
      </td>
      <td className="px-3 py-2.5"><ActionButtons user={user} currentUser={currentUser} updating={updating} onUpdate={onUpdate} onClearDevice={onClearDevice} /></td>
    </tr>
  );
}

function UserCard({ user, currentUser, updating, onUpdate, onClearDevice, whEditId, whForm, setWhEditId, setWhForm, savingWh, onSaveWh }) {
  const wh = user.workingHours || { startTime: "10:00", endTime: "18:00" };
  return (
    <article className="rounded-[12px] border border-[#eef0f6] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-[#071033]">{user.name || "-"}</p>
            <p className="truncate text-[11px] font-semibold text-[#68729d]">{user.designation || "-"}</p>
            <p className="truncate text-[9px] font-mono text-[#9aa1b5]">Device: {user.deviceId || "Not set"}</p>
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <AdminApprovalBadge approved={user.isApprovedByAdmin} role={user.role} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-[10px] bg-[#fbfbfd] p-3 text-[11px] font-bold text-[#2b356f]">
        <span>ID: {user.employeeId || "-"}</span>
        <span>Dept: {user.department || "-"}</span>
        <span>Designation: {user.designation || "-"}</span>
        <span>Email: {user.email || "-"}</span>
        <span className="col-span-2">Hours: {formatToAMPM(wh.startTime)} - {formatToAMPM(wh.endTime)} <button type="button" onClick={() => { setWhForm({ startTime: wh.startTime, endTime: wh.endTime }); setWhEditId(user._id); }} className="ml-1 text-[10px] font-bold text-[#ff4b0b] hover:underline">Edit</button></span>
        {whEditId === user._id && (
          <div className="col-span-2 flex items-center gap-1">
            <input type="time" value={whForm.startTime} onChange={(e) => setWhForm((p) => ({ ...p, startTime: e.target.value }))} className="w-[72px] rounded border border-[#e7e9f1] px-1 py-1 text-[10px] font-bold text-[#2b356f] outline-none focus:border-[#ff4b0b]" />
            <span className="text-[10px] text-[#7a83a8]">to</span>
            <input type="time" value={whForm.endTime} onChange={(e) => setWhForm((p) => ({ ...p, endTime: e.target.value }))} className="w-[72px] rounded border border-[#e7e9f1] px-1 py-1 text-[10px] font-bold text-[#2b356f] outline-none focus:border-[#ff4b0b]" />
            <button type="button" disabled={savingWh} onClick={() => onSaveWh(user._id)} className="rounded p-1 text-[#19b96d] hover:bg-green-50 disabled:opacity-50"><Save className="h-3 w-3" /></button>
            <button type="button" onClick={() => setWhEditId(null)} className="rounded p-1 text-[#7a83a8] hover:bg-gray-100"><X className="h-3 w-3" /></button>
          </div>
        )}
      </div>
      <div className="mt-4">
        <ActionButtons user={user} currentUser={currentUser} updating={updating} onUpdate={onUpdate} onClearDevice={onClearDevice} />
      </div>
    </article>
  );
}

function AddPersonModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "", employeeId: "", mobileNumber: "",
    department: "", designation: "", role: "sales_user", subRole: "",
    managerName: "", territory: "", joiningDate: "", dob: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setForm({ name: "", email: "", password: "", employeeId: "", mobileNumber: "", department: "", designation: "", role: "sales_user", subRole: "", managerName: "", territory: "", joiningDate: "", dob: "" });
      setError("");
    }
  }, [open]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((p) => {
      const next = { ...p, [field]: value };
      if (field === "role" && !["radmin", "subadmin"].includes(value)) {
        next.subRole = "";
      }
      return next;
    });
  };

  const isAdminRole = form.role === "radmin";
  const isManagerRole = form.role === "subadmin";
  const showSubRole = isAdminRole || isManagerRole;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.employeeId || !form.mobileNumber || !form.department || !form.designation || !form.joiningDate || !form.dob) {
      setError("Please fill all required fields");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const { data } = await api.post("/admin/users", form);
      if (data.success) {
        onSuccess(data.user);
      } else {
        setError(data.message || "Failed to add person");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add person");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Person" subtitle="Create admin, manager, or user from this modal." wide>
      <form onSubmit={handleSubmit} className="max-h-[70dvh] overflow-y-auto px-4 pb-6 pt-4 min-[380px]:px-5">
        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-[12px] font-bold text-red-600">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Full Name *</label>
            <input value={form.name} onChange={handleChange("name")} placeholder="John Doe" className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Email *</label>
            <input value={form.email} onChange={handleChange("email")} type="email" placeholder="john@company.com" className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Password *</label>
            <input value={form.password} onChange={handleChange("password")} type="password" placeholder="Only 4 chars" className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Employee ID *</label>
            <input value={form.employeeId} onChange={handleChange("employeeId")} placeholder="EMP001" className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Mobile Number *</label>
            <input value={form.mobileNumber} onChange={handleChange("mobileNumber")} placeholder="+91 98765 43210" className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Department *</label>
            <select value={form.department} onChange={handleChange("department")} className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]">
              <option value="">Select department</option>
              {["Sales", "Purchase", "PPC", "HR", "Accounts", "Operations"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Designation *</label>
            <input value={form.designation} onChange={handleChange("designation")} placeholder="Sales Executive" className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Role *</label>
            <select value={form.role} onChange={handleChange("role")} className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]">
              <option value="superadmin">Superadmin</option>
              <option value="radmin">Admin</option>
              <option value="subadmin">Manager</option>
              <option value="sales_user">Sales User</option>
              <option value="purchase_user">Purchase User</option>
              <option value="ppc_user">PPC User</option>
            </select>
          </div>
          {showSubRole && (
            <div>
              <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Sub Role *</label>
              <select value={form.subRole} onChange={handleChange("subRole")} className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]">
                <option value="">Select sub role</option>
                {isAdminRole && (
                  <>
                    <option value="sales_admin">Sales Admin</option>
                    <option value="purchase_admin">Purchase Admin</option>
                    <option value="ppc_admin">PPC Admin</option>
                  </>
                )}
                {isManagerRole && (
                  <>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="po_manager">PO Manager</option>
                    <option value="ppc_manager">PPC Manager</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="accounts_manager">Accounts Manager</option>
                    <option value="operations_manager">Operations Manager</option>
                  </>
                )}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Manager Name</label>
            <input value={form.managerName} onChange={handleChange("managerName")} placeholder="Reporting manager" className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Territory</label>
            <input value={form.territory} onChange={handleChange("territory")} placeholder="North, South, etc." className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Joining Date *</label>
            <input value={form.joiningDate} onChange={handleChange("joiningDate")} type="date" className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-[#7a83a8]">Date of Birth *</label>
            <input value={form.dob} onChange={handleChange("dob")} type="date" className="h-11 w-full rounded-[8px] border border-[#e7e9f1] bg-white px-3 text-[12px] font-bold text-[#18205d] outline-none focus:border-[#ff4b0b]" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-[8px] border border-[#e7e9f1] bg-white px-5 text-[12px] font-bold text-[#2b356f]">Cancel</button>
          <button type="submit" disabled={saving} className="h-11 rounded-[8px] bg-[#ff4b0b] px-5 text-[12px] font-bold text-white disabled:opacity-60">
            {saving ? "Adding..." : "Add Person"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
