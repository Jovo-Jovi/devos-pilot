import type { OpeningSlot } from "./schema";

export const TIMETABLE_START_HOUR = 8;
export const TIMETABLE_END_HOUR = 22;
export const TIMETABLE_TICK_HOURS = [8, 10, 12, 14, 16, 18, 20, 22] as const;
export const TIMETABLE_DAY_ORDER = [6, 0, 1, 2, 3, 4, 5] as const; // Saturday → Friday

export type BarPlacement = { start: number; size: number };
export type TimetableDay = { dayOfWeek: number; slots: OpeningSlot[] };

const AXIS_SPAN_HOURS = TIMETABLE_END_HOUR - TIMETABLE_START_HOUR;

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function clampedPercent(time: string): number {
  const [hourText, minuteText] = time.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  const raw =
    ((hours + minutes / 60 - TIMETABLE_START_HOUR) / AXIS_SPAN_HOURS) * 100;
  return Math.min(100, Math.max(0, raw));
}

export function placeOnAxis(time: string): number {
  return round4(clampedPercent(time));
}

export function barPlacement(opensAt: string, closesAt: string): BarPlacement {
  const clampedStart = clampedPercent(opensAt);
  const clampedEnd = clampedPercent(closesAt);
  return {
    start: placeOnAxis(opensAt),
    size: round4(clampedEnd - clampedStart),
  };
}

export function timetableDays(slots: readonly OpeningSlot[]): TimetableDay[] {
  return TIMETABLE_DAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    slots: slots
      .filter((slot) => slot.dayOfWeek === dayOfWeek)
      .sort((left, right) => {
        if (left.opensAt < right.opensAt) return -1;
        if (left.opensAt > right.opensAt) return 1;
        return 0;
      }),
  }));
}
