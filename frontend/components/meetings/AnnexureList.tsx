"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import { Paperclip, Trash2, GripVertical, Plus, File, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "../../hooks/useConfirm";

interface Annexure {
  id: string;
  file_name: string;
  url: string | null;
  annexure_serial: number;
  global_serial?: number | null;
  is_suppli?: boolean | null;
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

  const getDisplayName = (annexure: Annexure) => {
    const num = annexure.global_serial || annexure.annexure_serial;
    const prefix = annexure.is_suppli ? `Supple. Annexure-${num}` : `Annexure-${num}`;
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

  // Drag and drop sorting handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to prevent the dragged item from instantly disappearing from layout
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
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
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const items = [...annexures];
    const draggedIndex = items.findIndex(item => item.id === draggedId);
    const targetIndex = items.findIndex(item => item.id === targetId);

    // Reorder array
    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    // Reassign serials
    const newOrder = items.map((item, index) => ({
      id: item.id,
      annexure_serial: index + 1
    }));

    // Optimistically update UI
    mutate({ data: items.map((item, index) => ({ ...item, annexure_serial: index + 1 })) }, false);

    // Sync with backend
    try {
      await api.put(`/agendas/annexures/reorder`, { items: newOrder });
    } catch (error) {
      toast.error("Failed to save reordered annexures");
      mutate(); // revert on failure
    }
  };

  return (
    <div className="mt-3 border-t border-border/40 pt-3 animate-in fade-in duration-300">
      <ConfirmModal />
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
          <Paperclip className="w-3.5 h-3.5" /> 
          Annexures ({annexures.length})
        </h3>
        
        <div>
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          {!readOnly && (
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
          annexures.map((annexure) => (
            <div 
              key={annexure.id}
              draggable={!readOnly}
              onDragStart={(e) => !readOnly && handleDragStart(e, annexure.id)}
              onDragEnd={(!readOnly) ? handleDragEnd : undefined}
              onDragOver={(!readOnly) ? handleDragOver : undefined}
              onDrop={(e) => !readOnly && handleDrop(e, annexure.id)}
              className={`flex items-center gap-2 p-1.5 px-2.5 bg-card/40 border border-border/40 rounded group hover:border-primary/30 transition-colors ${(!readOnly) ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              {!readOnly && (
                <div className="text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="bg-muted p-1 rounded text-muted-foreground">
                <File className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                {annexure.url ? (
                  <a href={annexure.url} target="_blank" rel="noopener noreferrer" className="text-xs font-normal text-foreground/80 hover:text-primary hover:underline truncate block">
                    {getDisplayName(annexure)}
                  </a>
                ) : (
                  <p className="text-xs font-normal text-foreground/80 truncate">{getDisplayName(annexure)}</p>
                )}
                {annexure.uploaded_by_username && (
                  <p className="text-[10px] text-muted-foreground/60 truncate">
                    Uploaded by {annexure.uploaded_by_username}
                    {annexure.upload_date ? ` · ${new Date(annexure.upload_date).toLocaleDateString()}` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <button
                    onClick={() => handleDelete(annexure.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive bg-muted rounded-md transition-colors"
                    title="Delete Annexure"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
