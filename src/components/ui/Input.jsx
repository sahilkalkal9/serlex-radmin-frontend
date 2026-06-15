export default function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  className = "",
}) {
  return (
    <label className={`min-w-0 ${className}`}>
      {label && (
        <span className="mb-1.5 block text-[11px] font-extrabold text-[#2b356f]">
          {label}
          {required && <span className="text-[#ff3b0d]"> *</span>}
        </span>
      )}
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-[8px] border border-[#e1e5ef] bg-white px-3 text-[12px] font-semibold text-[#071033] outline-none transition placeholder:text-[#a6aec8] focus:border-[#ff8b65] focus:ring-2 focus:ring-[#fff0ea]"
      />
    </label>
  );
}
