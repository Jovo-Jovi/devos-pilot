"use client";

import { Fragment, type ReactNode } from "react";
import type { OpeningSlot } from "@/content/schema";
import { cairoClock, todaySlots } from "@/content/status";
import { templateParts } from "@/content/template";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { Bidi } from "./Bidi";
import { useCairoMinute } from "./useCairoMinute";

function dayName(days: ReturnType<typeof getMessages>["days"], dayOfWeek: number): string {
  return days[String(dayOfWeek) as keyof typeof days];
}

function fillDay(template: string, day: string): ReactNode[] {
  return templateParts(template).map((part) => {
    if (part.kind === "text") return part.text;
    if (part.name === "day") return day;
    return null;
  });
}

export function TodayLine({
  locale,
  slots,
}: {
  locale: Locale;
  slots: readonly OpeningSlot[];
}) {
  const minute = useCairoMinute();
  if (minute === null || slots.length === 0) return null;
  const messages = getMessages(locale);
  const dayOfWeek = cairoClock(new Date(minute)).dayOfWeek;
  const day = dayName(messages.days, dayOfWeek);
  const periods = todaySlots(slots, dayOfWeek);
  if (periods.length === 0) {
    return <span className="today">{fillDay(messages.today.closed, day)}</span>;
  }
  return (
    <span className="today">
      {fillDay(messages.today.label, day)}{" "}
      {periods.map((period, index) => (
        <Fragment key={period.id}>{index > 0 ? messages.list.and : null}<Bidi>{`${period.opensAt}–${period.closesAt}`}</Bidi></Fragment>
      ))}
    </span>
  );
}
