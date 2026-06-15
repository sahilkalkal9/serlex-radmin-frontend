"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const variants = {
  primary:
    "bg-[#ff3b0d] text-white hover:bg-[#e9350c] shadow-[0_8px_16px_rgba(255,59,13,0.16)]",
  secondary:
    "border border-[#e1e5ef] bg-white text-[#445184] hover:bg-[#fbfbfd]",
  ghost: "bg-transparent text-[#445184] hover:bg-[#f5f6fa]",
  danger:
    "bg-[#d92d20] text-white hover:bg-[#b42318] shadow-[0_8px_16px_rgba(217,45,32,0.16)]",
};

const sizes = {
  sm: "h-9 px-3 text-[11px] gap-1.5",
  md: "h-10 px-4 text-[12px] gap-2",
  lg: "h-11 px-5 text-[13px] gap-2",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon: Icon,
    children,
    className = "",
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-[8px] font-bold transition disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
});

export default Button;
