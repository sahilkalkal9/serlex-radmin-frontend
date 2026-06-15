"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  FileText,
  FileX2,
  Loader2,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";

import Typo from "@/components/ui/typo";
import DateRangePicker from "@/components/ui/DateRangePicker";
import NotificationMenu from "@/components/NotificationMenu";
import UserMenu from "@/components/UserMenu";
import api from "@/utils/api";
import { useSetTopbar } from "@/contexts/TopbarContext";
import { getStoredUser } from "@/utils/roleRedirect";
import { logoutAndRedirect } from "@/utils/session";

const statCards = [
  {
    id: "todayAttendance",
    title: "Attendance",
    label: "Present / Total",
    icon: UserCheck,
    tint: "green",
    href: "/reports/attendance",
  },
  {
    id: "meetingsScheduled",
    title: "Meetings",
    label: "Scheduled",
    icon: CalendarDays,
    tint: "blue",
    href: "/reports/meetings",
  },
  {
    id: "currentMonthPOs",
    title: "POs",
    label: "Current Month",
    icon: FileX2,
    tint: "red",
    href: "/reports/po",
  },
];

const actionCards = [
  {
    title: "Planning",
    icon: CalendarDays,
    href: "/planning",
    tint: "orange",
  },
  {
    title: "Activity Tracker",
    icon: Activity,
    href: "/activity-tracker",
    tint: "purple",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/reports",
    tint: "green",
  },
  {
    title: "Team Management",
    icon: Users,
    href: "/user-management",
    tint: "blue",
  },
  {
    title: "Team Allocation",
    icon: Users,
    href: "/user-allocation",
    tint: "teal",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    tint: "slate",
  },
];

function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    fromDate: from.toLocaleDateString("en-CA"),
    toDate: to.toLocaleDateString("en-CA"),
  };
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const defaultRange = useMemo(() => getDefaultDateRange(), []);

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    meetingsScheduled: 0,
    meetingsConfirmed: 0,
    meetingsPending: 0,
    currentMonthPOs: 0,
    todayAttendance: { present: 0, partial: 0, absent: 0, total: 0 },
  });
  const [notifications, setNotifications] = useState([]);
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [appliedFromDate, setAppliedFromDate] = useState(defaultRange.fromDate);
  const [appliedToDate, setAppliedToDate] = useState(defaultRange.toDate);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/admin/dashboard", {
        params: {
          fromDate: appliedFromDate || undefined,
          toDate: appliedToDate || undefined,
        },
      });

      const newStats = data?.stats || {};
      setStats((prev) => ({
        ...prev,
        meetingsScheduled: newStats.meetingsScheduled ?? 0,
        meetingsConfirmed: newStats.meetingsConfirmed ?? 0,
        meetingsPending: newStats.meetingsPending ?? 0,
        currentMonthPOs: newStats.currentMonthPOs ?? 0,
        activeEmployees: newStats.activeEmployees ?? 0,
        todayAttendance: newStats.todayAttendance || { present: 0, partial: 0, absent: 0, total: 0 },
      }));
      setNotifications(data?.notifications || []);
    } catch (error) {
      console.error("Admin dashboard fetch error:", error);
      setStats({
        meetingsScheduled: 0,
        meetingsConfirmed: 0,
        meetingsPending: 0,
        currentMonthPOs: 0,
        activeEmployees: 0,
      });
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFromDate, appliedToDate]);

  useEffect(() => {
    const initializeDashboard = async () => {
      setCurrentUser(getStoredUser());
    };

    initializeDashboard();
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      await fetchDashboard();
    };

    loadDashboard();
  }, [fetchDashboard]);

  const userName = getUserName(currentUser);
  const userInitials = getInitials(userName);
  const notificationCount = notifications.length;

  const handleApplyDateFilter = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  useEffect(() => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  }, [fromDate, toDate]);

  const handleResetDateFilter = () => {
    const range = getDefaultDateRange();
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setAppliedFromDate(range.fromDate);
    setAppliedToDate(range.toDate);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutAndRedirect(router);
  };

  const topbarChildren = useMemo(() => (
    <div className="grid w-full grid-cols-1 gap-2 min-[520px]:grid-cols-[minmax(0,1fr)_48px_minmax(172px,auto)] min-[900px]:w-auto min-[900px]:grid-cols-[auto_48px_auto]">
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
        count={notificationCount}
        items={notifications}
      />

      <UserMenu
        userName={userName}
        userInitials={userInitials}
        appliedFromDate={appliedFromDate}
        appliedToDate={appliedToDate}
        onDashboard={() => router.push('/admin/dashboard')}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
    </div>
  ), [
    fromDate, toDate, appliedFromDate, appliedToDate,
    notificationCount, notifications,
    userName, userInitials, loggingOut, router,
  ]);

  useSetTopbar({
    title: "Admin Dashboard",
    subtitle: "Manage planning, tracking and reports",
    children: topbarChildren,
  });

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#fbfbfd] text-[#08104a]">

      <section className="mx-auto w-full max-w-[1780px] px-3 py-4 min-[360px]:px-4 sm:px-5 lg:px-6 xl:px-7 xl:py-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <StatCard
              key={card.id}
              {...card}
              value={card.id === "todayAttendance" ? `${stats.todayAttendance.present} / ${stats.todayAttendance.total}` : stats[card.id]}
              loading={loading}
              onOpen={() => router.push(card.href || "#")}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:mt-7 xl:gap-5">
          {actionCards.map((card) => (
            <ActionCard
              key={card.title}
              {...card}
              onOpen={() => router.push(card.href)}
            />
          ))}
        </div>

        <footer className="px-3 pb-2 pt-8 text-center xl:pt-10">
          <Typo
            variant="caption"
            className="!text-[11px] !font-medium !text-[#526094]"
          >
            Copyright 2024 Serlex Technologies. All rights reserved.
          </Typo>
        </footer>
      </section>
    </main>
  );
}

function StatCard({ title, label, icon: Icon, value, tint, loading, href, onOpen }) {
  const styles = {
    blue: {
      circle: "bg-[#eaf3ff] text-[#1c7bf2]",
      badge: "bg-[#eaf3ff] text-[#1c7bf2]",
    },
    green: {
      circle: "bg-[#e8f8ef] text-[#18b66c]",
      badge: "bg-[#dcf8e9] text-[#18b66c]",
    },
    orange: {
      circle: "bg-[#fff0e5] text-[#ff912d]",
      badge: "bg-[#fff0e5] text-[#ff912d]",
    },
    red: {
      circle: "bg-[#ffe9e8] text-[#ff3d35]",
      badge: "bg-[#ffe9e8] text-[#ff3d35]",
    },
    purple: {
      circle: "bg-[#f1ddff] text-[#8b39f2]",
      badge: "bg-[#f1ddff] text-[#8b39f2]",
    },
  };

  const selected = styles[tint] || styles.blue;
  const Tag = href ? "a" : "article";
  const extraProps = href ? { href, onClick: (e) => { e.preventDefault(); onOpen?.(); } } : {};

  return (
    <Tag {...extraProps} className={`relative min-h-[118px] rounded-[8px] border border-[#e8ebf2] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.035)] min-[360px]:p-5 xl:min-h-[132px] ${href ? "cursor-pointer transition hover:-translate-y-0.5 hover:border-[#ffb396]" : ""}`}>
      <div className="flex items-start gap-3">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full xl:h-14 xl:w-14 ${selected.circle}`}
        >
          <Icon className="h-6 w-6 xl:h-7 xl:w-7" />
        </span>

        <div className="min-w-0 pt-1">
          <Typo
            variant="caption"
            className="block !text-[10px] !font-bold !leading-4 !text-[#10145a]"
          >
            {title}
          </Typo>
          <Typo
            variant="caption"
            className="block !text-[10px] !font-bold !leading-4 !text-[#10145a]"
          >
            {label}
          </Typo>

          <Typo
            as="span"
            variant="h2"
            className="mt-3 block !text-[25px] !font-bold !leading-none !text-[#0a0c60] xl:!text-[28px]"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#ff4b0b]" />
            ) : (
              value || 0
            )}
          </Typo>
        </div>
      </div>

    </Tag>
  );
}

function ActionCard({ title, icon: Icon, tint, onOpen }) {
  const styles = {
    orange: { circle: "bg-[#ffede3] text-[#ff4b0b]", arrow: "text-[#ff4b0b]" },
    purple: { circle: "bg-[#f1ddff] text-[#8b39f2]", arrow: "text-[#8b39f2]" },
    green: { circle: "bg-[#ddf5e9] text-[#12a95f]", arrow: "text-[#12a95f]" },
    blue: { circle: "bg-[#e4f1ff] text-[#1d86f5]", arrow: "text-[#1d86f5]" },
    teal: { circle: "bg-[#ddf8f8] text-[#10a7a7]", arrow: "text-[#10a7a7]" },
    slate: { circle: "bg-[#f0f1f5] text-[#556391]", arrow: "text-[#556391]" },
  };

  const selected = styles[tint] || styles.orange;

  return (
    <article className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[8px] border border-[#e8ebf2] bg-white px-5 py-7 text-center shadow-[0_12px_30px_rgba(15,23,42,0.035)] transition hover:border-[#ff4b0b] sm:py-8" onClick={onOpen}>
      <span className={`grid h-20 w-20 place-items-center rounded-full ${selected.circle}`}>
        <Icon className="h-10 w-10" />
      </span>

      <Typo as="h3" variant="h3" className="mt-5 !text-[15px] !font-black !text-[#080958]">
        {title}
      </Typo>

      <ChevronDown className={`mt-4 h-5 w-5 -rotate-90 ${selected.arrow}`} />
    </article>
  );
}


