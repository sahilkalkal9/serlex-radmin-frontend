"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import Typo from "@/components/ui/typo";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export default function DateRangePicker({
  fromDate,
  toDate,
  appliedFromDate,
  appliedToDate,
  setFromDate,
  setToDate,
  onApply,
  onReset,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full min-w-0 items-center gap-3 rounded-[9px] border border-[#e7e9f1] bg-white px-3 text-left shadow-sm transition hover:border-[#ffb396] min-[900px]:w-[268px] xl:w-[292px]"
      >
        <CalendarDays className="h-5 w-5 shrink-0 text-[#3d4983]" />
        <Typo
          as="span"
          variant="caption"
          className="min-w-0 flex-1 truncate !text-[11px] !font-bold !text-[#141a64]"
        >
          {formatDate(fromDate)} - {formatDate(toDate)}
        </Typo>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#3d4983]" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
            aria-label="Close date menu"
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(300px,calc(100vw-24px))] rounded-[12px] border border-[#e7e9f1] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.14)]">
            <div className="grid gap-3">
              <DateInput
                label="From"
                value={fromDate}
                max={toDate || undefined}
                onChange={setFromDate}
              />
              <DateInput
                label="To"
                value={toDate}
                min={fromDate || undefined}
                onChange={setToDate}
              />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onReset?.();
                    setOpen(false);
                  }}
                  className="h-10 rounded-[8px] border border-[#e7e9f1] font-[var(--font-primary)] text-[12px] font-bold text-[#141a64]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApply?.();
                    setOpen(false);
                  }}
                  className="h-10 rounded-[8px] bg-[#ff4b0b] font-[var(--font-primary)] text-[12px] font-bold text-white"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DateInput({ label, value, min, max, onChange }) {
  return (
    <label className="block">
      <Typo
        as="span"
        variant="caption"
        className="mb-1.5 block !font-bold !text-[#28304d]"
      >
        {label}
      </Typo>
      <input
        type="date"
        defaultValue={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-[8px] border border-[#dfe2eb] px-3 font-[var(--font-primary)] text-[13px] text-[#111936] outline-none focus:border-[#ff4b0b]"
      />
    </label>
  );
}
