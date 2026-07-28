"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import api from "../../../lib/api";
import DataTable from "../../../components/DataTable";
import { toast } from "sonner";
import { useConfirm } from "../../../hooks/useConfirm";
import { useAuth } from "../../../hooks/useAuth";
import { Sparkles, Loader2 } from "lucide-react";
import { translateText, autoFillBilingualFields } from "../../../lib/translator";

export default function ManageOfficesPage() {
  const { canEdit } = useAuth();
  const { data: response, error, mutate } = useSWR('/offices', fetcher);
  const { confirm, ConfirmModal } = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [newOffice, setNewOffice] = useState({
    name_bangla: "",
    name_english: ""
  });

  const handleTranslate = async (sourceField: 'name_bangla' | 'name_english') => {
    const text = newOffice[sourceField];
    if (!text.trim()) return;
    setIsTranslating(true);
    try {
      const targetLang = sourceField === 'name_bangla' ? 'en' : 'bn';
      const translated = await translateText(text, targetLang);
      if (translated) {
        if (sourceField === 'name_bangla') {
          setNewOffice(prev => ({ ...prev, name_english: prev.name_english || translated }));
        } else {
          setNewOffice(prev => ({ ...prev, name_bangla: prev.name_bangla || translated }));
        }
        toast.success("Translated successfully!");
      }
    } catch (e) {
      toast.error("Translation failed");
    } finally {
      setIsTranslating(false);
    }
  };

  const columns = [
    { key: "serial", label: "Serial No" },
    { key: "name_english", label: "Office Name" },
    { key: "name_bangla", label: "Office Name (Bangla)" },
  ];

  const handleReorder = async (newOrder: any[]) => {
    try {
      await api.put('/offices/reorder', { items: newOrder });
      mutate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reorder offices');
    }
  };

  const handleUploadCsv = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/offices/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      mutate();
      toast.success('CSV uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload CSV');
    }
  };

  const handleDownloadCsv = () => {
    window.location.href = `${api.defaults.baseURL}/offices/download-csv`;
  };

  const handleEdit = (office: any) => {
    setIsEditMode(true);
    setEditingId(office.id);
    setNewOffice({ name_bangla: office.name_bangla, name_english: office.name_english });
    setIsModalOpen(true);
  };

  const handleDelete = (office: any) => {
    confirm("Delete Office", "Are you sure you want to delete this office?", async () => {
      try {
        await mutate((current: any) => {
          if (!current || !current.data) return current;
          return { ...current, data: current.data.filter((item: any) => item.id !== office.id) };
        }, { revalidate: false });

        await api.delete(`/offices/${office.id}`);
        toast.success('Office deleted successfully');
        await mutate();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete office');
        await mutate();
      }
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (isEditMode && editingId) {
        res = await api.put(`/offices/${editingId}`, newOffice);
      } else {
        res = await api.post('/offices', newOffice);
      }

      const savedItem = res.data?.data;
      if (savedItem) {
        await mutate((current: any) => {
          if (!current || !current.data) return current;
          const list = current.data;
          return {
            ...current,
            data: isEditMode
              ? list.map((item: any) => item.id === editingId ? { ...item, ...savedItem } : item)
              : [savedItem, ...list]
          };
        }, { revalidate: false });
      }

      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setNewOffice({ name_bangla: "", name_english: "" });
      toast.success(isEditMode ? 'Office updated successfully' : 'Office created successfully');
      await mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save office');
      await mutate();
    }
  };

  if (error) return <div className="p-8">Failed to load offices</div>;
  if (!response) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <ConfirmModal />
      <DataTable
        columns={columns}
        data={response.data || []}
        title="Manage Offices"
        searchable
        searchPlaceholder="Search offices..."
        onReorder={canEdit ? handleReorder : undefined}
        onUploadCsv={canEdit ? handleUploadCsv : undefined}
        onDownloadCsv={handleDownloadCsv}
        onAdd={canEdit ? () => {
          setIsEditMode(false);
          setEditingId(null);
          setNewOffice({ name_bangla: "", name_english: "" });
          setIsModalOpen(true);
        } : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-xl border border-border p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isEditMode ? "Edit Office" : "Add New Office"}</h3>
              {isTranslating && (
                <span className="flex items-center gap-1 text-xs text-amber-500 font-medium animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Translating...
                </span>
              )}
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Name (Bangla)</label>
                  <button
                    type="button"
                    onClick={() => handleTranslate('name_bangla')}
                    disabled={isTranslating || !newOffice.name_bangla}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" /> Translate to English
                  </button>
                </div>
                <input
                  required
                  value={newOffice.name_bangla}
                  onChange={e => setNewOffice({...newOffice, name_bangla: e.target.value})}
                  onBlur={async () => {
                    if (newOffice.name_bangla && !newOffice.name_english) {
                      handleTranslate('name_bangla');
                    }
                  }}
                  className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Name (English)</label>
                  <button
                    type="button"
                    onClick={() => handleTranslate('name_english')}
                    disabled={isTranslating || !newOffice.name_english}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" /> Translate to Bangla
                  </button>
                </div>
                <input
                  required
                  value={newOffice.name_english}
                  onChange={e => setNewOffice({...newOffice, name_english: e.target.value})}
                  onBlur={async () => {
                    if (newOffice.name_english && !newOffice.name_bangla) {
                      handleTranslate('name_english');
                    }
                  }}
                  className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80">Cancel</button>
                <button type="submit" disabled={isTranslating} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">{isEditMode ? "Update Office" : "Save Office"}</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
