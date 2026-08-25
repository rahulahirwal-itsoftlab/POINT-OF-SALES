"use client";

import { useModalContext } from "./modal-provider";

export function useConfirmation() {
  const { confirm } = useModalContext();
  return { confirm };
}
