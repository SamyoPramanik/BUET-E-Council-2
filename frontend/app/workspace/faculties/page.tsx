"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import api from "../../../lib/api";
import DataTable from "../../../components/DataTable";
import { toast } from "sonner";
import { useConfirm } from "../../../hooks/useConfirm";
import { useAuth } from "../../../hooks/useAuth";

export default function ManageFacultiesPage() {
  const { canEdit } = useAuth();
  const { data: response, error, mutate } = useSWR('/faculties', fetcher);
  const { confirm, ConfirmModal } = useConfirm();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFaculty, setNewFaculty] = useState({
    name_bangla: "",
    name_english: "",
    serial: ""
  });

  const columns = [
    { key: "serial", label: "Serial No" },
    { key: "name_bangla", label: "Name (Bangla)" },
    { key: "name_english", label: "Name (English)" },
  ];

  const handleReorder = async (newOrder: any[]) => {
    try {
      await api.put('/faculties/reorder', { items: newOrder });
      mutate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reorder faculties');
    }
  };

  const handleUploadCsv = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/faculties/upload-csv', formData, {
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
    window.location.href = `${api.defaults.baseURL}/faculties/download-csv`;
  };

  const handleEdit = (faculty: any) => {
    setIsEditMode(true);
    setEditingId(faculty.id);
    setNewFaculty({
      name_bangla: faculty.name_bangla || "",
      name_english: faculty.name_english || "",
      serial: faculty.serial ? String(faculty.serial) : ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = (faculty: any) => {
    confirm("Delete Faculty", "Are you sure you want to delete this faculty?", async () => {
      try {
        await mutate((current: any) => {
          if (!current || !current.data) return current;
          return { ...current, data: current.data.filter((item: any) => item.id !== faculty.id) };
        }, { revalidate: false });

        await api.delete(`/faculties/${faculty.id}`);
        toast.success('Faculty deleted successfully');
        await mutate();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete faculty');
        await mutate();
      }
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newFaculty,
        serial: newFaculty.serial === "" ? undefined : parseInt(newFaculty.serial, 10)
      };

      let res;
      if (isEditMode && editingId) {
        res = await api.put(`/faculties/${editingId}`, payload);
      } else {
        res = await api.post('/faculties', payload);
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
      setNewFaculty({ name_bangla: "", name_english: "", serial: "" });
      toast.success(isEditMode ? 'Faculty updated successfully' : 'Faculty created successfully');
      await mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save faculty');
      await mutate();
    }
  };

  if (error) return <div className="p-8">Failed to load faculties</div>;
  if (!response) return <div className="p-8">Loading...</div>;

  const facultiesData = (response?.data || []).map((f: any, idx: number) => ({
    ...f,
    serial: f.serial ?? idx + 1
  }));

  return (
    <div className="space-y-6">
      <ConfirmModal />
      <DataTable
        columns={columns}
        data={facultiesData}
        title="Manage Faculties"
        searchable
        searchPlaceholder="Search faculties..."
        onReorder={canEdit ? handleReorder : undefined}
        onUploadCsv={canEdit ? handleUploadCsv : undefined}
        onDownloadCsv={handleDownloadCsv}
        onAdd={canEdit ? () => {
          setIsEditMode(false);
          setEditingId(null);
          setNewFaculty({ name_bangla: "", name_english: "", serial: "" });
          setIsModalOpen(true);
        } : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-xl border border-border p-6 relative">
            <h3 className="text-lg font-semibold mb-4">{isEditMode ? "Edit Faculty" : "Add New Faculty"}</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Serial No (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 1, 2, 3 (Leave empty for auto-assign)"
                  value={newFaculty.serial}
                  onChange={e => setNewFaculty({...newFaculty, serial: e.target.value})}
                  className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Name (Bangla)</label>
                <input required value={newFaculty.name_bangla} onChange={e => setNewFaculty({...newFaculty, name_bangla: e.target.value})} className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Name (English)</label>
                <input required value={newFaculty.name_english} onChange={e => setNewFaculty({...newFaculty, name_english: e.target.value})} className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm" />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">{isEditMode ? "Update Faculty" : "Save Faculty"}</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
