"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import api from "../../../lib/api";
import DataTable from "../../../components/DataTable";
import SearchableSelect from "../../../components/SearchableSelect";
import { toast } from "sonner";
import { useConfirm } from "../../../hooks/useConfirm";
import { useAuth } from "../../../hooks/useAuth";
import { Sparkles, Loader2 } from "lucide-react";
import { translateText } from "../../../lib/translator";

export default function ManageDepartmentsPage() {
  const { canEdit } = useAuth();
  const { data: response, error, mutate } = useSWR('/departments', fetcher);
  const { confirm, ConfirmModal } = useConfirm();
  const { data: facultyRes } = useSWR('/faculties', fetcher);
  
  const faculties = facultyRes?.data || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [newDepartment, setNewDepartment] = useState({
    name_bangla: "",
    name_english: "",
    alias_bangla: "",
    alias_english: "",
    faculty_id: "",
    serial: ""
  });

  const handleTranslateName = async (sourceField: 'name_bangla' | 'name_english') => {
    const text = newDepartment[sourceField];
    if (!text.trim()) return;
    setIsTranslating(true);
    try {
      const targetLang = sourceField === 'name_bangla' ? 'en' : 'bn';
      const translated = await translateText(text, targetLang);
      if (translated) {
        if (sourceField === 'name_bangla') {
          const aliasEn = translated.replace(/department of /i, '').trim();
          setNewDepartment(prev => ({
            ...prev,
            name_english: prev.name_english || translated,
            alias_english: prev.alias_english || aliasEn
          }));
        } else {
          const aliasBn = translated.replace(/বিভাগ/g, '').trim();
          setNewDepartment(prev => ({
            ...prev,
            name_bangla: prev.name_bangla || translated,
            alias_bangla: prev.alias_bangla || aliasBn
          }));
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
    { key: "name_bangla", label: "Department Name (Bangla)" },
    { key: "faculty_name_bangla", label: "Faculty (Bangla)" },
  ];

  const handleReorder = async (newOrder: any[]) => {
    try {
      await api.put('/departments/reorder', { items: newOrder });
      mutate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reorder departments');
    }
  };

  const handleUploadCsv = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/departments/upload-csv', formData, {
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
    window.location.href = `${api.defaults.baseURL}/departments/download-csv`;
  };

  const handleEdit = (department: any) => {
    setIsEditMode(true);
    setEditingId(department.id);
    setNewDepartment({
      name_bangla: department.name_bangla || "",
      name_english: department.name_english || "",
      alias_bangla: department.alias_bangla || "",
      alias_english: department.alias_english || "",
      faculty_id: department.faculty_id || "",
      serial: department.serial != null ? String(department.serial) : ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = (department: any) => {
    confirm("Delete Department", "Are you sure you want to delete this department?", async () => {
      try {
        await mutate((current: any) => {
          if (!current || !current.data) return current;
          return { ...current, data: current.data.filter((item: any) => item.id !== department.id) };
        }, { revalidate: false });

        await api.delete(`/departments/${department.id}`);
        toast.success('Department deleted successfully');
        await mutate();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete department');
        await mutate();
      }
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newDepartment,
        serial: newDepartment.serial === "" ? undefined : parseInt(newDepartment.serial, 10)
      };

      let res;
      if (isEditMode && editingId) {
        res = await api.put(`/departments/${editingId}`, payload);
      } else {
        res = await api.post('/departments', payload);
      }

      const savedItem = res.data?.data;
      if (savedItem) {
        const selectedFaculty = (facultyRes?.data || []).find((f: any) => f.id === payload.faculty_id);
        const formattedSaved = {
          ...savedItem,
          faculty_name_bangla: selectedFaculty ? selectedFaculty.name_bangla : ""
        };

        await mutate((current: any) => {
          if (!current || !current.data) return current;
          const list = current.data;
          return {
            ...current,
            data: isEditMode
              ? list.map((item: any) => item.id === editingId ? { ...item, ...formattedSaved } : item)
              : [formattedSaved, ...list]
          };
        }, { revalidate: false });
      }

      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setNewDepartment({ name_bangla: "", name_english: "", alias_bangla: "", alias_english: "", faculty_id: "", serial: "" });
      toast.success(isEditMode ? 'Department updated successfully' : 'Department created successfully');
      await mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save department');
      await mutate();
    }
  };

  if (error) return <div className="p-8">Failed to load departments</div>;
  if (!response) return <div className="p-8">Loading...</div>;

  const departmentsData = (response?.data || []).map((d: any, idx: number) => ({
    ...d,
    serial: d.serial ?? idx + 1,
    faculty_name_bangla: d.faculty_name_bangla || d.faculty_name || ""
  }));

  return (
    <div className="space-y-6">
      <ConfirmModal />
      <DataTable
        columns={columns}
        data={departmentsData}
        title="Manage Departments"
        searchable
        searchPlaceholder="Search departments..."
        onReorder={canEdit ? handleReorder : undefined}
        onUploadCsv={canEdit ? handleUploadCsv : undefined}
        onDownloadCsv={handleDownloadCsv}
        onAdd={canEdit ? () => {
          setIsEditMode(false);
          setEditingId(null);
          setNewDepartment({ name_bangla: "", name_english: "", alias_bangla: "", alias_english: "", faculty_id: "", serial: "" });
          setIsModalOpen(true);
        } : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-lg shadow-xl border border-border p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isEditMode ? "Edit Department" : "Add New Department"}</h3>
              {isTranslating && (
                <span className="flex items-center gap-1 text-xs text-amber-500 font-medium animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Translating...
                </span>
              )}
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Name (Bangla)</label>
                    <button
                      type="button"
                      onClick={() => handleTranslateName('name_bangla')}
                      disabled={isTranslating || !newDepartment.name_bangla}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" /> Translate
                    </button>
                  </div>
                  <input
                    required
                    value={newDepartment.name_bangla}
                    onChange={e => setNewDepartment({...newDepartment, name_bangla: e.target.value})}
                    onBlur={async () => {
                      if (newDepartment.name_bangla && !newDepartment.name_english) {
                        handleTranslateName('name_bangla');
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
                      onClick={() => handleTranslateName('name_english')}
                      disabled={isTranslating || !newDepartment.name_english}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" /> Translate
                    </button>
                  </div>
                  <input
                    required
                    value={newDepartment.name_english}
                    onChange={e => setNewDepartment({...newDepartment, name_english: e.target.value})}
                    onBlur={async () => {
                      if (newDepartment.name_english && !newDepartment.name_bangla) {
                        handleTranslateName('name_english');
                      }
                    }}
                    className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Alias (Bangla)</label>
                  <input required value={newDepartment.alias_bangla} onChange={e => setNewDepartment({...newDepartment, alias_bangla: e.target.value})} className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Alias (English)</label>
                  <input required value={newDepartment.alias_english} onChange={e => setNewDepartment({...newDepartment, alias_english: e.target.value})} className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Faculty</label>
                  <SearchableSelect
                    options={faculties.map((f: any) => ({ value: f.id, label: f.name_english }))}
                    value={newDepartment.faculty_id}
                    onChange={(val) => setNewDepartment({...newDepartment, faculty_id: val})}
                    placeholder="Select Faculty..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Serial No</label>
                  <input
                    type="number"
                    min={1}
                    value={newDepartment.serial}
                    onChange={e => setNewDepartment({...newDepartment, serial: e.target.value})}
                    placeholder="Auto-assigned if left blank"
                    className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">{isEditMode ? "Update Department" : "Save Department"}</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
