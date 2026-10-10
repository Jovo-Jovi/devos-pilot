import type { OpeningSlot } from "./schema";

export type CairoClock = { dayOfWeek: number; time: string }; // time is "HH:MM"
export type OpenStatus =
  | { state: "open"; until: string }
  | { state: "closed"; opensDayOfWeek: number; opensAt: string }
  | { state: "none" };

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const cairoFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Cairo",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((entry) => entry.type === type)?.value ?? "";
}

export function cairoClock(instant: Date): CairoClock {
  const parts = cairoFormat.formatToParts(instant);
  const weekday = part(parts, "weekday");
  const dayOfWeek = WEEKDAY_INDEX[weekday];
  if (dayOfWeek === undefined) {
    throw new Error(`unrecognised Cairo weekday ${weekday}`);
  }
  const hour = part(parts, "hour").padStart(2, "0");
  const minute = part(parts, "minute").padStart(2, "0");
  return { dayOfWeek, time: `${hour}:${minute}` };
}

export function todaySlots(slots: readonly OpeningSlot[], dayOfWeek: number): OpeningSlot[] {
  return slots
    .filter((opening) => opening.dayOfWeek === dayOfWeek)
    .sort((left, right) => {
      if (left.opensAt < right.opensAt) return -1;
      if (left.opensAt > right.opensAt) return 1;
      return 0;
    });
}

export function openStatus(slots: readonly OpeningSlot[], instant: Date): OpenStatus {
  if (slots.length === 0) return { state: "none" };
  const clock = cairoClock(instant);
  const today = todaySlots(slots, clock.dayOfWeek);
  const current = today.find(
    (opening) => opening.opensAt <= clock.time && clock.time < opening.closesAt,
  );
  if (current) return { state: "open", until: current.closesAt };
  const laterToday = today.find((opening) => opening.opensAt > clock.time);
  if (laterToday) {
    return {
      state: "closed",
      opensDayOfWeek: clock.dayOfWeek,
      opensAt: laterToday.opensAt,
    };
  }
  for (let offset = 1; offset <= 7; offset += 1) {
    const dayOfWeek = (clock.dayOfWeek + offset) % 7;
    const next = todaySlots(slots, dayOfWeek)[0];
    if (next) {
      return { state: "closed", opensDayOfWeek: dayOfWeek, opensAt: next.opensAt };
    }
  }
  return { state: "none" };
}
