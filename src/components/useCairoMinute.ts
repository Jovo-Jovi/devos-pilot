"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void): () => void {
  const timer = setInterval(onStoreChange, 30_000);
  return () => {
    clearInterval(timer);
  };
}

function getSnapshot(): number {
  return Math.floor(Date.now() / 60000) * 60000;
}

function getServerSnapshot(): null {
  return null;
}

export function useCairoMinute(): number | null {
  return useSyncExternalStore<number | null>(subscribe, getSnapshot, getServerSnapshot);
}
