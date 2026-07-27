"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import JSZip from "jszip";
import api, { fetcher } from "../../lib/api";
import { Paperclip, Trash2, GripVertical, Plus, File, FilePlus, ExternalLink, Loader2, MinusCircle, RotateCcw, Folder, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "../../hooks/useConfirm";
import { toBanglaDigits } from "../../lib/banglaNumerals";
import { isExecutableFile, validateFilesList, getFileExtension } from "../../lib/annexureSecurity";
import FolderViewerModal from "./FolderViewerModal";

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
    ? validAnnexures.map((an) => {
      if (type === 'resolution') {
        const sameTypeValid = validAnnexures.filter(x => !!x.is_suppli === !!an.is_suppli);
        const activeIdx = sameTypeValid.findIndex(x => x.id === an.id);
        const num = activeIdx >= 0 ? (activeIdx + 1) : (an.global_serial || an.annexure_serial);
        return `${an.is_suppli ? 'সাপ্লি: ' : ''}পরিশিষ্ট-${toBanglaDigits(num)}`;
      }
      return `${an.is_suppli ? 'সাপ্লি: ' : ''}পরিশিষ্ট-${toBanglaDigits(an.global_serial || an.annexure_serial)}`;
    }).join(', ')
    : null;

  const getDisplayName = (annexure: Annexure) => {
    const ext = getFileExtension(annexure.file_name);
    const isZip = ['zip', 'rar', '7z'].includes(ext);
    let name = annexure.file_name;
    if (isZip && name.toLowerCase().endsWith('.zip')) {
      name = name.slice(0, -4);
    }
    if (type === 'resolution') {
      if (annexure.is_excluded_in_resolution) {
        return name;
      }
      const sameTypeValid = validAnnexures.filter(an => !!an.is_suppli === !!annexure.is_suppli);
      const activeIdx = sameTypeValid.findIndex(an => an.id === annexure.id);
      const num = activeIdx >= 0 ? (activeIdx + 1) : (annexure.global_serial || annexure.annexure_serial);
      const prefix = annexure.is_suppli ? `Supple. Annexure-${num}` : `Annexure-${num}`;
      return `${prefix}. ${name}${isZip ? ' (Folder)' : ''}`;
    }
    const num = annexure.global_serial || annexure.annexure_serial;
    const prefix = annexure.is_suppli ? `Supple. Annexure-${num}` : `Annexure-${num}`;
    return `${prefix}. ${name}${isZip ? ' (Folder)' : ''}`;
  };

  const [isUploading, setIsUploading] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeFolderModal, setActiveFolderModal] = useState<{ zipUrl: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  // webkitdirectory is non-standard; React strips unknown boolean attrs so we set it imperatively.
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isExecutableFile(file.name)) {
      toast.error(`Harmful file type uploaded in annexure ('${file.name}'). Executable files and scripts are strictly prohibited.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('annexure_type', type === 'agenda' ? 'agendaItem' : type);

    try {
      // Do NOT set Content-Type manually — axios must auto-set it with the multipart boundary.
      await api.post(`/agendas/${contentId}/annexures`, formData);
      toast.success("Annexure uploaded successfully");
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload annexure");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      toast.error("No files found in the selected folder. Please select a non-empty folder.");
      return;
    }

    const validation = validateFilesList(files);
    if (!validation.valid && validation.offendingFile) {
      toast.error(`Harmful file type uploaded in annexure ('${validation.offendingFile}'). Executable files and scripts are strictly prohibited.`);
      if (folderInputRef.current) folderInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const zip = new JSZip();
      let rootFolderName = "AnnexureFolder";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = (file as any).webkitRelativePath || file.name;
        if (relativePath && relativePath.includes('/')) {
          const folderPart = relativePath.split('/')[0];
          if (folderPart) rootFolderName = folderPart;
        }
        zip.file(relativePath, file);
      }

      // JSZip returns a Blob; wrap it in a File so the browser sends the correct
      // filename and MIME type to multer (a plain Blob gets named 'blob' otherwise).
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFile = new window.File([zipBlob], `${rootFolderName}.zip`, { type: 'application/zip' });

      const formData = new FormData();
      formData.append('file', zipFile);
      formData.append('annexure_type', type === 'agenda' ? 'agendaItem' : type);

      // Do NOT set Content-Type manually — axios must auto-set it with the multipart boundary.
      await api.post(`/agendas/${contentId}/annexures`, formData);
      toast.success(`Folder '${rootFolderName}' uploaded successfully`);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload folder annexure");
    } finally {
      setIsUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = "";
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
    try {
      await api.put(`/agendas/annexures/${annexure.id}/toggle-exclude`);
      toast.success(annexure.is_excluded_in_resolution ? "Annexure restored for resolution" : "Annexure excluded from resolution");
      mutate();
    } catch (err) {
      toast.error("Failed to update resolution exclusion");
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = validAnnexures.findIndex(an => an.id === sourceId);
    const targetIndex = validAnnexures.findIndex(an => an.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newOrder = [...validAnnexures];
    const [moved] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    const updatedAnnexures = newOrder.map((an, idx) => ({
      ...an,
      annexure_serial: idx + 1
    }));

    mutate({ ...response, data: updatedAnnexures }, false);

    try {
      await api.put(`/agendas/annexures/reorder`, {
        items: updatedAnnexures.map(an => ({
          id: an.id,
          annexure_serial: an.annexure_serial
        }))
      });
      toast.success("Annexures reordered");
    } catch (err) {
      toast.error("Failed to reorder annexures");
      mutate();
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-border/40">
      <ConfirmModal />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.docx,.doc,.txt,.rtf,.odt,.xlsx,.xls,.csv,.ods,.pptx,.ppt,.odp,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.rar,.7z"
        className="hidden"
      />

      {/* webkitdirectory is set imperatively via useEffect above */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderUpload}
        multiple
        className="hidden"
      />

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Annexures {annexures.length > 0 && (
              type === 'resolution' && validAnnexures.length !== annexures.length
                ? `(${validAnnexures.length}/${annexures.length})`
                : `(${validAnnexures.length})`
            )}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {banglaAnnexureTags && (
            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {banglaAnnexureTags}
            </span>
          )}

          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                title="Upload Single File (PDF, DOCX, TXT, XLSX, Images, ZIP)"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FilePlus className="w-3 h-3" />}
                Upload File
              </button>

              <button
                onClick={() => folderInputRef.current?.click()}
                disabled={isUploading}
                className="text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                title="Upload Entire Folder with subfolders"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderPlus className="w-3 h-3" />}
                Upload Folder
              </button>
            </div>
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
            const ext = getFileExtension(annexure.file_name);
            const isZip = ['zip', 'rar', '7z'].includes(ext);

            return (
              <div
                key={annexure.id}
                draggable={!readOnly && !isResolutionView}
                onDragStart={(e) => !readOnly && !isResolutionView && handleDragStart(e, annexure.id)}
                onDragEnd={(!readOnly && !isResolutionView) ? handleDragEnd : undefined}
                onDragOver={(!readOnly && !isResolutionView) ? handleDragOver : undefined}
                onDrop={(e) => !readOnly && !isResolutionView && handleDrop(e, annexure.id)}
                className={`relative flex items-center gap-2 p-1.5 px-2.5 rounded group transition-all overflow-hidden ${isExcluded
                    ? 'bg-red-500/10 border border-red-500/30 backdrop-blur-[1px] opacity-60 hover:opacity-85'
                    : 'bg-card/40 border border-border/40 hover:border-primary/30'
                  } ${(!readOnly && !isResolutionView) ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                {!readOnly && !isResolutionView && (
                  <div className="text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`relative p-1 rounded ${isExcluded ? 'bg-red-500/20 text-red-500' : isZip ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                  {isZip ? <Folder className="w-3.5 h-3.5" /> : <File className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1 min-w-0 relative py-0.5">
                  {isExcluded && (
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-red-500/80 pointer-events-none z-10" />
                  )}
                  {annexure.url ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={annexure.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-normal hover:underline truncate block ${isExcluded ? 'text-red-400 font-medium' : 'text-foreground/80 hover:text-primary'
                          }`}
                      >
                        {getDisplayName(annexure)} {isExcluded ? ' (Excluded from Resolution)' : ''}
                      </a>
                      {isZip && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                          <Folder className="w-2.5 h-2.5" /> Folder
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-normal truncate ${isExcluded ? 'text-red-400 font-medium' : 'text-foreground/80'}`}>
                        {getDisplayName(annexure)} {isExcluded ? ' (Excluded from Resolution)' : ''}
                      </p>
                      {isZip && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                          <Folder className="w-2.5 h-2.5" /> Folder
                        </span>
                      )}
                    </div>
                  )}
                  {annexure.uploaded_by_username && (
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      Uploaded by {annexure.uploaded_by_username}
                      {annexure.upload_date ? ` · ${new Date(annexure.upload_date).toLocaleDateString()}` : ""}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 relative z-20 transition-opacity">
                  {isZip && annexure.url && (
                    <button
                      onClick={() => setActiveFolderModal({ zipUrl: annexure.url!, name: annexure.file_name })}
                      className="p-1.5 text-xs text-amber-600 hover:text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors flex items-center gap-1 font-medium"
                      title="Preview Folder Contents Online"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Browse Folder</span>
                    </button>
                  )}

                  {annexure.url && (
                    <a
                      href={annexure.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-muted-foreground hover:text-primary bg-muted rounded-md transition-colors"
                      title={isZip ? "Download Folder ZIP" : "View File"}
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

      {activeFolderModal && (
        <FolderViewerModal
          isOpen={!!activeFolderModal}
          onClose={() => setActiveFolderModal(null)}
          zipUrl={activeFolderModal.zipUrl}
          annexureName={activeFolderModal.name}
        />
      )}
    </div>
  );
}
