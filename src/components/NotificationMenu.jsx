"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import Typo from "@/components/ui/typo";

export default function NotificationMenu({
  count = 0,
  items = [],
  onItemClick,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative grid h-11 w-10 shrink-0 place-items-center rounded-xl border border-[#e5e7ef] bg-white transition hover:border-[#ffb396] sm:h-11 sm:w-12"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5 text-[#1d2540] sm:h-6 sm:w-6" />

        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff4b0b] px-1 font-[var(--font-primary)] text-[10px] font-bold text-white">
            {count}
          </span>
        )}
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
                {count} admin updates
              </Typo>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2">
              {items.length > 0 ? (
                items.map((item, index) => (
                  <button
                    key={item.id || `notification-${index}`}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onItemClick?.(item);
                    }}
                    className="w-full rounded-[12px] p-3 text-left transition hover:bg-[#fbfbfd]"
                  >
                    <Typo
                      variant="body-sm"
                      className="line-clamp-1 !font-bold !text-[#071033]"
                    >
                      {item.title}
                    </Typo>

                    <Typo
                      variant="caption"
                      className="mt-1 block !font-medium !leading-5 !text-[#626a82]"
                    >
                      {item.desc ||
                        (item.meta
                          ? `${item.meta}${item.status ? ` | ${item.status}` : ""}`
                          : item.status) ||
                        ""}
                    </Typo>
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
