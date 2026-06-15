export default function Card({
  children,
  className = "",
  padding = true,
}) {
  return (
    <div
      className={`min-w-0 rounded-[8px] border border-[#e8ebf2] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.035)] ${
        padding ? "p-4 min-[380px]:p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
