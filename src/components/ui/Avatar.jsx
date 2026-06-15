export default function Avatar({
  initials = "AU",
  size = "md",
  className = "",
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-[12px]",
    lg: "h-12 w-12 text-[14px]",
    xl: "h-16 w-16 text-[18px]",
  };

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-[#ffe5d8] font-bold text-[#06143a] ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </span>
  );
}
