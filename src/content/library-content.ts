import noticesRaw from "../../content/library-notices.json";
import slotsRaw from "../../content/opening-slots.json";
import profileRaw from "../../content/library-profile.json";
import { orderOpeningSlots } from "./order";
import {
  parseLibraryNotices,
  parseLibraryProfile,
  parseOpeningSlots,
} from "./schema";

export const libraryProfile = parseLibraryProfile(profileRaw);
export const openingSlots = orderOpeningSlots(parseOpeningSlots(slotsRaw));
export const libraryNotices = parseLibraryNotices(noticesRaw);
