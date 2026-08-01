"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import { toast } from "sonner";
import { PenTool, RotateCcw, Save, Loader2 } from "lucide-react";

interface SignedPersonaViewProps {
  meeting: any;
  mutate?: any;
}

export default function SignedPersonaView({ meeting, mutate }: SignedPersonaViewProps) {
  const isSyndicate = (meeting.type || '').toLowerCase() === 'syndicate';

  const { data: personaRes, mutate: mutatePersona } = useSWR(
    '/notices/settings/signed-persona',
    fetcher
  );
  const defaults = personaRes?.data || {};

  const presidentKey = isSyndicate ? 'syndicate_president_signature' : 'academic_president_signature';
  const secretaryKey = isSyndicate ? 'syndicate_secretary_signature' : 'academic_secretary_signature';

  const [presidentText, setPresidentText] = useState(meeting.president_signature || '');
  const [secretaryText, setSecretaryText] = useState(meeting.secretary_signature || '');
  const [showUpdateModal, setShowUpdateModal] = useState<'president' | 'secretary' | null>(null);
  const [modalText, setModalText] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPresidentText(meeting.president_signature || '');
    setSecretaryText(meeting.secretary_signature || '');
  }, [meeting.president_signature, meeting.secretary_signature]);

  useEffect(() => {
    const changed = presidentText !== (meeting.president_signature || '') ||
                    secretaryText !== (meeting.secretary_signature || '');
    setHasChanges(changed);
  }, [presidentText, secretaryText, meeting.president_signature, meeting.secretary_signature]);

  const handleUseDefault = (target: 'president' | 'secretary') => {
    if (target === 'president') {
      setPresidentText(defaults[presidentKey] || '');
    } else {
      setSecretaryText(defaults[secretaryKey] || '');
    }
    toast.info("Reset to default value");
  };

  const handleSaveMeetingSignatures = async () => {
    setSaving(true);
    try {
      await api.put(`/meetings/${meeting.id}/signatures`, {
        president_signature: presidentText,
        secretary_signature: secretaryText
      });
      if (mutate) mutate();
      setHasChanges(false);
      toast.success("Meeting signatures saved");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save signatures");
    } finally {
      setSaving(false);
    }
  };

  const openUpdateModal = (target: 'president' | 'secretary') => {
    const currentText = target === 'president' ? presidentText : secretaryText;
    setModalText(currentText);
    setShowUpdateModal(target);
  };

  const handleSaveDefault = async () => {
    if (!showUpdateModal) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (showUpdateModal === 'president') {
        payload[presidentKey] = modalText;
      } else {
        payload[secretaryKey] = modalText;
      }
      await api.put('/notices/settings/signed-persona', payload);
      mutatePersona();
      toast.success("Default value updated permanently");
      setShowUpdateModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update default");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Signed Persona</h2>
          <p className="text-sm text-muted-foreground">
            Configure signature text for {isSyndicate ? 'syndicate' : 'academic'} resolution PDFs.
          </p>
        </div>
        <button
          onClick={handleSaveMeetingSignatures}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save for This Meeting
        </button>
      </div>

      {/* President Section */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <PenTool className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">সভাপতি (President)</h3>
            <p className="text-xs text-muted-foreground">
              {meeting.president_signature ? 'Meeting-specific signature set' : 'Using global default'}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <textarea
            value={presidentText}
            onChange={e => setPresidentText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm text-center resize-none"
            placeholder="Enter president signature text..."
          />
          <p className="text-xs text-muted-foreground text-center">
            This text will appear below the signature space in the resolution PDF.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleUseDefault('president')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Use Default
          </button>
          <button
            onClick={() => openUpdateModal('president')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            <Save className="w-4 h-4" />
            Update Default
          </button>
        </div>
      </div>

      {/* Secretary Section */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <PenTool className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">সচিব (Secretary)</h3>
            <p className="text-xs text-muted-foreground">
              {meeting.secretary_signature ? 'Meeting-specific signature set' : 'Using global default'}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <textarea
            value={secretaryText}
            onChange={e => setSecretaryText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm text-center resize-none"
            placeholder="Enter secretary signature text..."
          />
          <p className="text-xs text-muted-foreground text-center">
            This text will appear below the signature space in the resolution PDF.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleUseDefault('secretary')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Use Default
          </button>
          <button
            onClick={() => openUpdateModal('secretary')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            <Save className="w-4 h-4" />
            Update Default
          </button>
        </div>
      </div>

      {/* Update Default Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-lg shadow-xl border border-border p-6">
            <h3 className="text-lg font-semibold mb-2">
              Update Default — {showUpdateModal === 'president' ? 'সভাপতি (President)' : 'সচিব (Secretary)'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will update the permanent default value for all future {isSyndicate ? 'syndicate' : 'academic'} meetings.
            </p>
            <textarea
              value={modalText}
              onChange={e => setModalText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm text-center resize-none"
              placeholder="Enter signature text..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowUpdateModal(null)}
                className="px-4 py-2 text-sm bg-muted rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDefault}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
