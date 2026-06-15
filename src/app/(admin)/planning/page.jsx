"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Plus,
  Power,
  X,
} from "lucide-react";

import Typo from "@/components/ui/typo";
import NotificationMenu from "@/components/NotificationMenu";
import { useSetTopbar } from "@/contexts/TopbarContext";
import UserMenu from "@/components/UserMenu";
import api from "@/utils/api";
import { getStoredUser } from "@/utils/roleRedirect";
import { logoutAndRedirect } from "@/utils/session";

const meetingToneStyles = {
  upcoming: {
    key: "upcoming",
    bg: "bg-[#eaf3ff]",
    text: "text-[#0065c9]",
    dot: "bg-[#0878ff]",
    label: "Upcoming",
  },
  completed: {
    key: "completed",
    bg: "bg-[#e7f8ef]",
    text: "text-[#05925f]",
    dot: "bg-[#14b871]",
    label: "Completed",
  },
  cancelled: {
    key: "cancelled",
    bg: "bg-[#fff1f1]",
    text: "text-[#d92d20]",
    dot: "bg-[#ef4444]",
    label: "Cancelled",
  },
  pending: {
    key: "pending",
    bg: "bg-[#fff4dd]",
    text: "text-[#d58a00]",
    dot: "bg-[#ffb21a]",
    label: "Pending",
  },
  approved: {
    key: "approved",
    bg: "bg-[#eefaf4]",
    text: "text-[#047857]",
    dot: "bg-[#10b981]",
    label: "Approved",
  },
  rejected: {
    key: "rejected",
    bg: "bg-[#fff1f1]",
    text: "text-[#b42318]",
    dot: "bg-[#f04438]",
    label: "Rejected",
  },
  team: {
    key: "team",
    bg: "bg-[#f4ecff]",
    text: "text-[#7a39d8]",
    dot: "bg-[#7c3aed]",
    label: "Team",
  },
  client: {
    key: "client",
    bg: "bg-[#e6fffb]",
    text: "text-[#0f766e]",
    dot: "bg-[#14b8a6]",
    label: "Client",
  },
};

const viewOptions = ["Month", "Week", "Day", "Agenda"];

const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const initialFormData = {
  title: "",
  personName: "",
  designation: "",
  experienceYears: "",
  rating: "",
  reviewsCount: "",
  companyName: "",
  description: "",
  location: "",
  startTime: "",
  endTime: "",
  attendees: "",
  avatarUrl: "",
  status: "upcoming",
};

function isSameDate(dateA, dateB) {
  return (
    dateA.getDate() === dateB.getDate() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getFullYear() === dateB.getFullYear()
  );
}

function getDateKey(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).toDateString();
}

function getMeetingDateKey(meeting) {
  const meetingDate = new Date(meeting.startTime);
  return getDateKey(meetingDate);
}

function getWeekStart(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function getMeetingsForDate(meetings, date) {
  const dateKey = getDateKey(date);
  return meetings.filter((meeting) => getMeetingDateKey(meeting) === dateKey);
}

function getWeeksInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start = getWeekStart(firstDay);
  const weeks = [];

  let cursor = new Date(start);
  let weekNumber = 1;

  while (cursor <= lastDay || cursor.getMonth() === month) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekStart.getDate() + 6);

    const hasCurrentMonthDate =
      weekStart.getMonth() === month ||
      weekEnd.getMonth() === month ||
      (weekStart < firstDay && weekEnd > lastDay);

    if (hasCurrentMonthDate) {
      weeks.push({
        label: `Week ${weekNumber}`,
        start: weekStart,
        end: weekEnd,
      });

      weekNumber += 1;
    }

    cursor.setDate(cursor.getDate() + 7);

    if (weeks.length > 6) break;
  }

  return weeks;
}

function formatShortDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMeetingTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getLocalDateTimeValue(date = new Date()) {
  const pad = (num) => String(num).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatLabel(value, fallback = "User") {
  if (!value) return fallback;

  return String(value)
    .replaceAll("_", " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getUserRoleLabel(user, fallback = "User") {
  return formatLabel(
    user?.designation || user?.department || user?.subRole || user?.role,
    fallback
  );
}

function getMeetingStyle(meeting) {
  const status = meeting?.status;
  const approvalStatus = meeting?.approvalStatus;
  const meetingType = meeting?.meetingType;

  if (status && meetingToneStyles[status]) {
    return meetingToneStyles[status];
  }

  if (approvalStatus && meetingToneStyles[approvalStatus]) {
    return meetingToneStyles[approvalStatus];
  }

  if (meetingType && meetingToneStyles[meetingType]) {
    return meetingToneStyles[meetingType];
  }

  return meetingToneStyles.upcoming;
}

export default function PlanningPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("Month");
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  const [adminUsers, setAdminUsers] = useState([]);
  const [selectedTeamEmails, setSelectedTeamEmails] = useState([]);
  const [teamUsersLoading, setTeamUsersLoading] = useState(false);

  const [googleStatus, setGoogleStatus] = useState({
    connected: false,
    email: "",
  });

  const [formData, setFormData] = useState(initialFormData);

  const fetchMeetings = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/meetings");
      setMeetings(data?.meetings || []);
    } catch (error) {
      console.error("Meetings fetch error:", error);
      setMeetings([]);
    }
  }, []);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/google/status");

      setGoogleStatus({
        connected: data?.connected || false,
        email: data?.email || "",
      });
    } catch (error) {
      console.error("Google status error:", error);
      setGoogleStatus({
        connected: false,
        email: "",
      });
    }
  }, []);

  const initializePage = useCallback(async () => {
    try {
      setLoading(true);
      setGoogleLoading(true);
      await Promise.all([fetchMeetings(), fetchGoogleStatus()]);
    } catch (error) {
      console.error("Planning init error:", error);
    } finally {
      setLoading(false);
      setGoogleLoading(false);
    }
  }, [fetchGoogleStatus, fetchMeetings]);

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

      setCurrentUser(user);
      setMounted(true);
      await initializePage();
    };

    bootPage();

    return () => {
      cancelled = true;
    };
  }, [initializePage, router]);

  const connectGoogle = async () => {
    try {
      const { data } = await api.get("/google/auth-url");
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      alert("Failed to connect Google Calendar");
    }
  };

  const fetchAdminUsers = async () => {
    try {
      setTeamUsersLoading(true);

      const { data } = await api.get("/admin/users");
      const users = data?.users || data?.members || [];

      setAdminUsers(users);
    } catch (error) {
      console.error("Admin users fetch error:", error);
      setAdminUsers([]);
    } finally {
      setTeamUsersLoading(false);
    }
  };

  const localDateTimeToISO = (value) => {
    if (!value) return "";

    const localDate = new Date(value);

    if (Number.isNaN(localDate.getTime())) return "";

    return localDate.toISOString();
  };

  const handleOpenCreateModal = () => {
    const now = new Date();
    const end = new Date(now);
    end.setMinutes(end.getMinutes() + 30);

    setFormData((prev) => ({
      ...prev,
      personName: "",
      companyName: "",
      location: "",
      attendees: "",
      startTime: prev.startTime || getLocalDateTimeValue(now),
      endTime: prev.endTime || getLocalDateTimeValue(end),
    }));

    setShowForm(true);

    if (!adminUsers.length) {
      fetchAdminUsers();
    }
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setShowForm(false);
  };

  const toggleTeamUser = (email) => {
    if (!email) return;

    setSelectedTeamEmails((prev) => {
      if (prev.includes(email)) {
        return prev.filter((item) => item !== email);
      }

      return [...prev, email];
    });
  };

  const toggleSelectAllTeam = () => {
    const allEmails = adminUsers
      .map((user) => user.email)
      .filter(Boolean);

    if (!allEmails.length) return;

    if (selectedTeamEmails.length === allEmails.length) {
      setSelectedTeamEmails([]);
      return;
    }

    setSelectedTeamEmails(allEmails);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setPeriodDropdownOpen(false);
  };

  const handleMonthSelect = (monthIndex) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
    setPeriodDropdownOpen(false);
  };

  const handleWeekSelect = (weekStartDate) => {
    setCurrentDate(new Date(weekStartDate));
    setPeriodDropdownOpen(false);
  };

  const handleDaySelect = (value) => {
    if (!value) return;

    const [year, month, day] = value.split("-").map(Number);
    setCurrentDate(new Date(year, month - 1, day));
  };

  const periodLabel = useMemo(() => {
    if (viewMode === "Day") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    if (viewMode === "Week") {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      return `${formatShortDate(start)} - ${formatFullDate(end)}`;
    }

    if (viewMode === "Agenda") {
      return `${monthOptions[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    return currentDate.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate, viewMode]);

  const topbarFilterLabel = useMemo(() => {
    if (viewMode === "Day") {
      return currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    if (viewMode === "Week") {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      return `${formatShortDate(start)} - ${formatFullDate(end)}`;
    }

    return `${monthOptions[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, viewMode]);

  const weeksInCurrentMonth = useMemo(() => {
    return getWeeksInMonth(currentDate);
  }, [currentDate]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = firstDayOfMonth.getDay();
    const startDate = new Date(year, month, 1 - startDay);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      return {
        date,
        isCurrentMonth: date.getMonth() === month,
        meetings: getMeetingsForDate(meetings, date),
      };
    });
  }, [currentDate, meetings]);

  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      return {
        date,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        meetings: getMeetingsForDate(meetings, date),
      };
    });
  }, [currentDate, meetings]);

  const dayMeetings = useMemo(() => {
    return getMeetingsForDate(meetings, currentDate);
  }, [currentDate, meetings]);

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [meetings]);

  const upcomingMeetings = useMemo(() => {
    const now = new Date();

    return [...meetings]
      .filter((meeting) => new Date(meeting.startTime) >= now)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      .slice(0, 5);
  }, [meetings]);

  const notificationItems = useMemo(
    () =>
      upcomingMeetings.map((meeting) => ({
        title: meeting.title || "Untitled Meeting",
        meta: new Date(meeting.startTime).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        status: formatLabel(meeting.status),
      })),
    [upcomingMeetings]
  );

  const mobileMonthMeetingDays = useMemo(() => {
    return calendarDays.filter(
      (day) => day.isCurrentMonth && day.meetings.length
    );
  }, [calendarDays]);

  const eventLegendItems = useMemo(() => {
    const stylesByKey = new Map();

    meetings.forEach((meeting) => {
      const style = getMeetingStyle(meeting);
      stylesByKey.set(style.key, style);
    });

    return stylesByKey.size
      ? Array.from(stylesByKey.values())
      : [meetingToneStyles.upcoming];
  }, [meetings]);

  const footerYear = new Date().getFullYear();

  const goToPrev = () => {
    if (viewMode === "Day") {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(nextDate);
      return;
    }

    if (viewMode === "Week") {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(nextDate);
      return;
    }

    const nextDate = new Date(currentDate);
    nextDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(nextDate);
  };

  const goToNext = () => {
    if (viewMode === "Day") {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(nextDate);
      return;
    }

    if (viewMode === "Week") {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextDate);
      return;
    }

    const nextDate = new Date(currentDate);
    nextDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(nextDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setPeriodDropdownOpen(false);
  };

  const goHome = () => {
    router.push("/dashboard");
  };

  const handleDashboard = () => {
    router.push('/admin/dashboard');
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAndRedirect(router);
  };

  const userDisplayName =
    currentUser?.name ||
    currentUser?.username ||
    currentUser?.email ||
    "Admin User";

  const userDisplayRole = getUserRoleLabel(currentUser, "Admin");

  const userInitial = userDisplayName?.slice(0, 1)?.toUpperCase() || "U";

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "startTime") {
        const start = new Date(value);

        if (!Number.isNaN(start.getTime())) {
          const currentEnd = updated.endTime ? new Date(updated.endTime) : null;

          if (
            !currentEnd ||
            Number.isNaN(currentEnd.getTime()) ||
            currentEnd <= start
          ) {
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 30);

            updated.endTime = getLocalDateTimeValue(end);
          }
        }
      }

      return updated;
    });
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const startISO = localDateTimeToISO(formData.startTime);
      const endISO = localDateTimeToISO(formData.endTime);

      if (!startISO || !endISO) {
        alert("Please select valid meeting start and end time");
        return;
      }

      if (new Date(endISO) <= new Date(startISO)) {
        alert("End time must be after start time");
        return;
      }

      if (selectedTeamEmails.length === 0) {
        alert("Please select at least one team member");
        return;
      }

      const payload = {
        ...formData,
        meetingType: "team",
        personName: `${userDisplayRole} Team Meeting`,
        companyName: "",
        location: "",
        attendees: selectedTeamEmails,
        startTime: startISO,
        endTime: endISO,
        experienceYears: Number(formData.experienceYears || 0),
        rating: Number(formData.rating || 0),
        reviewsCount: Number(formData.reviewsCount || 0),
      };

      await api.post("/meetings", payload);

      setFormData(initialFormData);
      setSelectedTeamEmails([]);
      setShowForm(false);
      fetchMeetings();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to create meeting");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAllTeam =
    adminUsers.length > 0 &&
    selectedTeamEmails.length ===
      adminUsers.map((user) => user.email).filter(Boolean).length;

  useSetTopbar({
    title: "Planning",
    subtitle: "Schedule and manage admin planning meetings",
    children: (
      <div className="grid w-full grid-cols-1 gap-2 min-[560px]:grid-cols-[minmax(0,1fr)_48px_minmax(190px,auto)] min-[560px]:items-center lg:w-auto lg:grid-cols-[auto_48px_auto]">
        <DateFilterBox
          viewMode={viewMode}
          currentDate={currentDate}
          label={topbarFilterLabel}
          weeksInCurrentMonth={weeksInCurrentMonth}
          onMonthSelect={handleMonthSelect}
          onWeekSelect={handleWeekSelect}
          onDaySelect={handleDaySelect}
        />

        <NotificationMenu
          count={notificationItems.length}
          items={notificationItems}
        />

        <UserMenu
          userName={userDisplayName}
          userInitials={userInitial}
          userRole={userDisplayRole}
          onDashboard={handleDashboard}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </div>
    ),
  });

  if (!mounted) return null;

  return (
    <>
      <div className="md:hidden">
        <MobilePlanningView
          googleStatus={googleStatus}
          googleLoading={googleLoading}
          loading={loading}
          workspaceLabel={userDisplayRole}
          calendarSubtitle={`${userDisplayRole} calendar`}
          monthLabel={periodLabel}
          calendarDays={calendarDays}
          mobileMonthMeetingDays={mobileMonthMeetingDays}
          connectGoogle={connectGoogle}
          goHome={goHome}
          goToPrev={goToPrev}
          goToNext={goToNext}
          handleOpenCreateModal={handleOpenCreateModal}
          handleLogout={handleLogout}
          loggingOut={loggingOut}
        />

        {googleStatus.connected && showForm && (
          <MeetingModal
            formData={formData}
            adminUsers={adminUsers}
            selectedTeamEmails={selectedTeamEmails}
            selectedAllTeam={selectedAllTeam}
            teamUsersLoading={teamUsersLoading}
            handleChange={handleChange}
            toggleTeamUser={toggleTeamUser}
            toggleSelectAllTeam={toggleSelectAllTeam}
            handleCreateMeeting={handleCreateMeeting}
            submitting={submitting}
            onClose={closeCreateModal}
          />
        )}
      </div>

      <main className="hidden min-h-dvh overflow-x-hidden bg-[#fbfbfd] text-[#071033] md:block">

        <section className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 sm:py-6 md:px-6 lg:px-7 lg:py-7 xl:px-8">
          <div className="mb-4 grid gap-3 xl:mb-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={goToToday}
                  className="h-10 rounded-[8px] border border-[#e2e5ee] bg-white px-4 font-[var(--font-primary)] text-[13px] font-medium text-[#49516b] transition hover:border-[#ffb396] sm:h-[42px] sm:px-5 sm:text-[14px]"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={goToPrev}
                  className="grid h-10 w-10 place-items-center rounded-full border border-[#e2e5ee] bg-white text-[#49516b] transition hover:border-[#ffb396] sm:h-[42px] sm:w-[42px]"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={goToNext}
                  className="grid h-10 w-10 place-items-center rounded-full border border-[#e2e5ee] bg-white text-[#49516b] transition hover:border-[#ffb396] sm:h-[42px] sm:w-[42px]"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <PeriodSelector
                  viewMode={viewMode}
                  label={periodLabel}
                  currentDate={currentDate}
                  open={periodDropdownOpen}
                  setOpen={setPeriodDropdownOpen}
                  weeksInCurrentMonth={weeksInCurrentMonth}
                  onMonthSelect={handleMonthSelect}
                  onWeekSelect={handleWeekSelect}
                />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:pb-0 xl:justify-end">
              {viewOptions.map((item) => {
                const active = viewMode === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleViewModeChange(item)}
                    className={`h-10 shrink-0 rounded-[8px] border px-4 font-[var(--font-primary)] text-[13px] font-medium sm:h-[42px] sm:px-5 sm:text-[14px] ${
                      active
                        ? "border-[#ff4b0b] bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] text-white shadow-[0_10px_20px_rgba(255,75,11,0.22)]"
                        : "border-[#e2e5ee] bg-white text-[#49516b]"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}

              {googleStatus.connected ? (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] px-4 font-[var(--font-primary)] text-[13px] font-semibold text-white shadow-[0_10px_20px_rgba(255,75,11,0.22)] sm:h-[42px] sm:px-5 sm:text-[14px]"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  New Meeting
                </button>
              ) : (
                <button
                  type="button"
                  onClick={connectGoogle}
                  className="flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-[#071033] px-4 font-[var(--font-primary)] text-[13px] font-semibold text-white sm:h-[42px] sm:px-5 sm:text-[14px]"
                >
                  Connect Google
                </button>
              )}
            </div>
          </div>

          <CalendarPanel
            viewMode={viewMode}
            calendarDays={calendarDays}
            weekDays={weekDays}
            dayMeetings={dayMeetings}
            sortedMeetings={sortedMeetings}
            currentDate={currentDate}
            eventLegendItems={eventLegendItems}
            googleLoading={googleLoading}
            googleStatus={googleStatus}
            loading={loading}
            connectGoogle={connectGoogle}
          />
        </section>

        <footer className="px-3 pb-5 text-center">
          <Typo
            variant="caption"
            className="!font-medium !leading-5 !text-[#60677c]"
          >
            Copyright {footerYear} Serlex Technologies. All rights reserved.
          </Typo>
        </footer>

        {googleStatus.connected && showForm && (
          <MeetingModal
            formData={formData}
            adminUsers={adminUsers}
            selectedTeamEmails={selectedTeamEmails}
            selectedAllTeam={selectedAllTeam}
            teamUsersLoading={teamUsersLoading}
            handleChange={handleChange}
            toggleTeamUser={toggleTeamUser}
            toggleSelectAllTeam={toggleSelectAllTeam}
            handleCreateMeeting={handleCreateMeeting}
            submitting={submitting}
            onClose={closeCreateModal}
          />
        )}
      </main>
    </>
  );
}

function MobilePlanningView({
  googleStatus,
  googleLoading,
  loading,
  workspaceLabel,
  calendarSubtitle,
  monthLabel,
  calendarDays,
  mobileMonthMeetingDays,
  connectGoogle,
  goHome,
  goToPrev,
  goToNext,
  handleOpenCreateModal,
  handleLogout,
  loggingOut,
}) {
  return (
    <main className="h-screen w-full overflow-y-auto bg-[#efefef] px-1.5 py-2 min-[360px]:px-3 min-[360px]:py-3 sm:px-4 sm:py-5">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] items-center justify-center">
        <section className="w-full rounded-[18px] border border-[#e8e1e7] bg-[#f7f3f7] px-2 py-3 shadow-[0_14px_35px_rgba(0,0,0,0.08)] min-[360px]:rounded-[22px] min-[360px]:px-3 min-[360px]:py-4 sm:rounded-[28px] sm:px-5 sm:py-5">
          <div className="grid grid-cols-[40px_1fr_auto] items-center gap-2">
            <button
              type="button"
              onClick={goHome}
              aria-label="Go to home"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-[#1f2340] shadow-sm transition hover:scale-[1.04] active:scale-[0.96] sm:h-10 sm:w-10"
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <h1 className="text-center font-serif text-[30px] italic text-[#111827] sm:text-[32px]">
              <img src="/logo.jpeg" alt="Serlex" className="inline-block h-8 w-auto align-middle sm:h-9" />
            </h1>

            <Typo
              variant="body-sm"
              className="truncate text-right !text-[11px] !font-semibold !capitalize !text-[#ff4b16] sm:!text-[13px]"
            >
              {workspaceLabel}
            </Typo>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4">
            <div className="min-w-0">
              <Typo
                variant="h3"
                className="!text-[20px] !font-bold !tracking-[-0.03em] !text-[#1f2340]"
              >
                PLANNING
              </Typo>

              <Typo
                variant="caption"
                className="mt-0.5 block !text-[11px] !font-medium !text-[#7d7782]"
              >
                {calendarSubtitle}
              </Typo>
            </div>

            {googleStatus.connected ? (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#ff3d14] to-[#ff6a1c] px-3 py-2 text-[11px] font-semibold leading-tight text-white shadow-[0_10px_20px_rgba(255,90,31,0.22)] transition hover:scale-[1.01] active:scale-[0.98] sm:min-h-[46px] sm:rounded-[14px] sm:px-4 sm:text-sm"
              >
                <Plus className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span className="whitespace-nowrap">Create</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={connectGoogle}
                className="flex min-h-[42px] cursor-pointer items-center justify-center rounded-[12px] bg-[#1f2340] px-3 py-2 text-[11px] font-semibold leading-tight text-white shadow-sm transition active:scale-[0.98]"
              >
                Connect
              </button>
            )}
          </div>

          <div className="relative mt-4 overflow-hidden rounded-[16px] border border-[#ebe4ea] bg-[#f3f0f3] shadow-[0_10px_24px_rgba(0,0,0,0.05)] min-[360px]:mt-5 min-[360px]:rounded-[20px] sm:mt-6 sm:rounded-[24px]">
            <div className="flex items-center justify-between gap-2 px-2 py-2.5 min-[360px]:px-3 min-[360px]:py-3 sm:px-5 sm:py-4">
              <button
                type="button"
                onClick={goToPrev}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-[#1f2340] shadow-sm min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              <Typo
                as="h4"
                variant="h3"
                className="text-center !text-[15px] !font-bold !text-[#1f2340] min-[360px]:!text-[17px] sm:!text-[20px]"
              >
                {monthLabel}
              </Typo>

              <button
                type="button"
                onClick={goToNext}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-[#1f2340] shadow-sm min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 border-t border-[#e8e1e7]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day) => (
                  <Typo
                    key={day}
                    as="div"
                    variant="caption"
                    className="border-r border-[#e8e1e7] py-1.5 text-center !text-[8px] !font-bold uppercase tracking-wide !text-[#6b6470] last:border-r-0 min-[360px]:!text-[9px] sm:py-2 sm:!text-[11px]"
                  >
                    {day}
                  </Typo>
                )
              )}
            </div>

            <div className="relative grid grid-cols-7 border-t border-[#e8e1e7]">
              {calendarDays.map((day, index) => {
                const today = new Date();

                const isToday =
                  day.date.getDate() === today.getDate() &&
                  day.date.getMonth() === today.getMonth() &&
                  day.date.getFullYear() === today.getFullYear();

                const isLastRow = index >= 35;
                const isLastCol = (index + 1) % 7 === 0;

                return (
                  <div
                    key={index}
                    className={[
                      "min-h-[58px] min-[360px]:min-h-[68px] sm:min-h-[95px]",
                      "border-b border-r border-[#e8e1e7]",
                      isLastRow ? "border-b-0" : "",
                      isLastCol ? "border-r-0" : "",
                      day.isCurrentMonth ? "bg-white" : "bg-[#f7f3f7]",
                      "overflow-hidden p-1 sm:p-1.5",
                    ].join(" ")}
                  >
                    <div className="flex justify-start">
                      <Typo
                        as="span"
                        variant="caption"
                        className={[
                          "inline-flex h-5 w-5 items-center justify-center rounded-full !text-[10px] !font-bold min-[360px]:h-5 min-[360px]:w-5 sm:h-7 sm:w-7 sm:!text-xs",
                          isToday
                            ? "bg-[#5a67d8] !text-white"
                            : day.isCurrentMonth
                            ? "!text-[#1f2340]"
                            : "!text-[#bbb3be]",
                        ].join(" ")}
                      >
                        {day.date.getDate()}
                      </Typo>
                    </div>

                    <div className="mt-0.5 space-y-0.5 sm:mt-1 sm:space-y-1">
                      {day.meetings.slice(0, 2).map((meeting) => {
                        const style = getMeetingStyle(meeting);

                        return (
                          <Typo
                            key={
                              meeting._id ||
                              `${meeting.title}-${meeting.startTime}`
                            }
                            as="div"
                            variant="caption"
                            className={[
                              "truncate rounded-full px-1 py-[1px] !text-[7px] !font-medium min-[360px]:!text-[8px] sm:px-1.5 sm:!text-[9px]",
                              style.bg,
                              style.text,
                            ].join(" ")}
                            title={`${meeting.title} ${formatMeetingTime(
                              meeting.startTime
                            )}`}
                          >
                            {meeting.title}
                          </Typo>
                        );
                      })}

                      {day.meetings.length > 2 && (
                        <Typo
                          as="div"
                          variant="caption"
                          className="!text-[7px] !font-semibold !text-[#5a67d8] min-[360px]:!text-[8px] sm:!text-[9px]"
                        >
                          +{day.meetings.length - 2} more
                        </Typo>
                      )}
                    </div>
                  </div>
                );
              })}

              {!googleLoading && !googleStatus.connected && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-[3px]">
                  <div className="mx-2 w-full max-w-[280px] rounded-[18px] border border-[#ffd9cc] bg-white/95 p-3 text-center shadow-[0_12px_30px_rgba(0,0,0,0.08)] min-[360px]:mx-3 min-[360px]:max-w-[320px] min-[360px]:p-4 sm:rounded-[24px] sm:p-5">
                    <Typo
                      as="h5"
                      variant="h4"
                      className="!text-[15px] !font-bold !text-[#1f2340] min-[360px]:!text-[16px] sm:!text-[18px]"
                    >
                      Connect Google Calendar
                    </Typo>

                    <Typo
                      variant="caption"
                      className="mt-2 block !text-[11px] !text-[#7d7782] min-[360px]:!text-xs sm:!text-sm"
                    >
                      Connect your Google account to view calendar data and
                      create meetings.
                    </Typo>

                    <button
                      type="button"
                      onClick={connectGoogle}
                      className="mt-4 w-full cursor-pointer rounded-full bg-gradient-to-r from-[#ff3d14] to-[#ff6a1c] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(255,90,31,0.22)] min-[360px]:text-sm sm:py-3"
                    >
                      Connect with Google
                    </button>
                  </div>
                </div>
              )}

              {loading && googleStatus.connected && (
                <div className="absolute inset-0 grid place-items-center bg-white/50 backdrop-blur-[2px]">
                  <Typo
                    variant="caption"
                    className="rounded-full bg-white px-4 py-2 !font-bold !text-[#6b6470] shadow-sm"
                  >
                    Loading meetings...
                  </Typo>
                </div>
              )}
            </div>
          </div>

          {googleStatus.connected && (
            <div className="mt-4 rounded-[18px] border border-[#ebe4ea] bg-white/70 p-3 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Typo
                  variant="body-sm"
                  className="!font-bold !text-[#1f2340]"
                >
                  Meetings this month
                </Typo>

                <span className="rounded-full bg-[#fff0ea] px-2.5 py-1 text-[10px] font-bold text-[#ff4b16]">
                  {mobileMonthMeetingDays.reduce(
                    (count, day) => count + day.meetings.length,
                    0
                  )}
                </span>
              </div>

              <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {mobileMonthMeetingDays.length ? (
                  mobileMonthMeetingDays.map((day) => (
                    <div
                      key={getDateKey(day.date)}
                      className="rounded-[14px] border border-[#e8e1e7] bg-[#f7f3f7] p-2.5"
                    >
                      <Typo
                        variant="caption"
                        className="mb-2 block !font-bold !text-[#1f2340]"
                      >
                        {day.date.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Typo>

                      <div className="space-y-2">
                        {day.meetings.map((meeting) => (
                          <div
                            key={meeting._id || `${meeting.title}-${meeting.startTime}`}
                            className="rounded-[12px] bg-white px-3 py-2 shadow-sm"
                          >
                            <Typo
                              variant="body-sm"
                              className="line-clamp-1 !text-[12px] !font-bold !text-[#1f2340]"
                            >
                              {meeting.title || "Untitled Meeting"}
                            </Typo>

                            <Typo
                              variant="caption"
                              className="mt-0.5 block !text-[10px] !font-medium !text-[#7d7782]"
                            >
                              {formatMeetingTime(meeting.startTime)} -{" "}
                              {formatMeetingTime(meeting.endTime)}
                            </Typo>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[14px] border border-dashed border-[#e8e1e7] bg-white px-3 py-5 text-center">
                    <Typo
                      variant="caption"
                      className="!font-semibold !text-[#7d7782]"
                    >
                      No meetings found for this month.
                    </Typo>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-center sm:mt-10">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-11 w-full max-w-[240px] cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff3d14] to-[#ff6a1c] px-5 text-[14px] font-semibold text-white shadow-[0_12px_24px_rgba(255,90,31,0.28)] transition hover:scale-[1.01] active:scale-[0.98] sm:h-[52px] sm:max-w-[280px] sm:px-6 sm:text-[16px]"
            >
              <Power className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}





function PeriodSelector({
  viewMode,
  label,
  currentDate,
  open,
  setOpen,
  weeksInCurrentMonth,
  onMonthSelect,
  onWeekSelect,
}) {
  const disabled = viewMode === "Day";

  return (
    <div className="relative min-w-0 sm:ml-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`flex max-w-full min-w-0 items-center gap-2 rounded-[10px] px-1 py-1 text-left transition ${
          disabled ? "cursor-not-allowed opacity-80" : "hover:bg-white"
        }`}
      >
        <Typo
          as="h2"
          variant="h3"
          className="max-w-[170px] truncate !text-[18px] !font-bold !tracking-[-0.03em] !text-[#071033] min-[360px]:max-w-[210px] min-[360px]:!text-[20px] sm:max-w-[320px] sm:!text-[24px] lg:max-w-[420px] lg:!text-[26px]"
        >
          {label}
        </Typo>

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#49516b] transition ${
            open ? "rotate-180" : ""
          } ${disabled ? "opacity-30" : ""}`}
        />
      </button>

      {open && !disabled && (
        <>
          <button
            type="button"
            aria-label="Close period dropdown"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />

          <div className="absolute left-0 z-50 mt-2 w-[210px] overflow-hidden rounded-[12px] border border-[#e3e6ee] bg-white p-2 shadow-[0_14px_35px_rgba(15,23,42,0.12)] min-[360px]:w-[235px]">
            {(viewMode === "Month" || viewMode === "Agenda") && (
              <div className="grid grid-cols-2 gap-1">
                {monthOptions.map((month, index) => {
                  const active = currentDate.getMonth() === index;

                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => onMonthSelect(index)}
                      className={`rounded-[9px] px-3 py-2 text-left transition ${
                        active
                          ? "bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] text-white"
                          : "text-[#49516b] hover:bg-[#fff3ee] hover:text-[#ff4b0b]"
                      }`}
                    >
                      <Typo
                        as="span"
                        variant="caption"
                        className={`!font-semibold ${
                          active ? "!text-white" : "!text-[#49516b]"
                        }`}
                      >
                        {month.slice(0, 3)}
                      </Typo>
                    </button>
                  );
                })}
              </div>
            )}

            {viewMode === "Week" && (
              <div className="space-y-1">
                {weeksInCurrentMonth.map((week, index) => {
                  const currentWeekStart = getWeekStart(currentDate);
                  const active = isSameDate(currentWeekStart, week.start);

                  return (
                    <button
                      key={`${week.label}-${index}`}
                      type="button"
                      onClick={() => onWeekSelect(week.start)}
                      className={`flex w-full items-center justify-between rounded-[9px] px-3 py-2 text-left transition ${
                        active
                          ? "bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] text-white"
                          : "text-[#49516b] hover:bg-[#fff3ee] hover:text-[#ff4b0b]"
                      }`}
                    >
                      <div>
                        <Typo
                          as="span"
                          variant="body-sm"
                          className={`block !font-semibold ${
                            active ? "!text-white" : "!text-[#49516b]"
                          }`}
                        >
                          {week.label}
                        </Typo>

                        <Typo
                          as="span"
                          variant="caption"
                          className={`block ${
                            active ? "!text-white/90" : "!text-[#7b8295]"
                          }`}
                        >
                          {formatShortDate(week.start)} -{" "}
                          {formatShortDate(week.end)}
                        </Typo>
                      </div>

                      {active && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DateFilterBox({
  viewMode,
  currentDate,
  label,
  weeksInCurrentMonth,
  onMonthSelect,
  onWeekSelect,
  onDaySelect,
}) {
  const [open, setOpen] = useState(false);

  const dayValue = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="relative w-full min-w-0 min-[560px]:w-auto">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full min-w-0 items-center gap-2 rounded-[10px] border border-[#dfe2eb] bg-white px-3 shadow-sm transition hover:border-[#ffb396] sm:gap-3 sm:px-4 lg:w-[318px]"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-[#596179] sm:h-5 sm:w-5" />

        <Typo
          as="span"
          variant="body-sm"
          className="min-w-0 flex-1 truncate text-left !text-[12px] !font-semibold !text-[#111936] min-[360px]:!text-[13px]"
        >
          {label}
        </Typo>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#596179] transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close date filter"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />

          <div className="absolute left-0 right-0 z-50 mt-2 rounded-[12px] border border-[#e3e6ee] bg-white p-3 shadow-[0_14px_35px_rgba(15,23,42,0.12)] min-[420px]:left-auto min-[420px]:right-0 min-[420px]:w-[320px]">
            {(viewMode === "Month" || viewMode === "Agenda") && (
              <div>
                <Typo
                  variant="caption"
                  className="mb-2 block !font-bold !text-[#626a82]"
                >
                  Select Month
                </Typo>

                <div className="grid grid-cols-2 gap-2">
                  {monthOptions.map((month, index) => {
                    const active = currentDate.getMonth() === index;

                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => {
                          onMonthSelect(index);
                          setOpen(false);
                        }}
                        className={`rounded-[9px] px-3 py-2 text-left transition ${
                          active
                            ? "bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] text-white"
                            : "bg-[#fbfbfd] text-[#49516b] hover:bg-[#fff3ee] hover:text-[#ff4b0b]"
                        }`}
                      >
                        <Typo
                          variant="caption"
                          className={`!font-semibold ${
                            active ? "!text-white" : "!text-[#49516b]"
                          }`}
                        >
                          {month}
                        </Typo>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === "Week" && (
              <div>
                <Typo
                  variant="caption"
                  className="mb-2 block !font-bold !text-[#626a82]"
                >
                  Select Week
                </Typo>

                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {weeksInCurrentMonth.map((week, index) => {
                    const currentWeekStart = getWeekStart(currentDate);
                    const active = isSameDate(currentWeekStart, week.start);

                    return (
                      <button
                        key={`${week.label}-topbar-${index}`}
                        type="button"
                        onClick={() => {
                          onWeekSelect(week.start);
                          setOpen(false);
                        }}
                        className={`w-full rounded-[9px] px-3 py-2 text-left transition ${
                          active
                            ? "bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] text-white"
                            : "bg-[#fbfbfd] text-[#49516b] hover:bg-[#fff3ee] hover:text-[#ff4b0b]"
                        }`}
                      >
                        <Typo
                          variant="body-sm"
                          className={`!font-semibold ${
                            active ? "!text-white" : "!text-[#49516b]"
                          }`}
                        >
                          {week.label}
                        </Typo>

                        <Typo
                          variant="caption"
                          className={`mt-0.5 block ${
                            active ? "!text-white/90" : "!text-[#7b8295]"
                          }`}
                        >
                          {formatShortDate(week.start)} -{" "}
                          {formatShortDate(week.end)}
                        </Typo>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === "Day" && (
              <div>
                <Typo
                  variant="caption"
                  className="mb-2 block !font-bold !text-[#626a82]"
                >
                  Select Date
                </Typo>

                <input
                  type="date"
                  value={dayValue}
                  onChange={(e) => onDaySelect(e.target.value)}
                  className="h-10 w-full rounded-[9px] border border-[#dfe2eb] px-3 font-[var(--font-primary)] text-[13px] text-[#111936] outline-none focus:border-[#ff4b0b]"
                />

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-3 h-9 w-full rounded-[9px] bg-[#ff4b0b] font-[var(--font-primary)] text-[13px] font-bold text-white"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CalendarPanel({
  viewMode,
  calendarDays,
  weekDays,
  dayMeetings,
  sortedMeetings,
  currentDate,
  eventLegendItems,
  googleLoading,
  googleStatus,
  loading,
  connectGoogle,
}) {
  return (
    <div className="relative overflow-hidden rounded-[12px] border border-[#e3e6ee] bg-white shadow-[0_14px_35px_rgba(15,23,42,0.045)]">
      {viewMode === "Month" && (
        <MonthView
          calendarDays={calendarDays}
          eventLegendItems={eventLegendItems}
        />
      )}

      {viewMode === "Week" && (
        <WeekView weekDays={weekDays} eventLegendItems={eventLegendItems} />
      )}

      {viewMode === "Day" && (
        <DayView currentDate={currentDate} meetings={dayMeetings} />
      )}

      {viewMode === "Agenda" && <AgendaView meetings={sortedMeetings} />}

      {!googleLoading && !googleStatus.connected && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/55 px-3 backdrop-blur-[3px]">
          <div className="w-full max-w-[360px] rounded-[18px] border border-[#ffd9cc] bg-white p-4 text-center shadow-[0_14px_35px_rgba(15,23,42,0.12)] sm:p-5">
            <Typo
              as="h3"
              variant="h3"
              className="!text-[18px] !font-bold !text-[#071033] sm:!text-[20px]"
            >
              Connect Google Calendar
            </Typo>

            <Typo
              variant="body-sm"
              className="mt-2 !leading-6 !text-[#626a82]"
            >
              Connect your Google account to view calendar data and create
              meetings.
            </Typo>

            <button
              type="button"
              onClick={connectGoogle}
              className="mt-5 h-[44px] w-full rounded-[10px] bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] font-[var(--font-primary)] text-[14px] font-bold text-white"
            >
              Connect with Google
            </button>
          </div>
        </div>
      )}

      {loading && googleStatus.connected && (
        <div className="absolute inset-0 grid place-items-center bg-white/50">
          <Typo variant="body-sm" className="!font-bold !text-[#626a82]">
            Loading meetings...
          </Typo>
        </div>
      )}
    </div>
  );
}

function MonthView({ calendarDays, eventLegendItems }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[880px] xl:min-w-0">
        <CalendarHeader />

        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <CalendarCell key={index} day={day} />
          ))}
        </div>

        <EventLegend items={eventLegendItems} />
      </div>
    </div>
  );
}

function WeekView({ weekDays, eventLegendItems }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[880px] xl:min-w-0">
        <CalendarHeader />

        <div className="grid grid-cols-7">
          {weekDays.map((day, index) => (
            <CalendarCell key={index} day={day} isWeekView />
          ))}
        </div>

        <EventLegend items={eventLegendItems} />
      </div>
    </div>
  );
}

function DayView({ currentDate, meetings }) {
  return (
    <div className="min-h-[420px] p-3 sm:p-5">
      <div className="rounded-[14px] border border-[#e3e6ee] bg-[#fbfbfd] p-4 sm:p-5">
        <Typo
          as="h3"
          variant="h3"
          className="!text-[18px] !font-bold !text-[#071033] sm:!text-[22px]"
        >
          {currentDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </Typo>

        <Typo variant="body-sm" className="mt-1 !text-[#626a82]">
          {meetings.length} meeting{meetings.length === 1 ? "" : "s"} scheduled
        </Typo>
      </div>

      <div className="mt-4 space-y-3">
        {meetings.length === 0 ? (
          <EmptyState text="No meetings scheduled for this day." />
        ) : (
          meetings.map((meeting, index) => (
            <MeetingListCard
              key={meeting._id || `${meeting.title}-${index}`}
              meeting={meeting}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AgendaView({ meetings }) {
  return (
    <div className="min-h-[420px] p-3 sm:p-5">
      <div className="space-y-3">
        {meetings.length === 0 ? (
          <EmptyState text="No meetings available." />
        ) : (
          meetings.map((meeting, index) => (
            <MeetingListCard
              key={meeting._id || `${meeting.title}-${index}`}
              meeting={meeting}
              showDate
            />
          ))
        )}
      </div>
    </div>
  );
}

function CalendarHeader() {
  return (
    <div className="grid grid-cols-7 border-b border-[#e3e6ee]">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div
          key={day}
          className="flex h-[46px] items-center justify-center border-r border-[#e3e6ee] last:border-r-0 sm:h-[48px]"
        >
          <Typo
            as="span"
            variant="body-sm"
            className="!font-bold !text-[#071033]"
          >
            {day}
          </Typo>
        </div>
      ))}
    </div>
  );
}

function CalendarCell({ day, isWeekView = false }) {
  const today = new Date();
  const isToday = isSameDate(day.date, today);

  return (
    <div
      className={`border-r border-b border-[#e3e6ee] p-2 last:border-r-0 sm:p-3 ${
        isWeekView
          ? "min-h-[230px] sm:min-h-[260px] lg:min-h-[340px]"
          : "min-h-[150px] xl:min-h-[165px]"
      }`}
    >
      <div
        className={`mb-2 grid h-[28px] w-[28px] place-items-center rounded-full font-[var(--font-primary)] text-[13px] font-bold sm:mb-3 sm:text-[15px] ${
          isToday
            ? "bg-[#0b83ff] text-white"
            : day.isCurrentMonth
            ? "text-[#071033]"
            : "text-[#aeb4c1]"
        }`}
      >
        {day.date.getDate()}
      </div>

      <div className="space-y-2">
        {day.meetings.slice(0, isWeekView ? 4 : 2).map((meeting, idx) => {
          const style = getMeetingStyle(meeting);

          return (
            <MeetingChip
              key={meeting._id || `${meeting.title}-${idx}`}
              meeting={meeting}
              style={style}
            />
          );
        })}

        {day.meetings.length > (isWeekView ? 4 : 2) && (
          <Typo variant="caption" className="!font-bold !text-[#ff4b0b]">
            +{day.meetings.length - (isWeekView ? 4 : 2)} more
          </Typo>
        )}
      </div>
    </div>
  );
}

function MeetingChip({ meeting, style }) {
  return (
    <div className={`rounded-[5px] px-2 py-2 sm:px-3 ${style.bg} ${style.text}`}>
      <Typo
        variant="caption"
        className="line-clamp-2 !text-[12px] !font-bold !leading-[1.45] xl:!text-[13px]"
      >
        {meeting.title}
      </Typo>

      <Typo variant="body" className="mt-1 !text-[11px] xl:!text-[12px]">
        {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
      </Typo>
    </div>
  );
}

function MeetingListCard({ meeting, showDate = false }) {
  const style = getMeetingStyle(meeting);

  return (
    <div className="rounded-[14px] border border-[#e3e6ee] bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] min-[360px]:p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-3 w-3 shrink-0 rounded-[4px] ${style.dot}`} />

        <div className="min-w-0 flex-1">
          <Typo
            as="h4"
            variant="body"
            className="line-clamp-2 !text-[13px] !font-bold !leading-snug !text-[#071033] min-[360px]:!text-[14px]"
          >
            {meeting.title || "Untitled Meeting"}
          </Typo>

          <Typo
            variant="body-sm"
            className="mt-1 !text-[12px] !font-medium !text-[#626a82] min-[360px]:!text-[13px]"
          >
            {showDate &&
              `${new Date(meeting.startTime).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })} • `}
            {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
          </Typo>

          {(meeting.companyName || meeting.personName || meeting.location) && (
            <Typo
              variant="caption"
              className="mt-2 line-clamp-2 !text-[11px] !leading-5 !text-[#687089] min-[360px]:!text-[12px]"
            >
              {[meeting.personName, meeting.companyName, meeting.location]
                .filter(Boolean)
                .join(" • ")}
            </Typo>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[#dfe2eb] bg-white p-5 text-center sm:p-6">
      <Typo variant="body-sm" className="!font-medium !text-[#626a82]">
        {text}
      </Typo>
    </div>
  );
}

function EventLegend({ items }) {
  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-x-5 gap-y-2 px-3 py-3 sm:gap-x-8">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span className={`h-3 w-3 shrink-0 rounded-[3px] ${item.dot}`} />

          <Typo
            as="span"
            variant="caption"
            className="!font-medium !text-[#596179]"
          >
            {item.label}
          </Typo>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children, required = false }) {
  return (
    <label className="block">
      <Typo
        as="span"
        variant="caption"
        className="mb-1.5 block !font-bold !text-[#4b5368]"
      >
        {label} {required && <span className="text-[#ff4b0b]">*</span>}
      </Typo>

      {children}
    </label>
  );
}

function MeetingModal({
  formData,
  adminUsers,
  selectedTeamEmails,
  selectedAllTeam,
  teamUsersLoading,
  handleChange,
  toggleTeamUser,
  toggleSelectAllTeam,
  handleCreateMeeting,
  submitting,
  onClose,
}) {
  const inputClass =
    "w-full rounded-[14px] border border-[#e6dde4] bg-[#fff7fb] px-3 py-2.5 font-[var(--font-primary)] text-sm text-[#1f2340] placeholder:text-[#a196a2] outline-none focus:border-[#ff5a1f] focus:bg-white focus:ring-4 focus:ring-[#ff5a1f]/10 sm:rounded-[18px] sm:px-4 sm:py-3 sm:text-base md:border-[#e3e6ee] md:bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-2 py-3 min-[360px]:px-3 min-[360px]:py-4 sm:items-center sm:px-4">
      <div className="relative max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-[18px] border border-[#ebe4ea] bg-[#f3f0f3] p-3 shadow-[0_10px_24px_rgba(0,0,0,0.15)] sm:rounded-[28px] sm:p-6 md:max-w-2xl md:bg-white md:p-5">
        <div className="sticky top-0 z-10 mb-3 flex items-center justify-between bg-[#f3f0f3] pb-2 sm:mb-4 md:bg-white">
          <Typo
            as="h4"
            variant="h4"
            className="!text-[17px] !font-bold !text-[#1f2340] sm:!text-[20px]"
          >
            Create Team Meeting
          </Typo>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-[#1f2340] shadow-sm disabled:opacity-60 sm:h-10 sm:w-10 md:bg-[#f3f4f7]"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <form onSubmit={handleCreateMeeting} className="space-y-3 sm:space-y-4">
          <Field label="Meeting Title" required>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter meeting topic"
              className={inputClass}
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Write meeting agenda"
              rows={3}
              className={inputClass}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <Field label="Start Time" required>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </Field>

            <Field label="End Time" required>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                min={formData.startTime || undefined}
                className={inputClass}
                required
              />
            </Field>
          </div>

          <div className="space-y-2 rounded-[18px] border border-[#e6dde4] bg-white/60 p-3 md:bg-[#fbfbfd]">
            <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[#fff7fb] px-3 py-2 md:bg-white">
              <div>
                <p className="text-xs font-semibold text-[#1f2340] sm:text-sm">
                  Team Members
                </p>

                <p className="text-[10px] text-[#7d7782] sm:text-xs">
                  {selectedTeamEmails.length} selected
                </p>
              </div>

              <button
                type="button"
                onClick={toggleSelectAllTeam}
                disabled={!adminUsers.length}
                className="cursor-pointer rounded-full bg-[#ff5a1f] px-3 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
              >
                {selectedAllTeam ? "Unselect All" : "Select All"}
              </button>
            </div>

            <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
              {teamUsersLoading ? (
                <div className="rounded-[14px] bg-white px-3 py-3 text-center text-xs font-medium text-[#7d7782]">
                  Loading team members...
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="rounded-[14px] bg-white px-3 py-3 text-center text-xs font-medium text-[#7d7782]">
                  No team member found
                </div>
              ) : (
                adminUsers.map((user) => {
                  const checked = selectedTeamEmails.includes(user.email);

                  return (
                    <label
                      key={user._id || user.email}
                      className={[
                        "flex cursor-pointer items-start gap-3 rounded-[14px] border px-3 py-2.5 transition",
                        checked
                          ? "border-[#ff5a1f] bg-[#fff0ea]"
                          : "border-[#e6dde4] bg-white",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeamUser(user.email)}
                        className="mt-1 h-4 w-4 cursor-pointer accent-[#ff5a1f]"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-[#1f2340] sm:text-sm">
                          {user.name || user.username || "User"}
                        </span>

                        <span className="block truncate text-[10px] text-[#7d7782] sm:text-xs">
                          {user.email}
                        </span>

                        <span className="mt-1 inline-flex rounded-full bg-[#f3f0f3] px-2 py-0.5 text-[9px] font-semibold text-[#6b6470] sm:text-[10px]">
                          {getUserRoleLabel(user)}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <Field label="Meeting Status">
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff3d14] to-[#ff6a1c] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(255,90,31,0.22)] transition hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            {submitting ? "Creating..." : "Create Meeting"}
          </button>
        </form>
      </div>
    </div>
  );
}
