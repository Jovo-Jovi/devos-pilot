import profileRaw from "../../content/library-profile.json";
import { parseLibraryProfile } from "./schema";

// OD-10 §5: notices and opening slots come from the database (src/content/readers.ts).
export const libraryProfile = parseLibraryProfile(profileRaw);
