"use client";

import { Bell, ChevronDown, Home, LogOut } from "lucide-react";
import Typo from "@/components/ui/typo";

export default function AdminTopbar({
  title,
  subtitle,
  breadcrumb,
  leading,
  actions,
  children,
  sidebarCollapsed,
}) {
  return (
    <header className={`admin-topbar sticky top-0 z-30 border-b border-[#e5e7ef] bg-white/95 px-3 backdrop-blur min-[360px]:px-4 sm:px-5 md:px-6 lg:px-7 xl:px-8 h-[76px] ${sidebarCollapsed ? "lg:h-[76px]" : "lg:h-[88px]"}`}>
      <div className="mx-auto flex h-full w-full max-w-[1800px] flex-col justify-center gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {leading}

          <div className="min-w-0 pl-12 lg:pl-0">
            <Typo
              as="h1"
              variant="h3"
              className="!text-[18px] !font-bold !leading-tight !tracking-[-0.03em] !text-[#ff4b0b] min-[360px]:!text-[20px] sm:!text-[22px]"
            >
              {title}
            </Typo>

            {breadcrumb && (
              <Typo
                variant="caption"
                className="mt-1 block !font-bold !text-[#56618e]"
              >
                {breadcrumb}
              </Typo>
            )}

            {subtitle && (
              <Typo
                variant="body-sm"
                className="mt-1 max-w-[560px] !text-[12px] !font-medium !leading-5 !text-[#626a82] min-[360px]:!text-[13px] sm:!text-[14px]"
              >
                {subtitle}
              </Typo>
            )}
          </div>
        </div>

        {(actions || children) && (
          <div className="flex w-full flex-col gap-2 min-[560px]:flex-row min-[560px]:items-center lg:w-auto">
            {actions && (
              <div className="flex w-full items-center gap-2 min-[560px]:w-auto">
                {actions}
              </div>
            )}

            {children}
          </div>
        )}
      </div>
    </header>
  );
}

function formatShortDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NotificationButton({ open, setOpen, items = [], router }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative grid h-11 w-10 shrink-0 place-items-center rounded-xl border border-[#e5e7ef] bg-white transition hover:border-[#ffb396] sm:h-11 sm:w-12"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5 text-[#1d2540] sm:h-6 sm:w-6" />

        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff4b0b] px-1 font-[var(--font-primary)] text-[10px] font-bold text-white">
          {items.length}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />

          <div className="absolute right-0 z-50 mt-2 w-[315px] overflow-hidden rounded-[14px] border border-[#e3e6ee] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
            <div className="border-b border-[#edf0f6] px-4 py-3">
              <Typo variant="body-sm" className="!font-bold !text-[#071033]">
                Notifications
              </Typo>

              <Typo variant="caption" className="mt-0.5 !text-[#626a82]">
                {items.length} admin updates
              </Typo>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2">
              {items.length > 0 ? (
                items.map((item, index) => (
                  <button
                    key={`${item.title || "notification"}-${index}`}
                    type="button"
                    onClick={() => {
                      setOpen(false);

                      if (item.path && router) {
                        router.push(item.path);
                      }
                    }}
                    className="w-full rounded-[12px] p-3 text-left transition hover:bg-[#fbfbfd]"
                  >
                    <Typo
                      variant="body-sm"
                      className="line-clamp-1 !font-bold !text-[#071033]"
                    >
                      {item.title}
                    </Typo>

                    {item.desc && (
                      <Typo
                        variant="caption"
                        className="mt-1 block !font-medium !leading-5 !text-[#626a82]"
                      >
                        {item.desc}
                      </Typo>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-6 text-center">
                  <Typo
                    variant="body-sm"
                    className="!font-bold !text-[#071033]"
                  >
                    No notifications
                  </Typo>

                  <Typo
                    variant="caption"
                    className="mt-1 block !font-medium !text-[#626a82]"
                  >
                    You are all caught up.
                  </Typo>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function UserMenu({
  open,
  setOpen,
  userInitial,
  userDisplayName,
  userDisplayRole,
  appliedFromDate,
  appliedToDate,
  onDashboard,
  onLogout,
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-[#edf0f6] bg-[#fbfbfd] px-2 transition hover:border-[#ffb396] sm:gap-3 sm:px-3"
        aria-label="Open user menu"
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8ebf2] sm:h-10 sm:w-10">
          <Typo
            as="span"
            variant="body-sm"
            className="!font-bold !text-[#071033]"
          >
            {userInitial}
          </Typo>
        </div>

        <div className="min-w-0 text-left">
          <Typo
            variant="body-sm"
            className="max-w-[170px] truncate !text-[12px] !font-bold !capitalize !text-[#071033] min-[360px]:max-w-[220px] sm:max-w-[150px] sm:!text-[13px]"
          >
            {userDisplayName}
          </Typo>

          <Typo
            variant="caption"
            className="mt-0.5 max-w-[170px] truncate !text-[10px] !font-medium !capitalize !text-[#626a82] min-[360px]:max-w-[220px] sm:max-w-[150px] sm:!text-[11px]"
          >
            {userDisplayRole}
          </Typo>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#5b637b] transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close user menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />

          <div className="absolute right-0 z-50 mt-2 w-full min-w-[260px] overflow-hidden rounded-[14px] border border-[#e3e6ee] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] sm:w-[295px]">
            <div className="border-b border-[#edf0f6] px-4 py-4">
              <Typo
                variant="body-sm"
                className="truncate !font-bold !text-[#071033]"
              >
                {userDisplayName}
              </Typo>

              <Typo
                variant="caption"
                className="mt-1 block truncate !font-medium !capitalize !text-[#626a82]"
              >
                {userDisplayRole}
              </Typo>

              {appliedFromDate !== undefined && (
                <div className="mt-3 rounded-[10px] bg-[#fbfbfd] px-3 py-2">
                  <Typo
                    variant="caption"
                    className="!font-bold !text-[#ff4b0b]"
                  >
                    Active Date Filter
                  </Typo>

                  <Typo
                    variant="caption"
                    className="mt-0.5 block truncate !font-medium !text-[#626a82]"
                  >
                    {appliedFromDate && appliedToDate
                      ? `${formatShortDate(appliedFromDate)} - ${formatShortDate(
                          appliedToDate
                        )}`
                      : "No date filter applied"}
                  </Typo>
                </div>
              )}
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDashboard?.();
                }}
                className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 font-[var(--font-primary)] text-[13px] font-bold text-[#071033] transition hover:bg-[#fbfbfd]"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 font-[var(--font-primary)] text-[13px] font-bold text-[#ff4b0b] transition hover:bg-[#fff3ee]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}