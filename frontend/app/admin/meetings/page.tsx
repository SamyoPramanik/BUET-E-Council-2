"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import api from "../../../lib/api";
import DataTable from "../../../components/DataTable";
import SearchableSelect from "../../../components/SearchableSelect";

export default function ManageMeetingsPage() {
  const { data: response, error, mutate } = useSWR('/meetings', fetcher);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    meeting_date: "",
    type: "syndicate",
    status: "draft"
  });

  const typeOptions = [
    { value: "syndicate", label: "Syndicate" },
    { value: "academic", label: "Academic" }
  ];

  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "ongoing", label: "Ongoing" },
    { value: "past", label: "Past" },
    { value: "locked", label: "Locked" }
  ];

  const columns = [
    { key: "serial", label: "Meeting No." },
    { key: "title", label: "Meeting Serial Number" },
    { key: "status", label: "Status" },
    { key: "date", label: "Date" }
  ];

  const handleEdit = (meeting: any) => {
    setIsEditMode(true);
    setEditingId(meeting.id);
    setNewMeeting({
      title: meeting.title || "",
      meeting_date: meeting.meeting_date ? new Date(meeting.meeting_date).toISOString().split('T')[0] : "",
      type: meeting.type || "syndicate",
      status: meeting.status || "draft"
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (meeting: any) => {
    if (window.confirm("Are you sure you want to delete this meeting?")) {
      try {
        await api.delete(`/meetings/${meeting.id}`);
        mutate();
      } catch (err) {
        console.error(err);
        alert('Failed to delete meeting');
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newMeeting,
        meeting_date: new Date(newMeeting.meeting_date).toISOString() // Convert to ISO for Postgres
      };
      
      if (isEditMode && editingId) {
        await api.put(`/meetings/${editingId}`, payload);
      } else {
        await api.post('/meetings', payload);
      }
      
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setNewMeeting({ title: "", meeting_date: "", type: "syndicate", status: "draft" });
      mutate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save meeting');
    }
  };

  if (error) return <div className="p-8">Failed to load meetings</div>;
  if (!response) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <DataTable 
        columns={columns} 
        data={response.data || []} 
        title="Manage Meetings" 
        onAdd={() => {
          setIsEditMode(false);
          setEditingId(null);
          setNewMeeting({ title: "", meeting_date: "", type: "syndicate", status: "draft" });
          setIsModalOpen(true);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-xl border border-border p-6 relative">
            <h3 className="text-lg font-semibold mb-4">{isEditMode ? "Edit Meeting" : "Add New Meeting"}</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Meeting Serial Number (e.g., "304th")</label>
                <input required value={newMeeting.title} onChange={e => setNewMeeting({...newMeeting, title: e.target.value})} className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Meeting Date</label>
                <input required type="date" value={newMeeting.meeting_date} onChange={e => setNewMeeting({...newMeeting, meeting_date: e.target.value})} className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Type</label>
                  <SearchableSelect 
                    options={typeOptions}
                    value={newMeeting.type}
                    onChange={(val) => setNewMeeting({...newMeeting, type: val})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Status</label>
                  <SearchableSelect 
                    options={statusOptions}
                    value={newMeeting.status}
                    onChange={(val) => setNewMeeting({...newMeeting, status: val})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">{isEditMode ? "Update Meeting" : "Create Meeting"}</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
