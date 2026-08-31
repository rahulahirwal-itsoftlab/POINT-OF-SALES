"use client";

import React, { useEffect, useRef } from "react";
import { X, Loader2, Lock, AlertTriangle, AlertCircle, CheckCircle2, Info, HelpCircle } from "lucide-react";
import type { CommonModalProps, ModalSize, ModalVariant } from "./modal.types";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl w-full",
  "3xl": "max-w-5xl w-full",
  full: "max-w-[92vw] w-full",
};

const variantButtonClasses: Record<ModalVariant, string> = {
  default: "heritage-button-primary",
  info: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
  warning: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
  danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
  destructive: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
  confirm: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500",
  permission: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
  form: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
};

export function CommonModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  variant = "default",
  size = "md",
  icon,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  isConfirming = false,
  confirmDisabled = false,
  showFooter = true,
  showCancel = true,
  showCloseButton = true,
  closeOnBackdropClick = false,
}: CommonModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen && !isConfirming) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isConfirming, onClose]);

  if (!isOpen) return null;

  const renderVariantIcon = () => {
    if (icon) return icon;
    switch (variant) {
      case "permission":
        return <Lock className="h-6 w-6 text-amber-600" />;
      case "danger":
      case "destructive":
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-6 w-6 text-amber-600" />;
      case "success":
        return <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
      case "info":
        return <Info className="h-6 w-6 text-blue-600" />;
      case "confirm":
        return <HelpCircle className="h-6 w-6 text-indigo-600" />;
      default:
        return null;
    }
  };

  const variantIconNode = renderVariantIcon();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={() => {
          if (!isConfirming && closeOnBackdropClick) onClose();
        }}
        className="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Window */}
      <div
        className={`relative z-10 w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden rounded-xl border shadow-2xl transition-all animate-in zoom-in-95 duration-200`}
        style={{ borderColor: "var(--border-soft)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4" style={{ borderColor: "var(--border-soft)" }}>
          <div className="flex items-start gap-3">
            {variantIconNode && (
              <div className="mt-0.5 shrink-0 rounded-xl border p-2" style={{ borderColor: "var(--border-soft)", background: "var(--background-subtle)" }}>
                {variantIconNode}
              </div>
            )}
            <div>
              <h3 id="modal-title" className="heritage-heading text-2xl font-bold" style={{ color: "var(--text)" }}>
                {title}
              </h3>
              {description && <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{description}</p>}
            </div>
          </div>
          {showCloseButton && (
            <button
              type="button"
              disabled={isConfirming}
              onClick={onClose}
              className="rounded-lg p-1.5 transition disabled:opacity-50"
              style={{ color: "var(--muted)" }}
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        {children && <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>}

        {/* Footer Actions */}
        {showFooter && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4" style={{ borderColor: "var(--border-soft)", background: "var(--background-subtle)" }}>
            {showCancel && (
              <button
                type="button"
                disabled={isConfirming}
                onClick={onClose}
                className="heritage-button-secondary rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            {onConfirm && (
              <button
                type="button"
                disabled={isConfirming || confirmDisabled}
                onClick={onConfirm}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${variantButtonClasses[variant]}`}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
