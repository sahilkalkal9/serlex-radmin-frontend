"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import Table from "@/components/ui/Table";
import DateRangePicker from "@/components/ui/DateRangePicker";
import NotificationMenu from "@/components/NotificationMenu";
import UserMenu from "@/components/UserMenu";
import api from "@/utils/api";
import { useSetTopbar } from "@/contexts/TopbarContext";
import { getRedirectPathByUser, getStoredUser, hasRequiredAccess } from "@/utils/roleRedirect";
import { logoutAndRedirect } from "@/utils/session";

const meetingTypes = ["All", "Team", "Client"];
const statusOptions = ["All", "Confirmed", "Not Confirmed", "Pending", "Scheduled", "Cancelled", "Completed"];

function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    fromDate: from.toLocaleDateString("en-CA"),
    toDate: to.toLocaleDateString("en-CA"),
  };
}

function formatLabel(value, fallback = "-") {
  if (!value) return fallback;
  return String(value)
    .replaceAll("_", " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeRange(start, end) {
  if (!start) return "-";
  const endTime = end ? ` - ${formatTime(end)}` : "";
  return `${formatTime(start)}${endTime}`;
}

function getMeetingType(meeting) {
  return formatLabel(meeting?.meetingType, "Team");
}

function getParticipants(meeting) {
  const attendeeEmails = (meeting?.attendees || [])
    .map((attendee) => (typeof attendee === "string" ? attendee : attendee?.email))
    .filter(Boolean);

  if (!attendeeEmails.length) return "-";
  if (attendeeEmails.length <= 2) return attendeeEmails.join(", ");

  return `${attendeeEmails.slice(0, 2).join(", ")} +${attendeeEmails.length - 2}`;
}

function getCreatedById(meeting) {
  const createdBy = meeting?.createdBy;
  if (!createdBy) return "";
  return typeof createdBy === "string" ? createdBy : createdBy._id || createdBy.id || "";
}

function isMeetingOwner(meeting, user) {
  const userId = user?._id || user?.id;
  return userId && String(getCreatedById(meeting)) === String(userId);
}

function isCurrentUserInvited(meeting, user) {
  const email = user?.email?.toLowerCase();
  if (!email) return false;

  return (meeting?.attendees || []).some((attendee) => {
    const attendeeEmail =
      typeof attendee === "string" ? attendee : attendee?.email;
    return attendeeEmail?.toLowerCase() === email;
  });
}

function getMyInviteResponse(meeting, user) {
  const email = user?.email?.toLowerCase();
  if (!email) return null;
  return (meeting?.attendeeResponses || []).find(
    (item) => item?.email?.toLowerCase() === email
  );
}

function getDisplayStatus(meeting, user) {
  if (meeting?.status === "cancelled") return "Cancelled";
  if (meeting?.status === "completed") return "Completed";

  const inviteResponse = getMyInviteResponse(meeting, user);
  if (inviteResponse?.status === "approved") return "Confirmed";
  if (inviteResponse?.status === "rejected") return "Not Confirmed";

  if (meeting?.approvalStatus === "approved") return "Confirmed";
  if (meeting?.approvalStatus === "rejected") return "Not Confirmed";
  if (meeting?.approvalStatus === "pending") return "Pending";

  return meeting?.status === "upcoming" ? "Scheduled" : formatLabel(meeting?.status, "Scheduled");
}

function getStatusTone(status) {
  const value = String(status).toLowerCase();

  if (value.includes("confirm") && !value.includes("not")) {
    return "green";
  }

  if (value.includes("not") || value.includes("cancel") || value.includes("reject")) {
    return "red";
  }

  if (value.includes("pending")) {
    return "orange";
  }

  return "blue";
}

export default function AdminActivityTrackerPage() {
  const router = useRouter();
  const defaultRange = useMemo(() => getDefaultDateRange(), []);

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [appliedFromDate, setAppliedFromDate] = useState(defaultRange.fromDate);
  const [appliedToDate, setAppliedToDate] = useState(defaultRange.toDate);

  const [search, setSearch] = useState("");
  const [meetingType, setMeetingType] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [scheduledBy, setScheduledBy] = useState("All");
  const [activeTab, setActiveTab] = useState("all");
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [reportMeeting, setReportMeeting] = useState(null);
  const [reasonDialog, setReasonDialog] = useState({
    open: false,
    meeting: null,
    reason: "",
    submitting: false,
  });

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/meetings", {
        params: {
          fromDate: appliedFromDate || undefined,
          toDate: appliedToDate || undefined,
        },
      });
      setMeetings(data?.meetings || []);
    } catch (error) {
      console.error("Activity tracker fetch error:", error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFromDate, appliedToDate]);

  useEffect(() => {
    let cancelled = false;

    const bootPage = async () => {
      await Promise.resolve();
      if (cancelled) return;

      const user = getStoredUser();

      if (!user) {
        router.push("/login");
        return;
      }

      if (!hasRequiredAccess(user)) {
        router.push(getRedirectPathByUser(user));
        return;
      }

      setCurrentUser(user);
      setMounted(true);
    };

    bootPage();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!mounted) return;

    const loadMeetings = async () => {
      await Promise.resolve();
      await fetchMeetings();
    };

    loadMeetings();
  }, [fetchMeetings, mounted]);

  const scheduledByOptions = useMemo(() => {
    const creators = new Map();

    meetings.forEach((meeting) => {
      const creator = meeting.createdBy || {};
      const id = getCreatedById(meeting);
      if (!id) return;
      creators.set(id, creator.name || creator.email || "Unknown");
    });

    return [
      { label: "All", value: "All" },
      ...Array.from(creators.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return meetings.filter((meeting) => {
      const creator = meeting.createdBy || {};
      const status = getDisplayStatus(meeting, currentUser);

      const matchesSearch =
        !q ||
        meeting.title?.toLowerCase().includes(q) ||
        meeting.description?.toLowerCase().includes(q) ||
        meeting.location?.toLowerCase().includes(q) ||
        meeting.companyName?.toLowerCase().includes(q) ||
        meeting.personName?.toLowerCase().includes(q) ||
        creator.name?.toLowerCase().includes(q) ||
        creator.email?.toLowerCase().includes(q) ||
        getParticipants(meeting).toLowerCase().includes(q);

      const matchesType =
        meetingType === "All" ||
        String(meeting.meetingType || "").toLowerCase() === meetingType.toLowerCase();

      const matchesStatus =
        statusFilter === "All" || status.toLowerCase() === statusFilter.toLowerCase();

      const matchesScheduledBy =
        scheduledBy === "All" || String(getCreatedById(meeting)) === String(scheduledBy);

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "mine" && isMeetingOwner(meeting, currentUser)) ||
        (activeTab === "invited" && isCurrentUserInvited(meeting, currentUser)) ||
        (activeTab === "pending" && status.toLowerCase().includes("pending"));

      return matchesSearch && matchesType && matchesStatus && matchesScheduledBy && matchesTab;
    });
  }, [activeTab, currentUser, meetingType, meetings, scheduledBy, search, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();

    return meetings.reduce(
      (acc, meeting) => {
        const status = getDisplayStatus(meeting, currentUser);

        acc.total += 1;

        if (meeting.startTime && new Date(meeting.startTime).toDateString() === today) {
          acc.today += 1;
        }

        if (status === "Confirmed" || status === "Completed") {
          acc.confirmed += 1;
        }

        if (status === "Pending" || status === "Scheduled") {
          acc.pending += 1;
        }

        return acc;
      },
      { total: 0, today: 0, confirmed: 0, pending: 0 }
    );
  }, [currentUser, meetings]);

  const notificationItems = useMemo(() => {
    return [...meetings]
      .sort(
        (a, b) =>
          new Date(b.startTime || b.createdAt || 0).getTime() -
          new Date(a.startTime || a.createdAt || 0).getTime()
      )
      .slice(0, 5)
      .map((meeting) => ({
        title: meeting.title || "Untitled Meeting",
        meta: formatDate(meeting.startTime),
        status: getDisplayStatus(meeting, currentUser),
      }));
  }, [meetings, currentUser]);

  const userDisplayName =
    currentUser?.name || currentUser?.username || currentUser?.email ||     "Admin User";
  const userDisplayRole = formatLabel(
    currentUser?.designation || currentUser?.role,
    "Admin"
  );
  const userInitial = userDisplayName.slice(0, 1).toUpperCase() || "A";

  const handleApplyDateFilter = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const handleResetDateFilter = () => {
    const range = getDefaultDateRange();
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setAppliedFromDate(range.fromDate);
    setAppliedToDate(range.toDate);
  };

  const handleDashboard = () => {
    router.push('/admin/dashboard');
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAndRedirect(router);
  };

  const handleExport = () => {
    const rows = [
      [
        "S.No",
        "Meeting Title",
        "Meeting Type",
        "Scheduled By",
        "Participants",
        "Date",
        "Time",
        "Location",
        "Status",
      ],
      ...filteredMeetings.map((meeting, index) => {
        const creator = meeting.createdBy || {};
        return [
          index + 1,
          meeting.title || "-",
          getMeetingType(meeting),
          creator.name || creator.email || "-",
          getParticipants(meeting),
          formatDate(meeting.startTime),
          formatTimeRange(meeting.startTime, meeting.endTime),
          meeting.location || "-",
          getDisplayStatus(meeting, currentUser),
        ];
      }),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "activity-tracker-meetings.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmMeeting = async (meeting) => {
    try {
      if (isCurrentUserInvited(meeting, currentUser) && !isMeetingOwner(meeting, currentUser)) {
        await api.patch(`/meetings/${meeting._id}/invite-response`, {
          responseStatus: "approved",
          rejectionReason: "",
        });
      } else {
        await api.patch(`/meetings/${meeting._id}/approval`, {
          approvalStatus: "approved",
          approvalRemark: "Confirmed from admin activity tracker",
        });
      }

      fetchMeetings();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to confirm meeting");
    }
  };

  const openCancelDialog = (meeting) => {
    setReasonDialog({
      open: true,
      meeting,
      reason: "",
      submitting: false,
    });
  };

  const handleCancelMeeting = async () => {
    if (!reasonDialog.meeting || !reasonDialog.reason.trim()) return;

    try {
      setReasonDialog((prev) => ({ ...prev, submitting: true }));

      await api.patch(`/meetings/${reasonDialog.meeting._id}/status`, {
        status: "cancelled",
        cancellationRemark: reasonDialog.reason.trim(),
      });

      setReasonDialog({
        open: false,
        meeting: null,
        reason: "",
        submitting: false,
      });
      setSelectedMeeting(null);
      fetchMeetings();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to cancel meeting");
      setReasonDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  const clearFilters = () => {
    setSearch("");
    setMeetingType("All");
    setStatusFilter("All");
    setScheduledBy("All");
    setActiveTab("all");
  };

  const tableColumns = useMemo(() => [
    {
      key: "index",
      label: "S.No",
      width: "48px",
      minWidth: "48px",
      maxWidth: "48px",
      sortable: false,
      hideOnMobile: true,
      render: (_, i) => i + 1,
    },
    {
      key: "title",
      label: "Meeting Title",
      width: "1fr",
      minWidth: "280px",
      sortable: false,
        render: (meeting, i) => {
          const creator = meeting.createdBy || {};
          const isYou = isMeetingOwner(meeting, currentUser);
          const name = isYou ? "You" : creator.name || creator.email || "-";
          const role = isYou ? "Admin" : creator.designation || formatLabel(creator.subRole || creator.role, "User");

          return (
            <div className="flex min-w-0 items-start gap-2 py-1">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${rowDotTones[i % rowDotTones.length]}`} />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-bold text-[#141a64]">
                    {meeting.title || "Untitled Meeting"}
                  </span>
                  {meeting.leadId ? (
                    <span className="inline-flex items-center rounded-[4px] bg-[#fff0e5] px-1.5 py-0.5 text-[9px] font-bold text-[#ef7c21]" title={meeting.leadId}>
                      Lead: {meeting.leadId}
                    </span>
                  ) : null}
                  {meeting.reports?.length > 0 ? (
                    <span className="inline-flex items-center gap-0.5 rounded-[4px] bg-[#e8f8ef] px-1.5 py-0.5 text-[9px] font-bold text-[#14a863]">
                      <FileText className="h-2.5 w-2.5" />
                      {meeting.reports.length}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-0.5 text-[11px] text-[#5b6385]">
                  <div><span className="font-semibold text-[#8b93a8]">Type:</span> {getMeetingType(meeting)}</div>
                  <div className="flex flex-wrap gap-x-2">
                    <span><span className="font-semibold text-[#8b93a8]">By:</span> {name} ({role})</span>
                    <span><span className="font-semibold text-[#8b93a8]">When:</span> {formatDate(meeting.startTime)} {formatTimeRange(meeting.startTime, meeting.endTime)}</span>
                  </div>
                  <div><span className="font-semibold text-[#8b93a8]">Where:</span> {meeting.location || "Conference Room"}</div>
                </div>
              </div>
            </div>
          );
        },
    },
    {
      key: "participants",
      label: "Participants",
      width: "180px",
      minWidth: "140px",
      sortable: false,
      noWrap: true,
      render: (meeting) => (
        <span className="line-clamp-2 text-[12px] font-semibold leading-5 text-[#28304d]">
          {getParticipants(meeting)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "120px",
      minWidth: "100px",
      sortable: false,
      noWrap: true,
      render: (meeting) => <StatusBadge status={getDisplayStatus(meeting, currentUser)} />,
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      minWidth: "110px",
      sortable: false,
      align: "center",
      hideOnMobile: true,
      render: (meeting) => (
        <ActionButtons
          meeting={meeting}
          currentUser={currentUser}
          onView={setSelectedMeeting}
          onConfirm={handleConfirmMeeting}
          onCancel={openCancelDialog}
          onReport={setReportMeeting}
        />
      ),
    },
  ], [currentUser, handleConfirmMeeting, openCancelDialog, setSelectedMeeting, setReportMeeting]);

  useSetTopbar({
    title: "Activity Tracker",
    subtitle: "Track all meetings scheduled and manage confirmations",
    children: (
      <div className="grid w-full grid-cols-1 gap-2 min-[560px]:grid-cols-[minmax(0,1fr)_48px_minmax(172px,auto)] lg:w-auto lg:grid-cols-[auto_48px_auto]">
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          appliedFromDate={appliedFromDate}
          appliedToDate={appliedToDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
          onApply={handleApplyDateFilter}
          onReset={handleResetDateFilter}
        />

        <NotificationMenu
          count={notificationItems.length}
          items={notificationItems}
        />

        <UserMenu
          userName={userDisplayName}
          userInitials={userInitial}
          userRole={userDisplayRole}
          appliedFromDate={appliedFromDate}
          appliedToDate={appliedToDate}
          onDashboard={handleDashboard}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </div>
    ),
  });

  if (!mounted) return null;

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#fbfbfd] text-[#071033]">

      <section className="mx-auto w-full max-w-[1780px] px-3 py-4 min-[360px]:px-4 sm:px-5 lg:px-6 xl:px-7">
        <StatsGrid stats={stats} />

        <div className="mt-4 overflow-hidden rounded-[10px] border border-[#e3e6ee] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
          <div className="grid gap-2 border-b border-[#edf0f6] px-3 py-3 min-[600px]:grid-cols-[minmax(180px,1.2fr)_repeat(3,minmax(120px,0.55fr))_auto]">
            <SearchBox value={search} onChange={setSearch} />
            <SelectFilter label="Meeting Type" value={meetingType} onChange={setMeetingType} options={meetingTypes} />
            <SelectFilter label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            <SelectFilter
              label="Scheduled By"
              value={scheduledBy}
              onChange={setScheduledBy}
              options={scheduledByOptions}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex h-9 items-center justify-center gap-1.5 rounded-[6px] border border-[#e2e5ee] bg-white px-3 text-[11px] font-semibold text-[#071033] transition hover:border-[#ff4b0b]"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="h-9 rounded-[6px] border border-[#ffd1bf] bg-white px-3 text-[11px] font-bold text-[#ff4b0b]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b border-[#edf0f6] px-3 py-3 min-[700px]:flex-row min-[700px]:items-center min-[700px]:justify-between">
            <MeetingTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              counts={{
                all: meetings.length,
                mine: meetings.filter((meeting) => isMeetingOwner(meeting, currentUser)).length,
                invited: meetings.filter((meeting) => isCurrentUserInvited(meeting, currentUser)).length,
                pending: meetings.filter((meeting) => getDisplayStatus(meeting, currentUser) === "Pending").length,
              }}
            />

            <button
              type="button"
              onClick={() => router.push("/planning")}
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[6px] bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] px-3 text-[12px] font-semibold text-white shadow-[0_6px_12px_rgba(255,75,11,0.18)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Schedule
            </button>
          </div>

          <Table
            columns={tableColumns}
            data={filteredMeetings}
            loading={loading}
            sortable={false}
            paginated={false}
            mobileCard={true}
            emptyText="No meetings found."
            loadingText="Loading meetings..."
            keyExtractor={(row, i) => row._id || `${row.title}-${i}`}
          />
        </div>

        <footer className="px-3 pb-2 pt-6 text-center">
          <span className="text-[10px] font-medium text-[#526094]">
            Copyright {new Date().getFullYear()} Serlex Technologies. All rights reserved.
          </span>
        </footer>
      </section>

      {selectedMeeting && (
        <MeetingDetailsModal
          meeting={selectedMeeting}
          currentUser={currentUser}
          onClose={() => setSelectedMeeting(null)}
          onConfirm={handleConfirmMeeting}
          onCancel={openCancelDialog}
        />
      )}

      {reportMeeting && (
        <MeetingReportModal
          meeting={reportMeeting}
          onClose={() => setReportMeeting(null)}
        />
      )}

      {reasonDialog.open && (
        <CancelMeetingDialog
          reason={reasonDialog.reason}
          submitting={reasonDialog.submitting}
          onChange={(reason) => setReasonDialog((prev) => ({ ...prev, reason }))}
          onClose={() =>
            setReasonDialog({
              open: false,
              meeting: null,
              reason: "",
              submitting: false,
            })
          }
          onSubmit={handleCancelMeeting}
        />
      )}
    </main>
  );
}

function StatsGrid({ stats }) {
  const cards = [
    {
      title: "Total Meetings",
      value: stats.total,
      sub: "This Month",
      icon: CalendarCheck,
      tone: "blue",
    },
    {
      title: "Meetings Today",
      value: stats.today,
      sub: "Today",
      icon: CalendarCheck,
      tone: "green",
    },
    {
      title: "Confirmed Meetings",
      value: stats.confirmed,
      sub: "This Month",
      icon: CheckCircle2,
      tone: "purple",
    },
    {
      title: "Pending / Awaiting",
      value: stats.pending,
      sub: "This Month",
      icon: Clock3,
      tone: "orange",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 min-[500px]:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const tone = statTones[card.tone] || statTones.blue;

        return (
          <article
            key={card.title}
            className="rounded-[8px] border border-[#e8ebf2] bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.03)]"
          >
            <div className="flex items-center gap-3">
              <span className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full ${tone.bg}`}>
                <Icon className={`h-5 w-5 ${tone.text}`} />
              </span>

              <div className="min-w-0">
                <span className="block truncate text-[9px] font-bold text-[#161b55]">{card.title}</span>
                <strong className="mt-1 block text-[22px] font-bold leading-none text-[#070b55]">{card.value}</strong>
                <span className="mt-0.5 block text-[9px] font-semibold text-[#66709a]">{card.sub}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const statTones = {
  blue: { bg: "bg-[#eaf3ff]", text: "text-[#1677ff]" },
  green: { bg: "bg-[#e8f8ef]", text: "text-[#14a863]" },
  purple: { bg: "bg-[#f2e3ff]", text: "text-[#9227e8]" },
  orange: { bg: "bg-[#fff0e5]", text: "text-[#ff5d1a]" },
};

function SearchBox({ value, onChange }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#66709a]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by title, team member or location"
        className="h-9 w-full rounded-[6px] border border-[#e2e5ee] bg-white pl-9 pr-2.5 text-[11px] font-semibold text-[#071033] outline-none focus:border-[#ff4b0b]"
      />
    </div>
  );
}

function SelectFilter({ label, value, onChange, options }) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option
  );

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none rounded-[6px] border border-[#e2e5ee] bg-white px-2.5 pr-7 text-[11px] font-semibold text-[#071033] outline-none focus:border-[#ff4b0b]"
      >
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#66709a]" />
    </div>
  );
}

function MeetingTabs({ activeTab, setActiveTab, counts }) {
  const tabs = [
    { id: "all", label: "All Meetings", icon: CalendarDays, count: counts.all },
    { id: "mine", label: "Scheduled By Me", icon: UserRound, count: counts.mine },
    { id: "invited", label: "Invited To Meetings", icon: Users, count: counts.invited },
    { id: "pending", label: "Pending Confirmation", icon: Clock3, count: counts.pending },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex h-8 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[10px] font-bold transition ${
              active
                ? "border-[#ff4b0b] text-[#ff4b0b]"
                : "border-transparent text-[#414a75] hover:text-[#ff4b0b]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
            <span className="rounded-full bg-[#f3f4f8] px-1.5 py-0.5 text-[9px] text-[#66709a]">
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const rowDotTones = ["bg-[#1677ff]", "bg-[#14a863]", "bg-[#9227e8]", "bg-[#ff5d1a]", "bg-[#ff2f3d]"];

function TypeBadge({ type }) {
  const tone =
    type.toLowerCase() === "client"
      ? "bg-[#f2e3ff] text-[#9227e8]"
      : "bg-[#e9f6ff] text-[#1677ff]";

  return (
    <span className={`inline-flex rounded-[6px] px-3 py-1 font-[var(--font-primary)] text-[11px] font-bold ${tone}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status }) {
  const tone = getStatusTone(status);
  const styles = {
    green: "bg-[#e8f8ef] text-[#14a863]",
    red: "bg-[#fff0ec] text-[#ef3b2d]",
    orange: "bg-[#fff0e5] text-[#ef7c21]",
    blue: "bg-[#eaf3ff] text-[#1677ff]",
  };

  return (
    <span className={`inline-flex rounded-[6px] px-3 py-1 font-[var(--font-primary)] text-[11px] font-bold ${styles[tone]}`}>
      {status}
    </span>
  );
}

function ActionButtons({ meeting, currentUser, onView, onConfirm, onCancel, onReport }) {
  const status = getDisplayStatus(meeting, currentUser);
  const canConfirm = !["Confirmed", "Completed", "Cancelled"].includes(status);
  const canCancel = meeting.status !== "cancelled";
  const hasReports = meeting.reports?.length > 0;

  return (
    <div
      className="flex items-center gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <IconButton label="View" onClick={() => onView(meeting)}>
        <Eye className="h-3.5 w-3.5" />
      </IconButton>
      {hasReports ? (
        <IconButton label="Reports" onClick={() => onReport(meeting)}>
          <FileText className="h-3.5 w-3.5" />
        </IconButton>
      ) : null}
      <IconButton
        label={canConfirm ? "Confirm" : "Edit"}
        onClick={() => (canConfirm ? onConfirm(meeting) : onView(meeting))}
      >
        <Edit className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton
        label="Cancel"
        danger
        disabled={!canCancel}
        onClick={() => onCancel(meeting)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

function IconButton({ label, children, onClick, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-7 w-7 place-items-center rounded-[6px] border transition disabled:cursor-not-allowed disabled:opacity-45 ${
        danger
          ? "border-red-100 text-[#ff3b3b] hover:bg-red-50"
          : "border-[#e2e5ee] text-[#1677ff] hover:border-[#1677ff]"
      }`}
    >
      {children}
    </button>
  );
}

function MeetingDetailsModal({ meeting, currentUser, onClose, onConfirm, onCancel }) {
  const creator = meeting.createdBy || {};
  const status = getDisplayStatus(meeting, currentUser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-2 py-4">
      <div className="flex max-h-[94dvh] w-full max-w-[560px] flex-col rounded-[14px] bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e3e6ee] bg-white px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-bold text-[#071033]">Meeting Details</h3>
            <p className="truncate text-[11px] font-medium text-[#626a82]">{meeting.title || "-"}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f3f4f7]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 flex flex-wrap gap-1.5">
            <TypeBadge type={getMeetingType(meeting)} />
            <StatusBadge status={status} />
            {meeting.leadId ? (
              <span className="inline-flex items-center rounded-[4px] bg-[#fff0e5] px-2 py-1 text-[10px] font-bold text-[#ef7c21]">
                Lead: {meeting.leadId}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoBox label="Meeting Title" value={meeting.title || "-"} />
            <InfoBox label="Scheduled By" value={creator.name || creator.email || "-"} />
            <InfoBox label="Role" value={creator.designation || formatLabel(creator.role, "User")} />
            <InfoBox label="Date" value={formatDate(meeting.startTime)} />
            <InfoBox label="Time" value={formatTimeRange(meeting.startTime, meeting.endTime)} />
            <InfoBox label="Location" value={meeting.location || "-"} />
            <InfoBox label="Participants" value={getParticipants(meeting)} />
            <InfoBox label="Status" value={status} />
            <InfoBox label="Source" value={formatLabel(meeting.source, "Google")} />
            {meeting.leadId ? <InfoBox label="Lead ID" value={meeting.leadId} /> : null}
          </div>

          {meeting.description ? (
            <div className="mt-3 rounded-[8px] border border-[#e3e6ee] bg-[#fbfbfd] p-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.04em] text-[#626a82]">Purpose / Description</span>
              <p className="mt-1 text-[11px] font-medium leading-5 text-[#071033]">{meeting.description}</p>
            </div>
          ) : null}

          {meeting.cancellationRemark ? (
            <div className="mt-3 rounded-[8px] border border-red-100 bg-red-50 p-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.04em] text-red-600">Cancellation Reason</span>
              <p className="mt-1 text-[11px] font-medium leading-5 text-red-700">{meeting.cancellationRemark}</p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[#e3e6ee] pt-4 min-[400px]:flex-row min-[400px]:justify-end">
            <button
              type="button"
              onClick={() => onCancel(meeting)}
              disabled={meeting.status === "cancelled"}
              className="h-9 rounded-[8px] border border-red-100 bg-white px-4 text-[12px] font-semibold text-red-500 disabled:opacity-50"
            >
              Cancel Meeting
            </button>
            <button
              type="button"
              onClick={() => onConfirm(meeting)}
              disabled={status === "Confirmed" || meeting.status === "cancelled"}
              className="h-9 rounded-[8px] bg-emerald-600 px-5 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              Confirm Meeting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MeetingReportModal({ meeting, onClose }) {
  const reports = meeting.reports || [];
  const [selectedReport, setSelectedReport] = useState(reports.length === 1 ? reports[0] : null);

  if (!reports.length) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-2 py-4">
      <div className="flex max-h-[94dvh] w-full max-w-[600px] flex-col rounded-[14px] bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e3e6ee] px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-bold text-[#071033]">Meeting Reports</h3>
            <p className="truncate text-[11px] font-medium text-[#626a82]">{meeting.title || "-"}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f3f4f7]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {reports.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {reports.map((r, i) => (
                <button
                  key={r._id || i}
                  onClick={() => setSelectedReport(r)}
                  className={`rounded-[6px] px-2.5 py-1.5 text-[10px] font-bold transition ${
                    selectedReport?._id === r._id
                      ? "bg-[#ff4b0b] text-white"
                      : "border border-[#e2e5ee] bg-white text-[#49516b] hover:border-[#ffb396]"
                  }`}
                >
                  Report {i + 1}
                </button>
              ))}
            </div>
          ) : null}

          {selectedReport ? (
            <ReportDetail report={selectedReport} />
          ) : (
            <p className="py-8 text-center text-[12px] font-medium text-[#626a82]">Select a report to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-[6px] border border-[#edf0f6] bg-[#fbfbfd] p-2.5">
      <span className="block text-[8px] font-bold uppercase tracking-[0.04em] text-[#9aa1b5]">{label}</span>
      <span className="mt-0.5 block break-words text-[11px] font-semibold text-[#071033]">{value || "-"}</span>
    </div>
  );
}

function ReportDetail({ report }) {
  const fields = [
    { label: "Report Type", value: report.reportType === "client" ? "Client Meeting" : "Team Meeting" },
    { label: "Meeting Date & Time", value: report.meetingDateTime ? formatDate(report.meetingDateTime) + " " + formatTime(report.meetingDateTime) : "-" },
    { label: "Meeting Purpose", value: report.meetingPurpose || "-" },
    { label: "Company Name", value: report.companyName || "-" },
    { label: "Contact Person", value: report.contactPerson || "-" },
    { label: "Phone Number", value: report.phoneNumber || "-" },
    { label: "Lead Status", value: report.leadStatus ? formatLabel(report.leadStatus) : "-" },
    { label: "Expected Deal Value", value: report.expectedDealValue ? `₹${Number(report.expectedDealValue).toLocaleString("en-IN")}` : "-" },
    { label: "PO Received", value: report.poReceived ? "Yes" : "No" },
    { label: "Purchase Order No.", value: report.purchaseOrderNumber || "-" },
    { label: "PO Date", value: report.poDate ? formatDate(report.poDate) : "-" },
    { label: "PO Expected Delivery", value: report.poExpectedDeliveryDate ? formatDate(report.poExpectedDeliveryDate) : "-" },
    { label: "Category", value: report.category || "-" },
    { label: "Payment Terms", value: report.paymentTerms || "-" },
    { label: "Lead ID", value: report.leadId || "-" },
    { label: "Lead Closed Remark", value: report.leadClosedRemark || "-" },
  ];

  return (
    <div className="space-y-2">
      {report.notes ? (
        <div className="mb-3 rounded-[8px] border border-[#edf0f6] bg-[#fbfbfd] p-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.04em] text-[#626a82]">Notes</span>
          <p className="mt-1 text-[11px] font-medium leading-5 text-[#071033]">{report.notes}</p>
        </div>
      ) : null}
      {report.meetingPoints ? (
        <div className="mb-3 rounded-[8px] border border-[#edf0f6] bg-[#fbfbfd] p-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.04em] text-[#626a82]">Meeting Points / Discussion</span>
          <p className="mt-1 text-[11px] font-medium leading-5 text-[#071033]">{report.meetingPoints}</p>
        </div>
      ) : null}
      {report.leadClosedRemark ? (
        <div className="mb-3 rounded-[8px] border border-red-100 bg-red-50 p-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.04em] text-red-600">Lead Closed Remark</span>
          <p className="mt-1 text-[11px] font-medium leading-5 text-red-700">{report.leadClosedRemark}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <div key={f.label} className="rounded-[6px] border border-[#edf0f6] bg-[#fbfbfd] p-2.5">
            <span className="block text-[8px] font-bold uppercase tracking-[0.04em] text-[#9aa1b5]">{f.label}</span>
            <span className="mt-0.5 block break-words text-[11px] font-semibold text-[#071033]">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CancelMeetingDialog({ reason, submitting, onChange, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-2 py-4">
      <div className="w-full max-w-[440px] rounded-[14px] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#e3e6ee] px-4 py-3">
          <div>
            <h3 className="text-[16px] font-bold text-[#071033]">Cancel Meeting</h3>
            <p className="mt-0.5 text-[11px] font-medium text-[#626a82]">Add cancellation reason before cancelling.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f3f4f7] disabled:opacity-60">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold text-[#28304d]">Cancellation Reason</span>
            <textarea
              value={reason}
              onChange={(event) => onChange(event.target.value)}
              rows={3}
              placeholder="Enter cancellation reason"
              className="w-full resize-none rounded-[6px] border border-[#e2e5ee] bg-white px-3 py-2.5 text-[12px] text-[#071033] outline-none focus:border-[#ff4b0b] focus:ring-2 focus:ring-[#ff4b0b]/10"
            />
          </label>

          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[#e3e6ee] pt-4 min-[400px]:flex-row min-[400px]:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-9 rounded-[6px] border border-[#e2e5ee] bg-white px-4 text-[12px] font-semibold text-[#071033] disabled:opacity-60"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || !reason.trim()}
              className="h-9 rounded-[6px] bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] px-5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Cancelling..." : "Cancel Meeting"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}