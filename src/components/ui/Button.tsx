"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "danger" | "secondary";
}

// Shared button used across every form in the app (login, booking, room management).
// Has loading state built in so we don't rewrite disabled/spinner handling everywhere.
export function Button({
  loading,
  variant = "primary",
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? "กำลังโหลด..." : children}
    </button>
  );
}