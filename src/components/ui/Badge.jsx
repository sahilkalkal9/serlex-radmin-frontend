const toneStyles = {
  approved: "bg-[#e7f8ef] text-[#05925f]",
  green: "bg-[#e7f8ef] text-[#05925f]",
  completed: "bg-[#e7f8ef] text-[#05925f]",
  confirmed: "bg-[#e7f8ef] text-[#05925f]",
  pending: "bg-[#fff4dd] text-[#d58a00]",
  orange: "bg-[#fff4dd] text-[#d58a00]",
  inactive: "bg-[#fff1f1] text-[#d92d20]",
  cancelled: "bg-[#fff1f1] text-[#d92d20]",
  rejected: "bg-[#fff1f1] text-[#d92d20]",
  red: "bg-[#fff1f1] text-[#d92d20]",
  blue: "bg-[#eaf3ff] text-[#1c7bf2]",
  purple: "bg-[#f1ddff] text-[#8b39f2]",
  neutral: "bg-[#f0f1f5] text-[#445184]",
};

export default function Badge({
  children,
  tone = "neutral",
  className = "",
}) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-1 text-[10px] font-extrabold capitalize leading-none ${toneStyles[tone] || toneStyles.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
