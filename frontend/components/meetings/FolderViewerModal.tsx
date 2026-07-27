"use client";

import { useState, useEffect } from "react";
import JSZip from "jszip";
import { X, Folder, File, FileText, Image as ImageIcon, Download, Loader2, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FolderItem {
  path: string;
  name: string;
  isFolder: boolean;
  size: number;
  zipObject?: JSZip.JSZipObject;
}

interface FolderViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  zipUrl: string;
  annexureName: string;
}

export default function FolderViewerModal({ isOpen, onClose, zipUrl, annexureName }: FolderViewerModalProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FolderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<FolderItem | null>(null);
  const [previewContent, setPreviewContent] = useState<{ type: 'text' | 'image' | 'pdf' | 'other'; data: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !zipUrl) return;

    let isMounted = true;
    setLoading(true);
    setItems([]);
    setSelectedItem(null);
    setPreviewContent(null);

    const loadZip = async () => {
      try {
        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error("Failed to download zip file");

        const buffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        
        const extractedItems: FolderItem[] = [];
        zip.forEach((relativePath, file) => {
          extractedItems.push({
            path: relativePath,
            name: relativePath.split('/').filter(Boolean).pop() || relativePath,
            isFolder: file.dir,
            size: (file as any)._data?.uncompressedSize || 0,
            zipObject: file
          });
        });

        if (isMounted) {
          // Sort folders first, then files alphabetically
          extractedItems.sort((a, b) => {
            if (a.isFolder === b.isFolder) return a.path.localeCompare(b.path);
            return a.isFolder ? -1 : 1;
          });
          setItems(extractedItems);
        }
      } catch (err: any) {
        toast.error("Failed to read folder contents: " + (err.message || "Unknown error"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadZip();

    return () => {
      isMounted = false;
    };
  }, [isOpen, zipUrl]);

  const handleSelectItem = async (item: FolderItem) => {
    if (item.isFolder || !item.zipObject) return;
    
    setSelectedItem(item);
    setPreviewLoading(true);
    setPreviewContent(null);

    const ext = (item.name.split('.').pop() || '').toLowerCase();

    try {
      if (['txt', 'csv', 'json', 'md', 'log', 'xml'].includes(ext)) {
        const text = await item.zipObject.async('text');
        setPreviewContent({ type: 'text', data: text });
      } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
        const base64 = await item.zipObject.async('base64');
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
        setPreviewContent({ type: 'image', data: `data:${mime};base64,${base64}` });
      } else if (ext === 'pdf') {
        const blob = await item.zipObject.async('blob');
        const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setPreviewContent({ type: 'pdf', data: blobUrl });
      } else {
        setPreviewContent({ type: 'other', data: '' });
      }
    } catch (err) {
      toast.error("Failed to generate file preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadSingleFile = async (item: FolderItem) => {
    if (!item.zipObject) return;
    try {
      const blob = await item.zipObject.async('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download file");
    }
  };

  if (!isOpen) return null;

  const filteredItems = items.filter(item => 
    item.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background border border-border/60 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground leading-tight">
                Folder Preview: {annexureName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length} item{items.length !== 1 && 's'} in folder · Read-only preview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={zipUrl}
              download
              className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download ZIP Folder
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 flex min-h-0 divide-x divide-border/40">
          {/* File Tree Left Sidebar */}
          <div className="w-1/3 min-w-[280px] flex flex-col bg-card/30">
            {/* Search Input */}
            <div className="p-3 border-b border-border/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search files in folder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/40 border border-border/40 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Tree Items List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs">Reading folder archive...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No files found.
                </div>
              ) : (
                filteredItems.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectItem(item)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      item.isFolder 
                        ? 'text-muted-foreground font-medium bg-muted/20 cursor-default'
                        : selectedItem?.path === item.path
                          ? 'bg-primary/15 text-primary font-semibold border border-primary/20'
                          : 'hover:bg-muted/50 cursor-pointer text-foreground/90'
                    }`}
                  >
                    {item.isFolder ? (
                      <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate flex-1 font-mono text-[11px]">{item.path}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preview Right Panel */}
          <div className="flex-1 flex flex-col bg-background/50 overflow-hidden">
            {selectedItem ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-3 px-4 border-b border-border/40 bg-muted/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <File className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold truncate text-foreground">{selectedItem.name}</span>
                  </div>
                  <button
                    onClick={() => handleDownloadSingleFile(selectedItem)}
                    className="flex items-center gap-1 text-[11px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2.5 py-1 rounded transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Download File
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                  {previewLoading ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-xs">Loading preview...</p>
                    </div>
                  ) : previewContent?.type === 'text' ? (
                    <pre className="w-full h-full p-4 bg-card border border-border/40 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-auto leading-relaxed text-foreground/90">
                      {previewContent.data}
                    </pre>
                  ) : previewContent?.type === 'image' ? (
                    <img
                      src={previewContent.data}
                      alt={selectedItem.name}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-border/40"
                    />
                  ) : previewContent?.type === 'pdf' ? (
                    <iframe
                      src={previewContent.data}
                      className="w-full h-full rounded-lg border border-border/40"
                      title={selectedItem.name}
                    />
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-medium">Inline preview not available for this file type.</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">Click 'Download File' above to view on your device.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground/70">
                <Folder className="w-12 h-12 mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium">Select a file from the list to preview</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
                  Click on any text document, image, or PDF inside the folder tree on the left to read it inline without downloading.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
