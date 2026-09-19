"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";
import api from "../../lib/api";
import { DEFAULT_PAGE_SETTINGS, MeetingPageLayoutContext, type PageMargins, type PageSettings } from "../RichTextEditor";

// What the meeting API returns in `page_layout` (null when never set).
type SavedPageLayout = (Partial<Pick<PageSettings, "size" | "orientation" | "marginPreset">> & { margins?: Partial<PageMargins> }) | null | undefined;

// Only these are printed by the PDF, so only they are saved with the meeting.
const pickSaved = (s: PageSettings) => ({
  size: s.size,
  orientation: s.orientation,
  margins: s.margins,
  marginPreset: s.marginPreset,
});

const fromSaved = (saved: SavedPageLayout): PageSettings => {
  if (!saved || typeof saved !== "object" || !saved.size) return DEFAULT_PAGE_SETTINGS;
  return {
    ...DEFAULT_PAGE_SETTINGS,
    size: saved.size,
    orientation: saved.orientation === "landscape" ? "landscape" : "portrait",
    margins: { ...DEFAULT_PAGE_SETTINGS.margins, ...(saved.margins || {}) },
    marginPreset: saved.marginPreset || "custom",
  };
};

/**
 * Holds the Page Layout tab's settings for a meeting page, shared by all of its
 * editors (agenda, resolution, ...). Changing size / orientation / margins is
 * saved on the meeting shortly afterwards, and the generated PDF prints on it.
 */
export default function MeetingPageLayoutProvider({
  meetingId,
  saved,
  ready,
  children,
}: {
  meetingId: string;
  saved: SavedPageLayout;
  ready: boolean;
  children: React.ReactNode;
}) {
  const [settings, setSettingsState] = useState<PageSettings>(() => fromSaved(saved));
  const settingsRef = useRef(settings);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The meeting arrives after first render: take its saved layout once, without
  // treating that as a user change (nothing is written back).
  useEffect(() => {
    if (!ready || hydrated.current) return;
    hydrated.current = true;
    const next = fromSaved(saved);
    settingsRef.current = next;
    setSettingsState(next);
  }, [ready, saved]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const setSettings: React.Dispatch<React.SetStateAction<PageSettings>> = useCallback(
    (action) => {
      const prev = settingsRef.current;
      const next = typeof action === "function" ? (action as (p: PageSettings) => PageSettings)(prev) : action;
      settingsRef.current = next;
      setSettingsState(next);
      if (JSON.stringify(pickSaved(prev)) === JSON.stringify(pickSaved(next))) return;
      hydrated.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try {
          await api.put(`/meetings/${meetingId}/page-layout`, { page_layout: pickSaved(settingsRef.current) });
          globalMutate(`/meetings/${meetingId}`);
        } catch (err) {
          console.error("Could not save the page layout", err);
        }
      }, 600);
    },
    [meetingId]
  );

  const value = useMemo(() => ({ settings, setSettings }), [settings, setSettings]);
  return <MeetingPageLayoutContext.Provider value={value}>{children}</MeetingPageLayoutContext.Provider>;
}
