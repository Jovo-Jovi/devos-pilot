"use client";

import type { ReactNode } from "react";
import type { OpeningSlot } from "@/content/schema";
import { openStatus } from "@/content/status";
import { templateParts } from "@/content/template";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { Bidi } from "./Bidi";
import { useCairoMinute } from "./useCairoMinute";

function dayName(days: ReturnType<typeof getMessages>["days"], dayOfWeek: number): string {
  return days[String(dayOfWeek) as keyof typeof days];
}

function fillTemplate(template: string, time: string, day: string | undefined): ReactNode[] {
  return templateParts(template).map((part, index) => {
    if (part.kind === "text") return part.text;
    if (part.name === "time") return <Bidi key={index}>{time}</Bidi>;
    if (part.name === "day" && day !== undefined) return day;
    return null;
  });
}

export function StatusChip({
  locale,
  slots,
}: {
  locale: Locale;
  slots: readonly OpeningSlot[];
}) {
  const minute = useCairoMinute();
  if (minute === null) return null;
  const reading = openStatus(slots, new Date(minute));
  if (reading.state === "none") return null;
  const messages = getMessages(locale);
  if (reading.state === "open") {
    return (
      <span className="status-chip">
        {fillTemplate(messages.status.openUntil, reading.until, undefined)}
      </span>
    );
  }
  return (
    <span className="status-chip is-closed">
      {fillTemplate(
        messages.status.closedOpens,
        reading.opensAt,
        dayName(messages.days, reading.opensDayOfWeek),
      )}
    </span>
  );
}
