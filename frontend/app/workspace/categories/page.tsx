"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import api from "../../../lib/api";
import DataTable from "../../../components/DataTable";
import { toast } from "sonner";
import { useConfirm } from "../../../hooks/useConfirm";
import { Plus } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

export default function ManageCategoriesPage() {
  const { canManageTemplates: canEdit } = useAuth();
  const { data: response, error, mutate } = useSWR('/categories', fetcher);
  const { confirm, ConfirmModal } = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    serial: ""
  });

  const columns = [
    { key: "serial", label: "Serial" },
    { key: "name", label: "Category Name" }
  ];

  const categories = response?.data || [];

  const tableData = categories.map((c: any, index: number) => ({
    ...c,
    serial: c.serial ?? index + 1
  }));

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      name: "",
      serial: String(categories.length + 1)
    });
    setIsModalOpen(true);
  };

  const handleEdit = (row: any) => {
    setIsEditMode(true);
    setEditingId(row.id);
    setFormData({
      name: row.name || "",
      serial: row.serial !== undefined && row.serial !== null ? String(row.serial) : ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = (row: any) => {
    confirm("Delete Category", `Are you sure you want to delete category "${row.name}"?`, async () => {
      try {
        await mutate((current: any) => {
          if (!current || !current.data) return current;
          return { ...current, data: current.data.filter((item: any) => item.id !== row.id) };
        }, { revalidate: false });

        await api.delete(`/categories/${row.id}`);
        toast.success("Category deleted successfully");
        await mutate();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to delete category");
        await mutate();
      }
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    const trimmedName = formData.name.trim();
    const inputSerial = formData.serial ? parseInt(formData.serial, 10) : undefined;

    // Check duplicate name locally
    const duplicateName = categories.find(
      (c: any) => c.id !== editingId && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      toast.error(`Category "${trimmedName}" already exists. Category was not added.`);
      return;
    }

    // Check duplicate serial locally
    if (inputSerial !== undefined && !isNaN(inputSerial)) {
      const duplicateSerial = categories.find(
        (c: any) => c.id !== editingId && Number(c.serial) === inputSerial
      );
      if (duplicateSerial) {
        toast.error(`Serial ${inputSerial} is already assigned to category "${duplicateSerial.name}". Category was not added.`);
        return;
      }
    }

    try {
      const payload = {
        name: trimmedName,
        serial: inputSerial
      };

      if (isEditMode && editingId) {
        await api.put(`/categories/${editingId}`, payload);
        toast.success("Category updated successfully");
      } else {
        await api.post("/categories", payload);
        toast.success("Category created successfully");
      }

      setIsModalOpen(false);
      await mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save category");
      await mutate();
    }
  };

  if (error) return <div className="p-8 text-destructive">Failed to load categories.</div>;
  if (!response) return <div className="p-8 text-muted-foreground animate-pulse">Loading categories...</div>;

  return (
    <div className="space-y-6">
      <ConfirmModal />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">Manage Categories</h2>
          <p className="text-muted-foreground mt-1 text-sm">Create and organize category groups for agenda items.</p>
        </div>
        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Category
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-xl border border-border flex flex-col">
            <div className="p-6 border-b border-border shrink-0 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{isEditMode ? "Edit Category" : "Add New Category"}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. (উপাচার্য মহোদয় কর্তৃক গৃহীত ব্যবস্থা)"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Order Serial</label>
                <input
                  type="number"
                  value={formData.serial}
                  onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border shrink-0 flex justify-end gap-3 bg-muted/30">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md shadow-sm transition-colors"
              >
                {isEditMode ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
