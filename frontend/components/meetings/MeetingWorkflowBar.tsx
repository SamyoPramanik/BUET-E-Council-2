"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, CheckCircle2, RotateCcw } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import {
  canSubmitMeeting,
  canReviewMeeting,
  APPROVAL_LABELS,
  APPROVAL_BADGE_CLASSES,
  type ApprovalStatus,
} from "../../lib/meetingAccess";

// Approval-workflow header for a meeting "file": shows the current review
// status and the actions available to the current user (initiator submits,
// moderator approves / sends back, admin can reopen an approved file).
export default function MeetingWorkflowBar({ meeting, onChanged }: { meeting: any; onChanged: () => void }) {
  const { user, isAdmin } = useAuth();
  const [busy, setBusy] = useState(false);
  const [showSendBack, setShowSendBack] = useState(false);
  const [note, setNote] = useState("");

  if (!meeting) return null;

  const status: ApprovalStatus = (meeting.approval_status as ApprovalStatus) || "draft";
  const showSubmit = canSubmitMeeting(user, meeting);
  const showReview = canReviewMeeting(user, meeting);

  const act = async (path: string, body: Record<string, unknown>, successMsg: string) => {
    setBusy(true);
    try {
      await api.post(`/meetings/${meeting.id}/${path}`, body);
      toast.success(successMsg);
      setShowSendBack(false);
      setNote("");
      onChanged();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${APPROVAL_BADGE_CLASSES[status]}`}>
            {APPROVAL_LABELS[status]}
          </span>
          {meeting.creator_username && (
            <span className="text-xs text-muted-foreground">
              Initiator: <span className="font-medium text-foreground">{meeting.creator_username}</span>
            </span>
          )}
          {status === "submitted" && (
            <span className="text-xs text-muted-foreground">Awaiting moderator review</span>
          )}
          {status === "approved" && meeting.reviewer_username && (
            <span className="text-xs text-muted-foreground">
              Approved by <span className="font-medium text-foreground">{meeting.reviewer_username}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showSubmit && (
            <button
              disabled={busy}
              onClick={() => act("submit", {}, "Submitted to moderator for review")}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Submit to Moderator
            </button>
          )}
          {showReview && (
            <>
              <button
                disabled={busy}
                onClick={() => act("approve", {}, "File approved")}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
              <button
                disabled={busy}
                onClick={() => setShowSendBack((v) => !v)}
                className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> Send Back
              </button>
            </>
          )}
          {isAdmin && status === "approved" && (
            <button
              disabled={busy}
              onClick={() => act("reopen", {}, "File reopened for editing")}
              className="inline-flex items-center gap-2 border border-border text-sm font-medium px-4 py-2 rounded-md hover:bg-accent disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> Reopen
            </button>
          )}
        </div>
      </div>

      {/* Correction note shown to the initiator after a send-back. */}
      {status === "sent_back" && meeting.review_note && (
        <div className="mt-3 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
          <span className="font-semibold">Moderator note:</span> {meeting.review_note}
        </div>
      )}

      {/* Send-back note composer (moderator/admin). */}
      {showReview && showSendBack && (
        <div className="mt-3 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional note for the initiator explaining what to fix..."
            className="w-full px-3 py-2 bg-input/20 border border-input rounded-md text-sm focus:ring-1 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowSendBack(false);
                setNote("");
              }}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-md"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() => act("send-back", { note }, "File sent back to initiator")}
              className="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-md disabled:opacity-50"
            >
              Confirm Send Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
