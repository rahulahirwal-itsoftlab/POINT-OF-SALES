"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CommonModal } from "./common-modal";
import type { ConfirmOptions, PermissionOptions, CommonModalProps } from "./modal.types";

export type ModalContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showPermissionDenied: (options?: PermissionOptions) => void;
  openModal: (options: Omit<CommonModalProps, "isOpen" | "onClose">) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<CommonModalProps | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const closeModal = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setModalState(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      
      const variant = options.variant || "confirm";

      setModalState({
        isOpen: true,
        onClose: () => {
          if (resolverRef.current) {
            resolverRef.current(false);
            resolverRef.current = null;
          }
          setModalState(null);
        },
        title: options.title,
        description: options.description,
        children: options.children,
        variant,
        size: options.size || "md",
        icon: options.icon,
        confirmText: options.confirmText || (variant === "danger" ? "Delete" : "Confirm"),
        cancelText: options.cancelText || "Cancel",
        onConfirm: async () => {
          if (options.onConfirm) {
            setModalState((prev) => (prev ? { ...prev, isConfirming: true } : null));
            try {
              await options.onConfirm();
            } finally {
              setModalState((prev) => (prev ? { ...prev, isConfirming: false } : null));
            }
          }
          if (resolverRef.current) {
            resolverRef.current(true);
            resolverRef.current = null;
          }
          setModalState(null);
        },
      });
    });
  }, []);

  const showPermissionDenied = useCallback((options?: PermissionOptions) => {
    setModalState({
      isOpen: true,
      onClose: () => setModalState(null),
      title: options?.title || "Permission Required",
      description: options?.description || "You do not have permission to perform this action. Contact your administrator if you require access.",
      variant: "permission",
      size: "md",
      confirmText: "Close",
      showCancel: false,
      onConfirm: () => setModalState(null),
    });
  }, []);

  const openModal = useCallback((options: Omit<CommonModalProps, "isOpen" | "onClose">) => {
    setModalState({
      ...options,
      isOpen: true,
      onClose: () => setModalState(null),
    });
  }, []);

  return (
    <ModalContext.Provider value={{ confirm, showPermissionDenied, openModal, closeModal }}>
      {children}
      {modalState && <CommonModal {...modalState} />}
    </ModalContext.Provider>
  );
}

export function useModalContext(): ModalContextType {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return context;
}
