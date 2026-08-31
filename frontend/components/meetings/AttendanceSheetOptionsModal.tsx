"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "../../lib/api";
import { X, FileText, Loader2, Users, Building2, Shield, GraduationCap, UserCheck, MoreHorizontal } from "lucide-react";

interface AttendanceGroup {
  key: string;
  label: string;
  count: number;
}

interface AttendanceSheetOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: any;
  onGenerate: (mode: 'all' | 'separate', selectedGroups: string[], format?: 'pdf' | 'docx') => Promise<void>;
}

function computeGroups(invitees: any[]): AttendanceGroup[] {
  const admins: any[] = [];
  const deans: any[] = [];
  const heads: any[] = [];
  const depts: Record<string, { serial: number; members: any[] }> = {};
  const others: any[] = [];

  invitees.forEach((p: any) => {
    const des = (p.designation || '').toLowerCase();
    const office = (p.office_name || '').toLowerCase();

    const isVC = (des.includes('উপাচার্য') || office.includes('উপাচার্য'))
      && !(des.includes('উপ-উপাচার্য') || office.includes('উপ-উপাচার্য'));
    const isProVC = des.includes('উপ-উপাচার্য') || office.includes('উপ-উপাচার্য');
    const isDean = office.includes('ডিন') || office.includes('dean') || des.includes('ডিন') || des.includes('dean');
    const isHead = office.includes('বিভাগীয় প্রধান');

    if (isVC) {
      admins.unshift(p);
    } else if (isProVC) {
      admins.push(p);
    } else if (isDean) {
      deans.push(p);
    } else if (isHead) {
      heads.push(p);
    } else if (p.department_name) {
      if (!depts[p.department_name]) depts[p.department_name] = { serial: p.department_serial ?? 9999, members: [] };
      depts[p.department_name].members.push(p);
    } else {
      others.push(p);
    }
  });

  const result: AttendanceGroup[] = [];
  if (admins.length > 0) result.push({ key: 'admins', label: 'প্রশাসন', count: admins.length });
  if (deans.length > 0) result.push({ key: 'deans', label: 'সকল ডিন', count: deans.length });
  if (heads.length > 0) result.push({ key: 'heads', label: 'সকল বিভাগীয় প্রধান', count: heads.length });
  Object.entries(depts)
    .sort(([, a], [, b]) => a.serial - b.serial)
    .forEach(([deptName, dept]) => {
      result.push({ key: `dept:${deptName}`, label: deptName, count: dept.members.length });
    });
  if (others.length > 0) result.push({ key: 'others', label: 'অন্যান্য সদস্য', count: others.length });

  return result;
}

export default function AttendanceSheetOptionsModal({
  isOpen,
  onClose,
  meeting,
  onGenerate
}: AttendanceSheetOptionsModalProps) {
  const [mode, setMode] = useState<'all' | 'separate'>('all');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: inviteesRes, isLoading } = useSWR(
    isOpen ? `/meetings/${meeting.id}/invitees` : null,
    fetcher
  );
  const invitees = inviteesRes?.data || [];
  const groups = useMemo(() => computeGroups(invitees), [invitees]);

  useEffect(() => {
    if (isOpen) {
      setMode('all');
      setSelectedGroups(new Set());
    }
  }, [isOpen]);

  const toggleGroup = (key: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAllGroups = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map(g => g.key)));
    }
  };

  const getGroupIcon = (key: string) => {
    if (key === 'admins') return <Shield className="w-4 h-4" />;
    if (key === 'deans') return <GraduationCap className="w-4 h-4" />;
    if (key === 'heads') return <UserCheck className="w-4 h-4" />;
    if (key.startsWith('dept:')) return <Building2 className="w-4 h-4" />;
    if (key === 'others') return <MoreHorizontal className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');

  const handleGenerate = async () => {
    if (mode === 'separate' && selectedGroups.size === 0) return;

    setIsGenerating(true);
    try {
      await onGenerate(mode, mode === 'separate' ? Array.from(selectedGroups) : [], format);
      onClose();
    } catch (err) {
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const canGenerate = mode === 'all' || (mode === 'separate' && selectedGroups.size > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-lg max-h-[90vh] rounded-lg shadow-xl border border-border flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Generate Attendance Sheet
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{meeting?.title || meeting?.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading invitees...</span>
            </div>
          ) : invitees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No invitees found. Please add invitees first.
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Format Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">File Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormat('pdf')}
                    className={`py-2 px-4 rounded-lg border-2 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      format === 'pdf'
                        ? 'border-red-500 bg-red-50 text-red-700 font-semibold'
                        : 'border-border text-muted-foreground hover:border-red-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-red-500" />
                    PDF Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('docx')}
                    className={`py-2 px-4 rounded-lg border-2 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      format === 'docx'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-border text-muted-foreground hover:border-blue-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    Word (.docx)
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Generation Mode</label>

                <label
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    mode === 'all'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'all'}
                    onChange={() => setMode('all')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Generate as Whole
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Single {format.toUpperCase()} with all sections combined
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    mode === 'separate'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'separate'}
                    onChange={() => setMode('separate')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Generate Separately
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate separate {format.toUpperCase()} files for each selected section
                    </p>
                  </div>
                </label>
              </div>

              {mode === 'separate' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Select Sections</label>
                    <button
                      type="button"
                      onClick={toggleAllGroups}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedGroups.size === groups.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {groups.map(group => (
                      <label
                        key={group.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedGroups.has(group.key)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.has(group.key)}
                          onChange={() => toggleGroup(group.key)}
                          className="w-4 h-4 rounded border-input"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {getGroupIcon(group.key)}
                          <span className="font-medium text-sm">{group.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {group.count}
                        </span>
                      </label>
                    ))}
                  </div>

                  {selectedGroups.size > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedGroups.size} section(s) selected — {selectedGroups.size} PDF(s) will be generated
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border shrink-0 flex justify-between items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {mode === 'all'
              ? 'Will generate 1 PDF'
              : selectedGroups.size === 0
                ? 'Select at least one section'
                : `Will generate ${selectedGroups.size} PDF(s)`}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
