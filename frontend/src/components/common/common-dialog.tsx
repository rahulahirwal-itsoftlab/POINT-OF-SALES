"use client";

import { CommonModal } from "./modal/common-modal";
import type { CommonModalProps } from "./modal/modal.types";

export type CommonDialogProps = CommonModalProps & {
  maxWidthClass?: string;
};

export function CommonDialog({ maxWidthClass, size, ...props }: CommonDialogProps) {
  // Map legacy maxWidthClass to size preset if size is not provided
  let computedSize = size || "md";
  if (!size && maxWidthClass) {
    if (maxWidthClass.includes("max-w-sm")) computedSize = "sm";
    else if (maxWidthClass.includes("max-w-md")) computedSize = "md";
    else if (maxWidthClass.includes("max-w-lg")) computedSize = "lg";
    else if (maxWidthClass.includes("max-w-2xl") || maxWidthClass.includes("max-w-4xl")) computedSize = "xl";
    else if (maxWidthClass.includes("max-w-5xl")) computedSize = "full";
  }

  return <CommonModal size={computedSize} {...props} />;
}
