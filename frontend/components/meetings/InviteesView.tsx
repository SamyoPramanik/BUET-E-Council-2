"use client";

import { useState } from "react";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import { Mail, Plus, CheckCircle, Clock, Trash2, Users } from "lucide-react";
import SearchableSelect from "../SearchableSelect";
import DataTable from "../DataTable";
import TakeAttendanceView from "./TakeAttendanceView";
import { toast } from "sonner";
import { useConfirm } from "../../hooks/useConfirm";

export default function InviteesView({ meeting, type, mutate }: { meeting: any, type: string, mutate: any }) {
  const isPast = meeting.status === 'past';
  const displayType = isPast ? 'Presentees' : 'Invitees';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddPresenteeModalOpen, setIsAddPresenteeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  // Fetch members for the Add Presentee modal
  const { data: membersRes } = useSWR('/members', fetcher);
  const allMembers = membersRes?.data || [];

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSavingPresentees, setIsSavingPresentees] = useState(false);
  const [editingPresentee, setEditingPresentee] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', designation: '', department_id: '', office_id: '' });
  const [isUpdatingPresentee, setIsUpdatingPresentee] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', prefix: '', designation: '', department_id: '', office_id: '' });
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  const { data: departmentsRes } = useSWR('/departments', fetcher);
  const { data: officesRes } = useSWR('/offices', fetcher);
  const departments = departmentsRes?.data || [];
  const offices = officesRes?.data || [];

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterOffice, setFilterOffice] = useState("");

  const uniqueDesignations = Array.from(new Set(allMembers.map((m: any) => m.designation).filter(Boolean)));
  const uniqueDepartments = Array.from(new Set(allMembers.map((m: any) => m.department_name).filter(Boolean)));
  const uniqueOffices = Array.from(new Set(allMembers.map((m: any) => m.office_name).filter(Boolean)));

  const filteredMembers = allMembers.filter((m: any) => {
    const matchesSearch = (m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.designation?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDesignation = filterDesignation ? m.designation === filterDesignation : true;
    const matchesDepartment = filterDepartment ? m.department_name === filterDepartment : true;
    const matchesOffice = filterOffice ? m.office_name === filterOffice : true;
    return matchesSearch && matchesDesignation && matchesDepartment && matchesOffice;
  });

  // Dynamically fetch invitees or presentees
  const fetchUrl = isPast ? `/meetings/${meeting.id}/presentees` : `/meetings/${meeting.id}/invitees`;
  const { data: inviteesRes, mutate: mutateInvitees } = useSWR(fetchUrl, fetcher, { fallbackData: { data: [] } });
  const invitees = inviteesRes?.data || [];

  const columns = isPast ? [
    { key: "name", label: "Name" },
    { key: "designation", label: "Designation" },
    { key: "department_name", label: "Department" },
    { key: "office_name", label: "Office" }
  ] : [
    { key: "name", label: "Name" },
    { key: "designation", label: "Designation" },
    { key: "department_name", label: "Department" },
    { key: "office_name", label: "Office" },
    {
      key: "email_sent",
      label: "Agenda Sent",
      render: (val: any) => val ? (
        <span className="inline-flex items-center gap-1 bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" /> Sent
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-medium">
          <Clock className="w-3 h-3" /> Not Sent
        </span>
      )
    }
  ];

  const [isFetching, setIsFetching] = useState(false);

  const handleRemove = (inviteeId: string) => {
    confirm("Remove Entry", "Are you sure you want to remove this entry?", async () => {
      try {
        if (isPast) {
            await api.delete(`/meetings/${meeting.id}/presentees/${inviteeId}`);
            mutateInvitees();
            toast.success("Presentee removed successfully");
        } else {
            await api.delete(`/meetings/${meeting.id}/invitees/${inviteeId}`);
            mutateInvitees();
            toast.success("Invitee removed successfully");
        }
      } catch (err) {
        toast.error("Failed to remove");
      }
    });
  };

  const handleBulkFetch = () => {
    confirm("Fetch Members", `Are you sure you want to fetch all ${meeting.type} members into this meeting's invitee list?`, async () => {
      setIsFetching(true);
      try {
        const res = await api.post(`/meetings/${meeting.id}/invitees/bulk-fetch`);
        toast.success(res.data.message || "Members fetched successfully");
        mutateInvitees();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to fetch members");
      } finally {
        setIsFetching(false);
      }
    });
  };

  const handleSaveAttendance = async (presentIds: string[]) => {
    setIsSavingAttendance(true);
    try {
      await api.put(`/meetings/${meeting.id}/attendance`, { present_invitee_ids: presentIds });
      toast.success("Attendance saved successfully");
      setIsTakingAttendance(false);
      mutateInvitees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save attendance");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleAddPresentees = async () => {
    setIsSavingPresentees(true);
    try {
      // Find presentees to remove (they are in invitees but their member.id is NOT in selectedMembers)
      const presenteesToRemove = invitees.filter((p: any) => {
        const matchedMember = allMembers.find((m: any) => p.name === m.name && p.designation === m.designation);
        if (matchedMember) {
          return !selectedMembers.includes(matchedMember.id);
        }
        return false; // don't remove custom presentees that don't match any member
      });

      // Find presentees to add (they are in selectedMembers but NOT in invitees)
      const presenteesToAdd = allMembers
        .filter((m: any) => selectedMembers.includes(m.id))
        .filter((m: any) => !invitees.some((p: any) => p.name === m.name && p.designation === m.designation))
        .map((m: any) => ({
            name: m.name,
            designation: m.designation,
            department_id: m.department_id,
            office_id: m.office_id
        }));

      // Delete removed ones
      for (const p of presenteesToRemove) {
        await api.delete(`/meetings/${meeting.id}/presentees/${p.id}`);
      }

      // Add new ones
      if (presenteesToAdd.length > 0) {
        await api.post(`/meetings/${meeting.id}/presentees`, { presentees: presenteesToAdd });
      }

      toast.success("Presentees synced successfully");
      setIsAddPresenteeModalOpen(false);
      mutateInvitees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to sync presentees");
    } finally {
      setIsSavingPresentees(false);
    }
  };

  const handleCreateCustomPresentee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCustom(true);
    try {
      const nameWithPrefix = customForm.prefix ? `${customForm.prefix} ${customForm.name}` : customForm.name;
      const presenteeToAdd = {
        name: nameWithPrefix,
        designation: customForm.designation,
        department_id: customForm.department_id || null,
        office_id: customForm.office_id || null
      };
      
      await api.post(`/meetings/${meeting.id}/presentees`, { presentees: [presenteeToAdd] });
      toast.success("Custom presentee added successfully");
      setIsCreatingCustom(false);
      setIsAddPresenteeModalOpen(false);
      setCustomForm({ name: '', prefix: '', designation: '', department_id: '', office_id: '' });
      mutateInvitees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add custom presentee");
    } finally {
      setIsSavingCustom(false);
    }
  };

  const handleUpdatePresentee = async () => {
    setIsUpdatingPresentee(true);
    try {
      await api.put(`/meetings/${meeting.id}/presentees/${editingPresentee.id}`, editForm);
      toast.success("Presentee updated successfully");
      setEditingPresentee(null);
      mutateInvitees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update presentee");
    } finally {
      setIsUpdatingPresentee(false);
    }
  };

  const handleEditClick = (row: any) => {
    setEditingPresentee(row);
    setEditForm({
      name: row.name || '',
      designation: row.designation || '',
      department_id: row.department_id || '',
      office_id: row.office_id || ''
    });
  };

  if (isTakingAttendance) {
    return (
      <TakeAttendanceView 
        invitees={invitees} 
        onSave={handleSaveAttendance} 
        onCancel={() => setIsTakingAttendance(false)}
        isSaving={isSavingAttendance}
      />
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmModal />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold capitalize">{displayType}</h2>

        <div className="flex items-center gap-4">
          {!isPast ? (
            <>
              <button 
                onClick={() => setIsTakingAttendance(true)}
                className="border border-primary text-primary px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/5 transition-colors"
              >
                Take Attendance
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkFetch}
                  disabled={isFetching}
                  className="bg-accent text-accent-foreground border border-border px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 hover:bg-accent/80 transition-opacity disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {isFetching ? "Fetching..." : "Fetch From Members"}
                </button>
                <button className="bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity">
                  <Mail className="w-4 h-4" />
                  Send Agenda
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Add Invitee
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => {
                // Initialize selectedMembers with already added presentees
                const initiallySelected = allMembers
                  .filter((m: any) => invitees.some((p: any) => p.name === m.name && p.designation === m.designation))
                  .map((m: any) => m.id);
                setSelectedMembers(initiallySelected);
                setIsAddPresenteeModalOpen(true);
              }}
              className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Presentee
            </button>
          )}
        </div>
      </div>

      {invitees.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-lg shadow-sm">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No {displayType} added yet</h3>
          <p className="text-muted-foreground mt-1">Click the add button above to include participants.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={invitees}
          onEdit={isPast ? handleEditClick : undefined}
          onDelete={(row) => handleRemove(row.id)}
        />
      )}

      {/* Add Modal Placeholder */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-lg shadow-xl border border-border overflow-hidden">
            <div className="flex border-b border-border">
              <button
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'search' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
                onClick={() => setActiveTab('search')}
              >
                Search Members
              </button>
              <button
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'custom' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
                onClick={() => setActiveTab('custom')}
              >
                Create Custom
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'search' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Search and select an existing member from the database.</p>
                  <SearchableSelect options={[]} value="" onChange={() => { }} placeholder="Search members by name..." />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Add an external guest manually.</p>
                  <input placeholder="Full Name" className="w-full px-3 py-2 bg-input/20 border border-input rounded-md text-sm" />
                  <input placeholder="Email Address" type="email" className="w-full px-3 py-2 bg-input/20 border border-input rounded-md text-sm" />
                  <input placeholder="Designation" className="w-full px-3 py-2 bg-input/20 border border-input rounded-md text-sm" />
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80">Cancel</button>
                <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">Add to Meeting</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Presentee Modal */}
      {isAddPresenteeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-lg shadow-xl border border-border flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold">Add Presentees</h2>
              <button onClick={() => setIsAddPresenteeModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                &times;
              </button>
            </div>
            <div className="p-4 border-b border-border flex flex-col gap-3 shrink-0 bg-muted/20">
              <input 
                type="text" 
                placeholder="Search by name or designation..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-input/20 border border-input rounded-md text-sm"
              />
              <div className="grid grid-cols-3 gap-3">
                <SearchableSelect 
                  options={[
                    { value: "", label: "All Designations" },
                    ...uniqueDesignations.map((des: any) => ({ value: des, label: des }))
                  ]}
                  value={filterDesignation} 
                  onChange={setFilterDesignation}
                  placeholder="Filter Designation"
                />
                <SearchableSelect 
                  options={[
                    { value: "", label: "All Departments" },
                    ...uniqueDepartments.map((dep: any) => ({ value: dep, label: dep }))
                  ]}
                  value={filterDepartment} 
                  onChange={setFilterDepartment}
                  placeholder="Filter Department"
                />
                <SearchableSelect 
                  options={[
                    { value: "", label: "All Offices" },
                    ...uniqueOffices.map((off: any) => ({ value: off, label: off }))
                  ]}
                  value={filterOffice} 
                  onChange={setFilterOffice}
                  placeholder="Filter Office"
                />
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                {filteredMembers.map((member: any) => {
                  const isAlreadyAdded = invitees.some((p: any) => p.name === member.name && p.designation === member.designation);
                  return (
                    <label key={member.id} className={`flex items-center gap-3 p-3 rounded-md border border-border ${isAlreadyAdded ? 'bg-muted/10' : 'hover:bg-muted/30'} cursor-pointer`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-input"
                        checked={selectedMembers.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers(prev => [...prev, member.id]);
                          } else {
                            setSelectedMembers(prev => prev.filter(id => id !== member.id));
                          }
                        }}
                      />
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {member.name}
                          {isAlreadyAdded && <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">Added</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {member.designation} 
                          {member.department_name ? ` • ${member.department_name}` : ''}
                          {member.office_name ? ` • ${member.office_name}` : ''}
                        </div>
                      </div>
                    </label>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    <p className="mb-4">No members match the filters.</p>
                    <button 
                      onClick={() => setIsCreatingCustom(true)}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" /> Create Custom Presentee
                    </button>
                  </div>
                )}
              </div>
            </div>
            {filteredMembers.length > 0 && (
              <div className="p-6 border-t border-border shrink-0 flex justify-between items-center gap-3">
                <button 
                  onClick={() => setIsCreatingCustom(true)}
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Create Custom
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsAddPresenteeModalOpen(false)} 
                    className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddPresentees}
                    disabled={isSavingPresentees || selectedMembers.length === 0}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                  >
                    {isSavingPresentees ? "Adding..." : `Add Selected (${selectedMembers.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Custom Presentee Modal */}
      {isCreatingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-lg shadow-xl border border-border p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Custom Presentee</h3>
            <form onSubmit={handleCreateCustomPresentee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Name</label>
                  <input 
                    required
                    type="text" 
                    value={customForm.name}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Prefix</label>
                  <input 
                    type="text" 
                    value={customForm.prefix}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, prefix: e.target.value }))}
                    className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Designation</label>
                <SearchableSelect 
                  options={[
                    { value: "অধ্যাপক", label: "অধ্যাপক" },
                    { value: "সহযোগী অধ্যাপক", label: "সহযোগী অধ্যাপক" },
                  ]}
                  value={customForm.designation}
                  onChange={(val) => setCustomForm(prev => ({ ...prev, designation: val }))}
                  placeholder="Select Designation..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Department</label>
                <SearchableSelect
                  options={departments.map((d: any) => ({ value: d.id, label: d.name_bangla }))}
                  value={customForm.department_id || ''}
                  onChange={(val) => setCustomForm(prev => ({ ...prev, department_id: val }))}
                  placeholder="Select Department..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Office (Bangla)</label>
                <SearchableSelect
                  options={offices.map((o: any) => ({ value: o.id, label: o.name_bangla }))}
                  value={customForm.office_id || ''}
                  onChange={(val) => setCustomForm(prev => ({ ...prev, office_id: val }))}
                  placeholder="Select Office..."
                />
              </div>
              <div className="pt-6 shrink-0 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreatingCustom(false)} 
                  className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSavingCustom || !customForm.name}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  {isSavingCustom ? "Saving..." : "Create & Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Presentee Modal */}
      {editingPresentee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-lg shadow-xl border border-border p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Presentee</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Name</label>
                  <input 
                    required
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Designation</label>
                  <SearchableSelect 
                    options={[
                      { value: "অধ্যাপক", label: "অধ্যাপক" },
                      { value: "সহযোগী অধ্যাপক", label: "সহযোগী অধ্যাপক" },
                    ]}
                    value={editForm.designation}
                    onChange={(val) => setEditForm(prev => ({ ...prev, designation: val }))}
                    placeholder="Select Designation..."
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Department</label>
                <SearchableSelect
                  options={departments.map((d: any) => ({ value: d.id, label: d.name_bangla }))}
                  value={editForm.department_id || ''}
                  onChange={(val) => setEditForm(prev => ({ ...prev, department_id: val }))}
                  placeholder="Select Department..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Office (Bangla)</label>
                <SearchableSelect
                  options={offices.map((o: any) => ({ value: o.id, label: o.name_bangla }))}
                  value={editForm.office_id || ''}
                  onChange={(val) => setEditForm(prev => ({ ...prev, office_id: val }))}
                  placeholder="Select Office..."
                />
              </div>
            </div>
            <div className="pt-6 shrink-0 flex justify-end gap-3">
              <button 
                onClick={() => setEditingPresentee(null)} 
                className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdatePresentee}
                disabled={isUpdatingPresentee || !editForm.name}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {isUpdatingPresentee ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
