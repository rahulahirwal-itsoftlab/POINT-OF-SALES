"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils/cn";

export type FormFieldProps = {
  label?: string;
  error?: string | null;
  required?: boolean;
  helpText?: string;
  children: React.ReactElement;
  className?: string;
};

export function FormField({
  label,
  error,
  required = false,
  helpText,
  children,
  className,
}: FormFieldProps) {
  const generatedId = useId();
  const childId = children.props?.id || generatedId;
  const errorId = `${childId}-error`;

  const clonedChild = React.cloneElement(children, {
    id: childId,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    className: cn(
      children.props?.className,
      error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
    ),
  });

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={childId}
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {clonedChild}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-red-500 dark:text-red-400 mt-1">
          {error}
        </p>
      ) : helpText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helpText}</p>
      ) : null}
    </div>
  );
}
