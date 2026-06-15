"use client";

import { useState } from "react";
import { ChevronDown, Home, LogOut, UserRound } from "lucide-react";
import Typo from "@/components/ui/typo";

function formatShortDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UserMenu({
  userName,
  userInitials,
  userRole = "Administrator",
  appliedFromDate,
  appliedToDate,
  onDashboard,
  onLogout,
  loggingOut = false,
}) {
  const [open, setOpen] = useState(false);

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
            {userInitials}
          </Typo>
        </div>

        <div className="min-w-0 text-left">
          <Typo
            variant="body-sm"
            className="max-w-[170px] truncate !text-[12px] !font-bold !capitalize !text-[#071033] min-[360px]:max-w-[220px] sm:max-w-[150px] sm:!text-[13px]"
          >
            {userName}
          </Typo>

          <Typo
            variant="caption"
            className="mt-0.5 max-w-[170px] truncate !text-[10px] !font-medium !capitalize !text-[#626a82] min-[360px]:max-w-[220px] sm:max-w-[150px] sm:!text-[11px]"
          >
            {userRole}
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
                {userName}
              </Typo>

              <Typo
                variant="caption"
                className="mt-1 block truncate !font-medium !capitalize !text-[#626a82]"
              >
                {userRole}
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
              {onDashboard && (
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
              )}

              <button
                type="button"
                className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 font-[var(--font-primary)] text-[13px] font-bold text-[#071033] transition hover:bg-[#fbfbfd]"
              >
                <UserRound className="h-4 w-4" />
                Profile
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
                disabled={loggingOut}
                className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 font-[var(--font-primary)] text-[13px] font-bold text-[#ff4b0b] transition hover:bg-[#fff3ee]"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
