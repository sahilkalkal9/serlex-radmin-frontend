"use client";

export default function Toggle({
  checked,
  onChange,
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[10px] border border-[#eef0f6] p-3 min-[380px]:gap-4 min-[380px]:p-4">
      {Icon && (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf3ff] text-[#1d86f5] min-[380px]:h-11 min-[380px]:w-11">
          <Icon className="h-5 w-5" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        {title && (
          <p className="text-[12px] font-bold text-[#071033] min-[380px]:text-[13px]">
            {title}
          </p>
        )}
        {description && (
          <p className="mt-1 text-[10px] font-semibold leading-5 text-[#68729d] min-[380px]:text-[11px]">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#19b96d]" : "bg-[#d5dae8]"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
