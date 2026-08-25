"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useModal } from "./modal";

export type ActionMenuItem = {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "destructive" | "warning";
  disabled?: boolean;
  divider?: boolean;
  permission?: string;
  hasPermission?: boolean;
};

export type ActionDropdownProps = {
  items: ActionMenuItem[];
  label?: string;
};

export function ActionDropdown({ items, label = "Actions" }: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showPermissionDenied } = useModal();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        <span>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-1.5 w-48 origin-top-right rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={`divider-${index}`} className="my-1 border-t border-slate-100" />;
            }

            const isDestructive = item.variant === "destructive";
            const isWarning = item.variant === "warning";

            const textColor = isDestructive
              ? "text-red-600 hover:bg-red-50"
              : isWarning
              ? "text-amber-600 hover:bg-amber-50"
              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900";

            return (
              <button
                key={`${item.label}-${index}`}
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  if (item.hasPermission === false) {
                    showPermissionDenied({ requiredPermission: item.permission });
                  } else {
                    item.onClick?.();
                  }
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition disabled:opacity-40 ${textColor}`}
              >
                {item.icon && <span className="h-4 w-4 shrink-0 text-slate-400">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
