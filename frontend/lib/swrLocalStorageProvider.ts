// Standard SWR localStorage-cache recipe: hydrates from localStorage on
// init so the last result set paints instantly (even after a full page
// reload), and persists back on unload. SWR still revalidates in the
// background as normal.
const STORAGE_KEY = "search-swr-cache";

export function localStorageProvider() {
  if (typeof window === "undefined") {
    return new Map();
  }

  let map: Map<string, any>;
  try {
    map = new Map(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    map = new Map();
  }

  window.addEventListener("beforeunload", () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(map.entries())));
    } catch {
      // ignore quota errors
    }
  });

  return map;
}
