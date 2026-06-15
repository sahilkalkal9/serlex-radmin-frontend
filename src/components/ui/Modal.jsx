"use client";

import { X } from "lucide-react";
import Typo from "@/components/ui/typo";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#071033]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={`max-h-[96dvh] w-full overflow-hidden rounded-t-[18px] bg-white shadow-2xl sm:rounded-[18px] ${
          wide ? "sm:max-w-[920px]" : "sm:max-w-[540px]"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef0f6] px-4 py-4 min-[380px]:px-5">
          <div className="min-w-0">
            {title && (
              <Typo
                as="h2"
                variant="h3"
                className="!text-[17px] !font-extrabold !text-[#071033] min-[380px]:!text-[20px]"
              >
                {title}
              </Typo>
            )}
            {subtitle && (
              <Typo
                variant="body-sm"
                className="mt-1 !text-[11px] !font-semibold !text-[#68729d]"
              >
                {subtitle}
              </Typo>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fbfbfd] text-[#445184] hover:bg-[#fff0ea]"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 min-[380px]:p-5 max-h-[calc(96dvh-120px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
