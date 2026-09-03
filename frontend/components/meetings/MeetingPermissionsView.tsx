"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import CustomSelect from "../CustomSelect";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { canEditPermissions } from "../../lib/meetingAccess";
import MeetingWorkflowBar from "./MeetingWorkflowBar";
import { ShieldCheck, FileText, Layers, Loader2, Check } from "lucide-react";

interface MeetingPermissionsViewProps {
  meeting: any;
  mutate: () => void;
}

const annexureSizeOptions = [
  { value: "2", label: "2 MB" },
  { value: "10", label: "10 MB" },
  { value: "50", label: "50 MB (Default)" },
  { value: "100", label: "100 MB" },
  { value: "500", label: "500 MB" },
  { value: "1000", label: "1 GB" },
  { value: "2000", label: "2 GB" },
  { value: "5000", label: "5 GB" },
  { value: "10000", label: "10 GB" }
];

export default function MeetingPermissionsView({ meeting, mutate }: MeetingPermissionsViewProps) {
  const { user, isAdmin } = useAuth();
  const { data: rolesRes } = useSWR('/auth/roles', fetcher);
  const allRoles = rolesRes?.data || [];

  const canEdit = canEditPermissions(user, meeting);
  const readOnly = !canEdit;

  const [formData, setFormData] = useState({
    max_annexure_size_mb: String(meeting.max_annexure_size_mb || 50),
    is_suppli_visible_to_viewers: !!meeting.is_suppli_visible_to_viewers
  });

  useEffect(() => {
    setFormData({
      max_annexure_size_mb: String(meeting.max_annexure_size_mb || 50),
      is_suppli_visible_to_viewers: !!meeting.is_suppli_visible_to_viewers
    });
  }, [meeting]);

  const [savingPermissions, setSavingPermissions] = useState(false);

  const isDirty =
    String(formData.max_annexure_size_mb) !== String(meeting.max_annexure_size_mb || 50) ||
    !!formData.is_suppli_visible_to_viewers !== !!meeting.is_suppli_visible_to_viewers;

  const canManageAnnexureSize = (() => {
    if (isAdmin) return true;
    if (!user || user.role === 'viewer') return false;
    if (user.role_level === null || user.role_level === undefined) return false;

    const userLvl = Number(user.role_level);
    const deputyRole = allRoles.find((r: any) => r.level_title && r.level_title.toLowerCase().includes("deputy registrar"));
    if (deputyRole && deputyRole.level !== undefined && deputyRole.level !== null) {
      return userLvl >= Number(deputyRole.level);
    }
    return userLvl >= 2;
  })();

  const handleSavePermissions = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isDirty && !savingPermissions) return;
    setSavingPermissions(true);
    try {
      await api.put(`/meetings/${meeting.id}`, {
        max_annexure_size_mb: parseInt(formData.max_annexure_size_mb, 10),
        is_suppli_visible_to_viewers: formData.is_suppli_visible_to_viewers
      });
      await mutate();
      toast.success("Meeting permissions updated successfully.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update meeting permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  if (!canManageAnnexureSize) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <ShieldCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground">Access Restricted</h3>
        <p className="text-sm mt-1">You do not have permission to access meeting permissions settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <MeetingWorkflowBar meeting={meeting} onChanged={() => mutate()} />

      <div className="bg-card border border-border shadow-sm rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Meeting Permissions & Limits
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure file size limits and viewer access settings for this meeting.
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePermissions} className="space-y-6">
          {/* ANNEXURE SIZE LIMIT */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Annexure Max Size Limit
            </label>
            {readOnly ? (
              <div className="w-full px-3 py-2.5 bg-input/20 border border-input rounded-md text-sm opacity-50 cursor-not-allowed">
                {annexureSizeOptions.find(o => o.value === String(formData.max_annexure_size_mb))?.label || `${formData.max_annexure_size_mb} MB`}
              </div>
            ) : (
              <CustomSelect
                options={annexureSizeOptions}
                value={String(formData.max_annexure_size_mb)}
                onChange={(val) => setFormData({ ...formData, max_annexure_size_mb: val })}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Sets the maximum allowed file size for annexures uploaded to this meeting (from 2 MB up to 10 GB).
            </p>
          </div>

          {/* SUPPLEMENTARY AGENDA VIEWER VISIBILITY */}
          <div className="space-y-2 pt-4 border-t border-border">
            <label className={`text-sm font-semibold flex items-center justify-between gap-2 ${meeting.is_regular === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" /> Allow Viewers to View Supplementary Agenda
              </span>
              <input
                type="checkbox"
                disabled={readOnly || meeting.is_regular === false}
                checked={meeting.is_regular !== false && !!formData.is_suppli_visible_to_viewers}
                onChange={(e) => setFormData({ ...formData, is_suppli_visible_to_viewers: e.target.checked })}
                className="w-5 h-5 text-primary rounded border-input focus:ring-primary accent-primary cursor-pointer disabled:opacity-50"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {meeting.is_regular === false
                ? "Immediate meetings do not support supplementary agendas."
                : "When enabled, users with the viewer role can select and view supplementary agenda items for this ongoing meeting."}
            </p>
          </div>

          {!readOnly && (
            <div className="flex justify-end pt-4 border-t border-border items-center gap-3">
              {isDirty && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Unsaved permission changes
                </span>
              )}
              <button
                type="submit"
                disabled={savingPermissions || !isDirty}
                className={`py-2.5 px-6 rounded-md font-medium text-sm flex items-center gap-2 transition-all shadow-sm ${
                  savingPermissions
                    ? "bg-primary/70 text-primary-foreground cursor-wait opacity-80"
                    : isDirty
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/30 font-semibold cursor-pointer"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 dark:bg-emerald-500/20 cursor-default opacity-90"
                }`}
              >
                {savingPermissions ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isDirty ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm Permissions</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Permissions Confirmed</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
