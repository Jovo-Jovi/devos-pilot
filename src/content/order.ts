import type { OpeningSlot } from "./schema";

export function orderOpeningSlots(
  slots: readonly OpeningSlot[],
): OpeningSlot[] {
  return [...slots].sort((left, right) => {
    if (left.dayOfWeek !== right.dayOfWeek) {
      return left.dayOfWeek - right.dayOfWeek;
    }
    if (left.opensAt < right.opensAt) return -1;
    if (left.opensAt > right.opensAt) return 1;
    return 0;
  });
}
