"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import { Paperclip, Trash2, GripVertical, Plus, File, ExternalLink, Loader2, MinusCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "../../hooks/useConfirm";
import { toBanglaDigits } from "../../lib/banglaNumerals";

interface Annexure {
  id: string;
  file_name: string;
  url: string | null;
  annexure_serial: number;
  global_serial?: number | null;
  is_suppli?: boolean | null;
  is_excluded_in_resolution?: boolean;
  uploaded_by_username?: string | null;
  upload_date?: string | null;
}

interface AnnexureListProps {
  contentId: string;
  type: 'agenda' | 'resolution';
  readOnly?: boolean;
}

export default function AnnexureList({ contentId, type, readOnly = false }: AnnexureListProps) {
  const { data: response, mutate } = useSWR(`/agendas/${contentId}/annexures?type=${type}`, fetcher, { fallbackData: { data: [] } });
  const annexures: Annexure[] = response?.data || [];

  const validAnnexures = (type === 'resolution'
    ? annexures.filter(an => !an.is_excluded_in_resolution)
    : annexures
  ).sort((a, b) => (a.global_serial || a.annexure_serial) - (b.global_serial || b.annexure_serial));

  const banglaAnnexureTags = validAnnexures.length > 0
    ? validAnnexures.map(an => `পরিশিষ্ট-${toBanglaDigits(an.global_serial || an.annexure_serial)}`).join(', ')
    : null;

  const getDisplayName = (annexure: Annexure) => {
    const num = annexure.global_serial || annexure.annexure_serial;
    const prefix = (type !== 'resolution' && annexure.is_suppli) ? `Supple. Annexure-${num}` : `Annexure-${num}`;
    return `${prefix}. ${annexure.file_name}`;
  };
  
  const [isUploading, setIsUploading] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    // Postgres enum requires 'agendaItem' for agendas
    formData.append('annexure_type', type === 'agenda' ? 'agendaItem' : type);

    try {
      await api.post(`/agendas/${contentId}/annexures`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Annexure uploaded successfully");
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload annexure");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: string) => {
    confirm("Delete Annexure", "Are you sure you want to delete this annexure? This cannot be undone.", async () => {
      try {
        await api.delete(`/agendas/annexures/${id}`);
        toast.success("Annexure deleted successfully");
        mutate();
      } catch (err) {
        toast.error("Failed to delete annexure");
      }
    });
  };

  const handleToggleExclude = async (annexure: Annexure) => {
    const isExcluded = !!annexure.is_excluded_in_resolution;
    const action = isExcluded ? 'revoke' : 'exclude';

    const updatedAnnexures = annexures.map(an => 
      an.id === annexure.id ? { ...an, is_excluded_in_resolution: !isExcluded } : an
    );
    mutate({ ...response, data: updatedAnnexures }, false);

    try {
      await api.delete(`/agendas/annexures/${annexure.id}?mode=resolution&action=${action}`);
      toast.success(isExcluded ? "Annexure restored in resolution" : "Annexure excluded from resolution");
      mutate();
    } catch (err) {
      toast.error("Failed to update annexure resolution status");
      mutate();
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.4';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const items = [...annexures];
    const draggedIndex = items.findIndex(item => item.id === draggedId);
    const targetIndex = items.findIndex(item => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [reorderedItem] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, reorderedItem);

    mutate({ data: items.map((item, index) => ({ ...item, annexure_serial: index + 1 })) }, false);

    try {
      const newOrder = items.map((item, index) => ({
        id: item.id,
        annexure_serial: index + 1
      }));
      await api.put('/agendas/annexures/reorder', { items: newOrder });
      toast.success("Annexures reordered successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to reorder annexures");
      mutate();
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <ConfirmModal />
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Annexures {annexures.length > 0 && `(${validAnnexures.length}/${annexures.length})`}
          </h4>
        </div>
        
        <div className="flex items-center gap-2">
          {banglaAnnexureTags && (
            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {banglaAnnexureTags}
            </span>
          )}

          {!readOnly && type === 'agenda' && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-[11px] font-medium bg-secondary/80 text-secondary-foreground hover:bg-secondary px-2.5 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add Annexure
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {annexures.length === 0 ? (
          <div className="text-center py-3 bg-muted/20 border border-dashed border-border/40 rounded">
            <p className="text-[11px] text-muted-foreground/70">No annexures attached yet.</p>
          </div>
        ) : (
          annexures.map((annexure) => {
            const isResolutionView = type === 'resolution';
            const isExcluded = isResolutionView && !!annexure.is_excluded_in_resolution;

            return (
              <div 
                key={annexure.id}
                draggable={!readOnly && !isResolutionView}
                onDragStart={(e) => !readOnly && !isResolutionView && handleDragStart(e, annexure.id)}
                onDragEnd={(!readOnly && !isResolutionView) ? handleDragEnd : undefined}
                onDragOver={(!readOnly && !isResolutionView) ? handleDragOver : undefined}
                onDrop={(e) => !readOnly && !isResolutionView && handleDrop(e, annexure.id)}
                className={`relative flex items-center gap-2 p-1.5 px-2.5 rounded group transition-all overflow-hidden ${
                  isExcluded 
                    ? 'bg-red-500/10 border border-red-500/30 backdrop-blur-[1px] opacity-60 hover:opacity-85' 
                    : 'bg-card/40 border border-border/40 hover:border-primary/30'
                } ${(!readOnly && !isResolutionView) ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                {!readOnly && !isResolutionView && (
                  <div className="text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                )}
                
                <div className={`relative p-1 rounded ${isExcluded ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground'}`}>
                  <File className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0 relative py-0.5">
                  {isExcluded && (
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-red-500/80 pointer-events-none z-10" />
                  )}
                  {annexure.url ? (
                    <a 
                      href={annexure.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`text-xs font-normal hover:underline truncate block ${
                        isExcluded ? 'text-red-400 font-medium' : 'text-foreground/80 hover:text-primary'
                      }`}
                    >
                      {getDisplayName(annexure)} {isExcluded ? ' (Excluded from Resolution)' : ''}
                    </a>
                  ) : (
                    <p className={`text-xs font-normal truncate ${isExcluded ? 'text-red-400 font-medium' : 'text-foreground/80'}`}>
                      {getDisplayName(annexure)} {isExcluded ? ' (Excluded from Resolution)' : ''}
                    </p>
                  )}
                  {annexure.uploaded_by_username && (
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      Uploaded by {annexure.uploaded_by_username}
                      {annexure.upload_date ? ` · ${new Date(annexure.upload_date).toLocaleDateString()}` : ""}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 relative z-20 transition-opacity">
                  {annexure.url && (
                    <a 
                      href={annexure.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 text-muted-foreground hover:text-primary bg-muted rounded-md transition-colors"
                      title="View File"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  
                  {!readOnly && (
                    isResolutionView ? (
                      isExcluded ? (
                        <button
                          onClick={() => handleToggleExclude(annexure)}
                          className="p-1.5 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors flex items-center gap-1 font-medium"
                          title="Revoke Exclusion (Restore in Resolution)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleExclude(annexure)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 bg-muted rounded-md transition-colors"
                          title="Exclude from Resolution"
                        >
                          <MinusCircle className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleDelete(annexure.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive bg-muted rounded-md transition-colors"
                        title="Delete Annexure"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
