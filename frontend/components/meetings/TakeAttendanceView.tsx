"use client";

import { useState, useMemo } from "react";
import { Check, X, Users, Building, ShieldCheck, Search } from "lucide-react";

interface Invitee {
  id: string;
  name: string;
  designation: string;
  department_name: string;
  department_serial: number;
  office_name: string;
  is_present: boolean;
  serial: number;
}

interface TakeAttendanceViewProps {
  invitees: Invitee[];
  onSave: (presentIds: string[]) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function TakeAttendanceView({ invitees, onSave, onCancel, isSaving }: TakeAttendanceViewProps) {
  // Initialize state with currently present invitees
  const [presentIds, setPresentIds] = useState<Set<string>>(() => {
    return new Set(invitees.filter(i => i.is_present).map(i => i.id));
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Search filtering
  const filteredInvitees = useMemo(() => {
    if (!searchQuery.trim()) return invitees;
    const q = searchQuery.toLowerCase();
    return invitees.filter(i => 
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.designation && i.designation.toLowerCase().includes(q))
    );
  }, [invitees, searchQuery]);

  // Grouping logic — matching InviteesView categorization
  const isVC = (m: Invitee) => {
    const des = (m.designation || '').toLowerCase();
    const office = (m.office_name || '').toLowerCase();
    return (des.includes('উপাচার্য') || office.includes('উপাচার্য')) && !(des.includes('উপ-উপাচার্য') || office.includes('উপ-উপাচার্য'));
  };

  const isProVC = (m: Invitee) => {
    const des = (m.designation || '').toLowerCase();
    const office = (m.office_name || '').toLowerCase();
    return des.includes('উপ-উপাচার্য') || office.includes('উপ-উপাচার্য');
  };

  const isDean = (m: Invitee) => {
    const des = (m.designation || '').toLowerCase();
    const office = (m.office_name || '').toLowerCase();
    return office.includes('ডিন') || office.includes('dean') || des.includes('ডিন') || des.includes('dean');
  };

  const isHead = (m: Invitee) => (m.office_name || '').toLowerCase().includes('বিভাগীয় প্রধান');

  const groups = useMemo(() => {
    const admin: Invitee[] = [];
    const deans: Invitee[] = [];
    const heads: Invitee[] = [];
    const deptGroups: Record<string, { serial: number, members: Invitee[] }> = {};
    const others: Invitee[] = [];

    filteredInvitees.forEach(m => {
      if (isVC(m)) admin.unshift(m);
      else if (isProVC(m)) admin.push(m);
      else if (isDean(m)) deans.push(m);
      else if (isHead(m)) heads.push(m);
      else if (m.department_name) {
        if (!deptGroups[m.department_name]) {
          deptGroups[m.department_name] = { serial: m.department_serial ?? 9999, members: [] };
        }
        deptGroups[m.department_name].members.push(m);
      } else {
        others.push(m);
      }
    });

    const sortedDeptGroups = Object.entries(deptGroups)
      .sort(([, a], [, b]) => a.serial - b.serial)
      .map(([name, data]) => ({ name, members: data.members }));

    return { admin, deans, heads, sortedDeptGroups, others };
  }, [filteredInvitees]);

  const toggleMember = (id: string) => {
    setPresentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (members: Invitee[], isAllSelected: boolean) => {
    setPresentIds(prev => {
      const next = new Set(prev);
      members.forEach(m => {
        if (isAllSelected) next.delete(m.id);
        else next.add(m.id);
      });
      return next;
    });
  };

  const renderGroup = (title: string, members: Invitee[], icon: React.ReactNode) => {
    if (members.length === 0) return null;
    
    const isAllSelected = members.length > 0 && members.every(m => presentIds.has(m.id));
    const isIndeterminate = members.some(m => presentIds.has(m.id)) && !isAllSelected;

    return (
      <div className="mb-6 bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold text-foreground">{title}</h3>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {members.length} members
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox"
              className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
              checked={isAllSelected}
              ref={input => { if (input) input.indeterminate = isIndeterminate; }}
              onChange={() => toggleGroup(members, isAllSelected)}
            />
            <span className="text-sm font-medium text-muted-foreground">Select All</span>
          </label>
        </div>
        <div className="divide-y divide-border">
          {members.map(member => (
            <label key={member.id} className="flex items-center px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors group">
              <input 
                type="checkbox"
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer mt-0.5"
                checked={presentIds.has(member.id)}
                onChange={() => toggleMember(member.id)}
              />
              <div className="ml-3 flex-1">
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {member.name}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                  {member.designation && <span>{member.designation}</span>}
                  {member.office_name && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{member.office_name}</span>
                    </>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Take Attendance
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Select the members who are present in the meeting.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(Array.from(presentIds))}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? "Saving..." : (
              <>
                <Check className="w-4 h-4" /> Save Attendance
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-muted/30 p-4 rounded-lg border border-border mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-foreground">Total Present:</span>
          <span className="text-lg font-bold text-primary">{presentIds.size}</span>
          <span className="text-sm text-muted-foreground">/ {invitees.length}</span>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or designation..."
            className="w-full pl-9 pr-8 py-1.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {renderGroup("প্রশাসন", groups.admin, <ShieldCheck className="w-5 h-5 text-primary" />)}
        {renderGroup("সকল ডিন", groups.deans, <Building className="w-5 h-5 text-blue-500" />)}
        {renderGroup("সকল বিভাগীয় প্রধান", groups.heads, <Building className="w-5 h-5 text-blue-500" />)}
        
        {groups.sortedDeptGroups.map(dept => 
          renderGroup(dept.name, dept.members, <Building className="w-5 h-5 text-blue-500" />)
        )}

        {renderGroup("অন্যান্য সদস্য", groups.others, <Users className="w-5 h-5 text-muted-foreground" />)}
        
        {filteredInvitees.length === 0 && (
          <div className="text-center py-16 bg-card border border-border rounded-lg shadow-sm">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">No members found</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery ? "No members match your search criteria." : "Please add invitees to the meeting first."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
