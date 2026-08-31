"use client";

import { useState } from "react";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import { toast } from "sonner";
import {
  Archive,
  Search,
  PlusCircle,
  Trash2,
  X,
  Loader2,
  Calendar,
  FileText,
  CheckSquare,
  Square,
  AlertTriangle
} from "lucide-react";

interface ArchivedAgendasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMeetingId: string;
  isSuppli: boolean;
  onRestored: () => void;
}

export default function ArchivedAgendasModal({
  isOpen,
  onClose,
  currentMeetingId,
  isSuppli,
  onRestored
}: ArchivedAgendasModalProps) {
  const { data: archivedRes, mutate: mutateArchived, isLoading } = useSWR(
    isOpen ? "/agendas/archived" : null,
    fetcher
  );

  const archivedAgendas = archivedRes?.data || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredAgendas = archivedAgendas.filter((item: any) => {
    const textContent = (item.content_plain || item.content || "").toLowerCase();
    const meetingInfo = (
      (item.meeting_display_title || item.meeting_title || "") +
      " " +
      (item.meeting_number || "")
    ).toLowerCase();
    const q = searchQuery.toLowerCase();
    return textContent.includes(q) || meetingInfo.includes(q);
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAgendas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAgendas.map((item: any) => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRestore = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one archived agenda to restore.");
      return;
    }
    setRestoring(true);
    try {
      await api.post(`/agendas/meeting/${currentMeetingId}/restore-archived`, {
        agenda_ids: selectedIds,
        is_suppli: isSuppli
      });
      toast.success(
        `${selectedIds.length} agenda(s) added to current meeting successfully!`
      );
      setSelectedIds([]);
      await mutateArchived();
      onRestored();
      onClose();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to restore archived agendas"
      );
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this archived agenda? This action cannot be undone."
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(`/agendas/archived/${id}`);
      toast.success("Archived agenda deleted permanently.");
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      await mutateArchived();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to delete archived agenda"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, "").trim();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Archive Box
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                  {isSuppli ? "Restoring as Supplementary" : "Restoring as Regular Agendum"}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Select archived agendas from past meetings to add into the current meeting list.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH & BULK CONTROLS */}
        <div className="p-4 border-b border-border bg-card flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by text or meeting title/no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-input/20 border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {filteredAgendas.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-muted/50 transition-colors"
              >
                {selectedIds.length === filteredAgendas.length ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>
                  {selectedIds.length === filteredAgendas.length
                    ? "Deselect All"
                    : "Select All"}
                </span>
              </button>
            )}

            <button
              type="button"
              disabled={selectedIds.length === 0 || restoring}
              onClick={handleRestore}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {restoring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              <span>Add Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>

        {/* AGENDA ITEMS LIST */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm">Loading archive box items...</span>
            </div>
          ) : filteredAgendas.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Archive className="w-12 h-12 text-muted-foreground/30" />
              <h4 className="text-base font-semibold text-foreground">No Archived Agendas Found</h4>
              <p className="text-xs">
                {searchQuery
                  ? "No archived items match your search filter."
                  : "Items archived from any meeting will appear here."}
              </p>
            </div>
          ) : (
            filteredAgendas.map((item: any) => {
              const isSelected = selectedIds.includes(item.id);
              const previewText = stripHtml(item.content || "");
              const isItemDeleting = deletingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-4 items-start ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-border/80 hover:bg-muted/20"
                  }`}
                >
                  <div className="pt-0.5">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border flex items-center gap-1">
                        <FileText className="w-3 h-3 text-primary" />
                        Archived from: {item.meeting_display_title || item.meeting_title || `Meeting #${item.meeting_number || '?'}`}
                      </span>

                      {item.meeting_number && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                          No. {item.meeting_number}
                        </span>
                      )}

                      {item.is_suppli && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                          Supplementary
                        </span>
                      )}

                      {item.created_at && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-foreground line-clamp-3 leading-relaxed font-normal">
                      {previewText || "(Empty content)"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isItemDeleting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    title="Delete permanently from archive"
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isItemDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Total archived items: {archivedAgendas.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-input rounded-md hover:bg-muted text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
