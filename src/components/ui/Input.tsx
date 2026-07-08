"use client";

import { InputHTMLAttributes, useState } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

// Shared input used across every form (login, room form, booking form).
// Explicit bg/text colors keep entered text readable regardless of the
// visitor's OS dark-mode setting, since the input itself always stays light.
export function Input({ label, error, id, type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={resolvedType}
          className={`w-full bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isPassword ? "pr-16" : ""
          } ${error ? "border-red-500" : "border-gray-300"}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
