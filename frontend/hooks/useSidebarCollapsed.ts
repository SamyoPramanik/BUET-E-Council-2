"use client";

import { useCallback, useSyncExternalStore } from "react";

// Whether a left-hand menu is hidden on desktop screens (the mobile drawer has
// its own open/close state). Remembered in this browser (localStorage) and kept
// in sync across tabs and across components using the same key. The server
// render always starts expanded, so hydration matches.
const CHANGE_EVENT = "sidebar-collapsed-change";

const read = (key: string) => {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
};

export default function useSidebarCollapsed(storageKey: string): [boolean, () => void] {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);

  const collapsed = useSyncExternalStore(subscribe, () => read(storageKey), () => false);

  const toggle = useCallback(() => {
    try { localStorage.setItem(storageKey, read(storageKey) ? "0" : "1"); } catch { /* storage unavailable */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [storageKey]);

  return [collapsed, toggle];
}
