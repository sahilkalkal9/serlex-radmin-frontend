"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  CalendarDays,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import Typo from "@/components/ui/typo";
import { logoutAndRedirect } from "@/utils/session";

export const SIDEBAR_FULL_WIDTH = "220px";
export const SIDEBAR_COLLAPSED_WIDTH = "72px";

const sidebarConfigs = {
  admin: {
    logoHref: "/dashboard",
    useSolidActive: false,
    menuItems: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Planning", href: "/planning", icon: CalendarDays },
      { title: "Activity Tracker", href: "/activity-tracker", icon: Activity },
      { title: "Reports", href: "/reports", icon: FileText },
      { title: "Team Management", href: "/user-management", icon: Users },
      { title: "Team Allocation", href: "/user-allocation", icon: Users },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
};

export default function AdminSidebar({
  role = "admin",
  collapsed = false,
  onToggleSidebar,
  topOffset = 0,
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const config = sidebarConfigs[role] || sidebarConfigs.admin;
  const { logoHref, useSolidActive, menuItems } = config;

  const closeMobileSidebar = () => setMobileOpen(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setMobileOpen(false);

    try {
      await logoutAndRedirect(router);
    } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (item) => {
    if (item.href === logoHref) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5e7ef] bg-white text-[#06143a] shadow-sm transition hover:bg-[#fff3ee] hover:text-[#ff4b0b] lg:hidden"
        style={{ top: `${topOffset + 12}px` }}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] lg:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed left-0 z-50 flex flex-col border-r border-[#e5e7ef] bg-white transition-transform duration-300 lg:hidden w-[min(82vw,290px)] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ top: `${topOffset}px`, height: `calc(100dvh - ${topOffset}px)` }}
      >
        <SidebarContent
          menuItems={menuItems}
          logoHref={logoHref}
          useSolidActive={useSolidActive}
          isActive={isActive}
          onNavigate={closeMobileSidebar}
          onLogout={handleLogout}
          loggingOut={loggingOut}
          collapsed={false}
          mobile
          showCloseButton
          onClose={closeMobileSidebar}
        />
      </aside>

      <aside
        className={`fixed left-0 z-40 hidden flex-col border-r border-[#e5e7ef] bg-white transition-[width] duration-300 lg:flex ${
          collapsed ? "w-[72px]" : "w-[220px]"
        }`}
        style={{ top: `${topOffset}px`, height: `calc(100dvh - ${topOffset}px)` }}
      >
        <SidebarContent
          menuItems={menuItems}
          logoHref={logoHref}
          useSolidActive={useSolidActive}
          isActive={isActive}
          onNavigate={() => {}}
          onLogout={handleLogout}
          loggingOut={loggingOut}
          collapsed={collapsed}
          onToggleSidebar={onToggleSidebar}
        />
      </aside>
    </>
  );
}

function SidebarContent({
  menuItems,
  logoHref,
  useSolidActive,
  isActive,
  onNavigate,
  onLogout,
  loggingOut = false,
  collapsed = false,
  mobile = false,
  showCloseButton = false,
  onClose,
  onToggleSidebar,
}) {
  return (
    <>
      <div
        className={`flex shrink-0 items-center border-b border-[#e5e7ef] transition-all duration-300 ${
          mobile
            ? "h-[76px] justify-between px-5"
            : collapsed
              ? "h-[76px] justify-center px-3"
              : "h-[88px] justify-between px-5"
        }`}
      >
        {(!collapsed || mobile) && (
          <Link
            href={logoHref}
            onClick={onNavigate}
            className="flex min-w-0 items-center gap-3"
          >
            <img src="/logo.jpeg" alt="Serlex" className="inline-block h-8 w-auto align-middle sm:h-9" />
          </Link>
        )}

        {mobile && showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#111936] transition hover:bg-[#fff3ee] hover:text-[#ff4b0b]"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e5e7ef] bg-white text-[#06143a] shadow-sm transition hover:bg-[#fff3ee] hover:text-[#ff4b0b] lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-5 lg:pt-8">
          <div className="space-y-2 lg:space-y-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  onClick={onNavigate}
                  className={`group flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 py-3 transition ${
                    collapsed && !mobile ? "justify-center" : "justify-start"
                  } ${
                    active
                      ? useSolidActive
                        ? "bg-[#ff4b0b] text-white shadow-[0_12px_22px_rgba(255,75,11,0.22)]"
                        : "bg-gradient-to-r from-[#ff3b0d] to-[#ff6a18] text-white shadow-[0_12px_22px_rgba(255,75,11,0.22)]"
                      : "text-[#111936] hover:bg-[#fff3ee] hover:text-[#ff4b0b]"
                  }`}
                >
                  <Icon className="h-[21px] w-[21px] shrink-0" />

                  {(!collapsed || mobile) && (
                    <Typo
                      as="span"
                      variant="body-sm"
                      className={`truncate !font-semibold !leading-snug ${
                        active
                          ? "!text-white"
                          : "!text-[#111936] group-hover:!text-[#ff4b0b]"
                      }`}
                    >
                      {item.title}
                    </Typo>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[#f0f1f5] p-2">
          {collapsed && !mobile ? (
            <button
              type="button"
              title="Contact Support"
              className="flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#fff3ee] text-[#ff4b0b] transition hover:bg-[#ff4b0b] hover:text-white"
            >
              <Headphones className="h-5 w-5 shrink-0" />
            </button>
          ) : (
            <div className="p-2">
              <div className="rounded-[14px] bg-[#fff3ee] p-5">
                <div className="flex items-center gap-3">
                  <Headphones className="h-6 w-6 shrink-0 text-[#ff4b0b]" />

                  <Typo
                    as="h3"
                    variant="body"
                    className="!font-bold !text-[#071033] sm:!text-[16px]"
                  >
                    Need Help?
                  </Typo>
                </div>

                <Typo
                  variant="caption"
                  className="mt-3 max-w-[180px] !font-medium !leading-[1.6] !text-[#2f3650]"
                >
                  Contact support team for assistance
                </Typo>

                <button
                  type="button"
                  className="mt-5 h-[40px] w-full rounded-full border border-[#ffd5c4] bg-white font-[var(--font-primary)] text-[13px] font-bold text-[#ff4b0b] transition hover:bg-[#ff4b0b] hover:text-white"
                >
                  Contact Support
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#f0f1f5] px-2 py-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            title="Logout"
            className={`group flex h-[44px] w-full items-center gap-3 rounded-[10px] border border-[#ffe1d6] bg-white px-3 font-[var(--font-primary)] text-[13px] font-bold text-[#ff4b0b] transition hover:bg-[#ff4b0b] hover:text-white disabled:cursor-not-allowed disabled:opacity-70 ${
              collapsed && !mobile ? "justify-center" : "justify-start"
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />

            {(!collapsed || mobile) && (
              <Typo
                as="span"
                variant="body-sm"
                className="!font-bold !text-[#ff4b0b] group-hover:!text-white"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </Typo>
            )}
          </button>
        </div>
      </div>
    </>
  );
}