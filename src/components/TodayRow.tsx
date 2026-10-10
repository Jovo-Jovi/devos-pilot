"use client";

import type { ReactNode } from "react";
import { cairoClock } from "@/content/status";
import { useCairoMinute } from "./useCairoMinute";

export function TodayRow({
  dayOfWeek,
  children,
}: {
  dayOfWeek: number;
  children: ReactNode;
}) {
  const minute = useCairoMinute();
  const isToday = minute !== null && cairoClock(new Date(minute)).dayOfWeek === dayOfWeek;
  return <div className={isToday ? "row is-today" : "row"}>{children}</div>;
}
