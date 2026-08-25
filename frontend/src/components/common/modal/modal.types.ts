import React from "react";

export type ModalVariant =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "destructive"
  | "confirm"
  | "permission"
  | "form";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export type CommonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  variant?: ModalVariant;
  size?: ModalSize;
  icon?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => Promise<void> | void;
  isConfirming?: boolean;
  confirmDisabled?: boolean;
  showFooter?: boolean;
  showCancel?: boolean;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
};

export type ConfirmOptions = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  variant?: ModalVariant;
  size?: ModalSize;
  icon?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => Promise<void> | void;
};

export type PermissionOptions = {
  title?: string;
  description?: string;
  requiredPermission?: string;
};

export type OpenModalOptions = CommonModalProps;
