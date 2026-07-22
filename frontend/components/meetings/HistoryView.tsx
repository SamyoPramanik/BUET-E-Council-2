"use client";

import useSWR from "swr";
import { fetcher } from "../../lib/api";
import {
  FilePlus2,
  GitBranch,
  Pencil,
  Paperclip,
  History as HistoryIcon,
} from "lucide-react";

type EventKind = "created" | "workflow" | "content" | "annexure";

interface HistoryEvent {
  at: string;
  username: string;
  kind: EventKind;
  label: string;
}

const ICONS: Record<EventKind, typeof Pencil> = {
  created: FilePlus2,
  workflow: GitBranch,
  content: Pencil,
  annexure: Paperclip,
};

const ICON_CLASSES: Record<EventKind, string> = {
  created: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  workflow: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  content: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  annexure: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Admin/superadmin-only consolidated activity feed for a meeting file: who
// created / edited / wrote / uploaded what, newest first.
export default function HistoryView({ meeting }: { meeting: any }) {
  const { data: response, error, isLoading } = useSWR(`/meetings/${meeting.id}/history`, fetcher);
  const events: HistoryEvent[] = response?.data || [];

  return (
    <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <HistoryIcon className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Activity &amp; Edit History</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Full record of who created, edited, wrote, or uploaded content for this meeting file.
      </p>

      {isLoading && <div className="text-muted-foreground text-sm">Loading history…</div>}
      {error && <div className="text-destructive text-sm">Failed to load history.</div>}

      {!isLoading && !error && events.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground text-sm">
          No activity recorded yet.
        </div>
      )}

      <ol className="relative border-l border-border ml-3">
        {events.map((ev, i) => {
          const Icon = ICONS[ev.kind] ?? Pencil;
          return (
            <li key={i} className="mb-6 ml-6">
              <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-background ${ICON_CLASSES[ev.kind] ?? ICON_CLASSES.content}`}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <div className="bg-card border border-border rounded-md p-3 shadow-sm">
                <p className="text-sm text-foreground">{ev.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">{ev.username}</span> · {formatWhen(ev.at)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
