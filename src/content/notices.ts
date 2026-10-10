import type { LibraryNotice } from "./schema";

export function selectPublishedNotices(
  notices: readonly LibraryNotice[],
): LibraryNotice[] {
  return notices
    .filter((notice) => notice.status === "published")
    .sort((left, right) => {
      if (left.publishedOn !== right.publishedOn) {
        return left.publishedOn < right.publishedOn ? 1 : -1;
      }
      if (left.id < right.id) return -1;
      if (left.id > right.id) return 1;
      return 0;
    });
}

export function selectLatestNotices(
  notices: readonly LibraryNotice[],
  limit: number,
): LibraryNotice[] {
  if (limit <= 0) return [];
  return selectPublishedNotices(notices).slice(0, limit);
}
