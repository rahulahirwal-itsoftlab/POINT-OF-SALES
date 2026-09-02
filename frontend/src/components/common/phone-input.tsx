"use client";

import React, { useId } from "react";
import { sanitizePhone } from "@/lib/validation/phone";
import { cn } from "@/lib/utils/cn";

export type PhoneInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  id?: string;
  className?: string;
};

export function PhoneInput({
  label = "Phone Number",
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  placeholder = "e.g. 9876543210",
  name = "phone",
  id: customId,
  className,
}: PhoneInputProps) {
  const generatedId = useId();
  const inputId = customId || generatedId;
  const errorId = `${inputId}-error`;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const sanitized = sanitizePhone(e.target.value);
    onChange(sanitized);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text/plain");
    const sanitized = sanitizePhone(pastedText);
    onChange(sanitized);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "flex h-10 w-full rounded-xl border bg-white px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 transition duration-150",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-slate-200 focus:border-blue-600 focus:ring-blue-600/20 dark:border-slate-800"
          )}
        />
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-red-500 dark:text-red-400 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
