export default function Select({
  label,
  value,
  onChange,
  options = [],
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
      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-[8px] border border-[#e1e5ef] bg-white px-3 text-[12px] font-semibold text-[#071033] outline-none transition focus:border-[#ff8b65] focus:ring-2 focus:ring-[#fff0ea]"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
