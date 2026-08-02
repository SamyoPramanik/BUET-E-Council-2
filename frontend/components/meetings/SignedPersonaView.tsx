"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import { toast } from "sonner";
import { PenTool, RotateCcw, Save, Loader2, Upload, Trash2, Image as ImageIcon } from "lucide-react";

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
  const presidentImageKeyName = isSyndicate ? 'syndicate_president_signature_image' : 'academic_president_signature_image';
  const secretaryImageKeyName = isSyndicate ? 'syndicate_secretary_signature_image' : 'academic_secretary_signature_image';

  const [presidentText, setPresidentText] = useState(meeting.president_signature || '');
  const [secretaryText, setSecretaryText] = useState(meeting.secretary_signature || '');
  const [presidentImage, setPresidentImage] = useState(meeting.president_signature_image || '');
  const [secretaryImage, setSecretaryImage] = useState(meeting.secretary_signature_image || '');

  const [showUpdateModal, setShowUpdateModal] = useState<'president' | 'secretary' | null>(null);
  const [modalText, setModalText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<'president' | 'secretary' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPresidentText(meeting.president_signature || '');
    setSecretaryText(meeting.secretary_signature || '');
    setPresidentImage(meeting.president_signature_image || '');
    setSecretaryImage(meeting.secretary_signature_image || '');
  }, [meeting.president_signature, meeting.secretary_signature, meeting.president_signature_image, meeting.secretary_signature_image]);

  useEffect(() => {
    const changed = presidentText !== (meeting.president_signature || '') ||
                    secretaryText !== (meeting.secretary_signature || '') ||
                    presidentImage !== (meeting.president_signature_image || '') ||
                    secretaryImage !== (meeting.secretary_signature_image || '');
    setHasChanges(changed);
  }, [presidentText, secretaryText, presidentImage, secretaryImage, meeting.president_signature, meeting.secretary_signature, meeting.president_signature_image, meeting.secretary_signature_image]);

  const handleUseDefault = (target: 'president' | 'secretary') => {
    if (target === 'president') {
      setPresidentText(defaults[presidentKey] || '');
      setPresidentImage(defaults[presidentImageKeyName] || '');
    } else {
      setSecretaryText(defaults[secretaryKey] || '');
      setSecretaryImage(defaults[secretaryImageKeyName] || '');
    }
    toast.info("Reset to default value");
  };

  const handleSaveMeetingSignatures = async () => {
    setSaving(true);
    try {
      await api.put(`/meetings/${meeting.id}/signatures`, {
        president_signature: presidentText,
        secretary_signature: secretaryText,
        president_signature_image: presidentImage,
        secretary_signature_image: secretaryImage
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

  const handleUploadMeetingSig = async (target: 'president' | 'secretary', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target', target);
    setUploadingTarget(target);
    try {
      const res = await api.post(`/meetings/${meeting.id}/signatures/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (target === 'president') {
        setPresidentImage(res.data.image_key);
      } else {
        setSecretaryImage(res.data.image_key);
      }
      if (mutate) mutate();
      toast.success(`${target === 'president' ? 'President' : 'Secretary'} signature image uploaded`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleUploadDefaultSig = async (target: 'president' | 'secretary', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target', target);
    formData.append('meeting_type', isSyndicate ? 'syndicate' : 'academic');
    setUploadingTarget(target);
    try {
      const res = await api.post('/notices/settings/signed-persona/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      mutatePersona();
      toast.success(`Default ${target === 'president' ? 'President' : 'Secretary'} signature image uploaded`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Default upload failed");
    } finally {
      setUploadingTarget(null);
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
        payload[presidentImageKeyName] = presidentImage;
      } else {
        payload[secretaryKey] = modalText;
        payload[secretaryImageKeyName] = secretaryImage;
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

  const renderSignatureImageCard = (target: 'president' | 'secretary') => {
    const currentImage = target === 'president' ? presidentImage : secretaryImage;
    const defaultImage = target === 'president' ? defaults[presidentImageKeyName] : defaults[secretaryImageKeyName];
    const title = target === 'president' ? 'President Signature Image' : 'Secretary Signature Image';

    return (
      <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-primary" /> {title}
          </span>
          {currentImage ? (
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active Image
            </span>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              No Image Set
            </span>
          )}
        </div>

        {currentImage ? (
          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
            <img
              src={`/api/storage/${currentImage}`}
              alt={`${target} signature`}
              className="h-12 object-contain bg-white border border-input rounded px-2 py-1"
            />
            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded cursor-pointer hover:bg-secondary/80 flex items-center gap-1">
                {uploadingTarget === target ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                <span>Replace</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadMeetingSig(target, file);
                  }}
                />
              </label>
              <button
                onClick={() => {
                  if (target === 'president') setPresidentImage('');
                  else setSecretaryImage('');
                }}
                className="px-2.5 py-1.5 text-xs text-destructive hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-input p-4 rounded-md cursor-pointer hover:bg-muted/30 transition-colors">
            <span className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
              {uploadingTarget === target ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-primary" />}
              Upload Signature Image
            </span>
            <span className="text-[11px] text-muted-foreground">PNG, JPG, WEBP (Max 5MB)</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleUploadMeetingSig(target, file);
              }}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Signed Persona</h2>
          <p className="text-sm text-muted-foreground">
            Configure signature text and digital images for {isSyndicate ? 'Syndicate' : 'Academic'} resolution PDFs.
          </p>
        </div>
        <button
          onClick={handleSaveMeetingSignatures}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save for This Meeting
        </button>
      </div>

      {/* President Section */}
      <div className="bg-card border border-border shadow-sm rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <PenTool className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">সভাপতি (President)</h3>
            <p className="text-xs text-muted-foreground">
              {meeting.president_signature || meeting.president_signature_image ? 'Meeting-specific signature active' : 'Using default values'}
            </p>
          </div>
        </div>

        {renderSignatureImageCard('president')}

        <div className="space-y-2">
          <textarea
            value={presidentText}
            onChange={e => setPresidentText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm text-center resize-none"
            placeholder="Enter president signature text..."
          />
          <p className="text-xs text-muted-foreground text-center">
            This text will appear directly below the signature image in the resolution PDF.
          </p>
        </div>

        <div className="flex justify-center gap-2 pt-2">
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
      <div className="bg-card border border-border shadow-sm rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <PenTool className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">সচিব (Secretary)</h3>
            <p className="text-xs text-muted-foreground">
              {meeting.secretary_signature || meeting.secretary_signature_image ? 'Meeting-specific signature active' : 'Using default values'}
            </p>
          </div>
        </div>

        {renderSignatureImageCard('secretary')}

        <div className="space-y-2">
          <textarea
            value={secretaryText}
            onChange={e => setSecretaryText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm text-center resize-none"
            placeholder="Enter secretary signature text..."
          />
          <p className="text-xs text-muted-foreground text-center">
            This text will appear directly below the signature image in the resolution PDF.
          </p>
        </div>

        <div className="flex justify-center gap-2 pt-2">
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
          <div className="bg-card w-full max-w-lg rounded-lg shadow-xl border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              Update Default — {showUpdateModal === 'president' ? 'সভাপতি (President)' : 'সচিব (Secretary)'}
            </h3>
            <p className="text-sm text-muted-foreground">
              This will update the permanent default values for all future {isSyndicate ? 'Syndicate' : 'Academic'} meetings.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Global Default Signature Image</label>
              {defaults[showUpdateModal === 'president' ? presidentImageKeyName : secretaryImageKeyName] ? (
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/20">
                  <img
                    src={`/api/storage/${defaults[showUpdateModal === 'president' ? presidentImageKeyName : secretaryImageKeyName]}`}
                    alt="Global Default Signature"
                    className="h-12 object-contain bg-white border border-input rounded px-2 py-1"
                  />
                  <label className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded cursor-pointer hover:bg-secondary/80 flex items-center gap-1">
                    {uploadingTarget === showUpdateModal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    <span>Replace Image</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadDefaultSig(showUpdateModal, file);
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-input p-4 rounded-md cursor-pointer hover:bg-muted/30 transition-colors">
                  <span className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                    {uploadingTarget === showUpdateModal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-primary" />}
                    Upload Default Image
                  </span>
                  <span className="text-[11px] text-muted-foreground">PNG, JPG, WEBP (Max 5MB)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadDefaultSig(showUpdateModal, file);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Global Default Signature Text</label>
              <textarea
                value={modalText}
                onChange={e => setModalText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-input/20 border border-input rounded-md focus:ring-1 focus:ring-ring text-sm text-center resize-none"
                placeholder="Enter default signature text..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
