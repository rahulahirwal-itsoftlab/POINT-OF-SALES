"use client";

import React from "react";
import { useModal } from "./use-modal";

export type PermissionActionProps = {
  hasPermission?: boolean;
  requiredPermission?: string;
  onAllowed: () => void;
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
};

export function PermissionAction({
  hasPermission = true,
  requiredPermission,
  onAllowed,
  children,
}: PermissionActionProps) {
  const { showPermissionDenied } = useModal();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasPermission) {
      onAllowed();
    } else {
      showPermissionDenied({
        requiredPermission,
      });
    }
  };

  return React.cloneElement(children, {
    onClick: handleClick,
  });
}
