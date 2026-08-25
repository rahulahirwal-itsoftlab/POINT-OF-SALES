"use client";

import { useModalContext } from "./modal-provider";

export function useModal() {
  return useModalContext();
}
