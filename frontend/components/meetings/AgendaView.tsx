"use client";

import { useState, useEffect } from "react";
import { Edit3, Plus, FileText, GripVertical, Trash2, FilePlus } from "lucide-react";
import RichTextEditor from "../RichTextEditor";
import AnnexureList from "./AnnexureList";
import RevisionHistory from "./RevisionHistory";
import TagChipSelector from "../TagChipSelector";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import { sanitizeHtml } from "../../lib/sanitize";
import { toast } from "sonner";
import { useConfirm } from "../../hooks/useConfirm";
import { useAuth } from "../../hooks/useAuth";
import { canEditAgenda, canEditSuppliAgenda } from "../../lib/meetingAccess";
import { toBanglaDigits } from "../../lib/banglaNumerals";
import TemplateDrawer from "../TemplateDrawer";

export default function AgendaView({ meeting, type }: { meeting: any, type: string }) {
  const { user } = useAuth();
  const isSuppliView = type === 'suppli-agenda';
  const canEdit = isSuppliView ? canEditSuppliAgenda(user, meeting) : canEditAgenda(user, meeting);
  const canManageAnnexures = canEdit;
  const { data: response, mutate } = useSWR(`/agendas?meeting_id=${meeting.id}&is_suppli=${isSuppliView}`, fetcher, { fallbackData: { data: [] } });
  const agendas = response?.data || [];
  const { confirm, ConfirmModal } = useConfirm();

  const { data: mainAgendasRes } = useSWR(
    isSuppliView ? `/agendas?meeting_id=${meeting.id}&is_suppli=false` : null,
    fetcher
  );
  // Exclude any stored Bibidha items from the count so suppli agendas start at the same
  // serial as the visual বিবিধ placeholder (mainCount + 1)
  const mainAgendaCount = isSuppliView
    ? (mainAgendasRes?.data || []).filter((a: any) => {
        const clean = (a.content || '').replace(/<[^>]*>/g, '').trim();
        return !clean.startsWith('বিবিধ');
      }).length
    : 0;

  const regularAgendas = isSuppliView
    ? agendas
    : agendas.filter((a: any) => {
        const clean = (a.content || '').replace(/<[^>]*>/g, '').trim();
        return !clean.startsWith('বিবিধ');
      });

  const bibidhaSerialNum = regularAgendas.length + 1;
  const bibidhaSerial = (meeting.agenda_prefix || '') + toBanglaDigits(bibidhaSerialNum, 1);

  const isEmergencyMeeting = typeof window !== 'undefined'
    && window.localStorage.getItem(`meeting_criteria_${meeting.id}`) === 'emergency';
  const emergencyLimitReached = !isSuppliView && isEmergencyMeeting && regularAgendas.length >= 1;

  const { data: tagsResponse, mutate: mutateTags } = useSWR('/tags', fetcher, { fallbackData: { data: [] } });
  const allTags = tagsResponse?.data || [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // In-place creation state
  const [createAtIndex, setCreateAtIndex] = useState<number | null>(null);
  const [createIsSuppli, setCreateIsSuppli] = useState<boolean>(isSuppliView);
  const [newContent, setNewContent] = useState(isSuppliView ? "<p>.</p>" : "");
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setCreateAtIndex(null);
    setEditingId(null);
    setCreateIsSuppli(isSuppliView);
    setNewContent(isSuppliView ? "<p>.</p>" : "");
    setNewTagIds([]);
  }, [type, isSuppliView]);

  const handleAddNewTag = async (name: string, target: "new" | "edit") => {
    try {
      const res = await api.post('/tags', { name });
      const tag = res.data.data;
      mutateTags();
      if (target === "new") setNewTagIds(prev => [...prev, tag.id]);
      else setEditTagIds(prev => [...prev, tag.id]);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Failed to create tag");
    }
  };

  const title = type === 'suppli-agenda' ? 'Supplementary Agenda' : 'Agenda Items';
  const readOnly = !canEdit;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put(`/agendas/${editingId}`, { content: editContent, tag_ids: editTagIds });
      mutate();
      setEditingId(null);
      toast.success("Agendum saved successfully");
    } catch (err: any) {
      toast.error("Failed to save agendum");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (sourceId === targetId) return;

    const sourceIndex = regularAgendas.findIndex((a: any) => a.id === sourceId);
    const targetIndex = regularAgendas.findIndex((a: any) => a.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const newAgendas = [...regularAgendas];
    const [moved] = newAgendas.splice(sourceIndex, 1);
    newAgendas.splice(targetIndex, 0, moved);

    const updatedAgendas = newAgendas.map((a: any, idx: number) => ({
      ...a,
      agenda_serial: idx + 1
    }));

    mutate({ ...response, data: updatedAgendas }, false);

    try {
      await Promise.all(
        updatedAgendas.map((a: any) =>
          api.put(`/agendas/${a.id}`, { agenda_serial: a.agenda_serial })
        )
      );
      mutate();
      toast.success("Agendas reordered");
    } catch (err) {
      toast.error("Failed to reorder agendas");
      mutate();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleStartCreate = (atIndex: number) => {
    setCreateAtIndex(atIndex);
    setCreateIsSuppli(isSuppliView);
    setNewContent(isSuppliView ? "<p>.</p>" : "");
    setNewTagIds([]);
    setEditingId(null);
  };

  const handleSaveNew = async () => {
    if (createAtIndex === null) return;
    setIsSaving(true);
    const targetSerial = createAtIndex + 1;

    try {
      await api.post(`/agendas`, {
        meeting_id: meeting.id,
        agenda_serial: targetSerial,
        content: newContent,
        is_suppli: createIsSuppli,
        tag_ids: newTagIds,
        meeting_criteria: (!createIsSuppli && isEmergencyMeeting) ? 'emergency' : undefined
      });
      mutate();
      setCreateAtIndex(null);
      setNewTagIds([]);
      toast.success(createIsSuppli ? "Supplementary agendum created successfully" : "Agendum created successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create agendum");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    confirm("Delete Agendum", "Are you sure you want to delete this agendum?", async () => {
      try {
        await api.delete(`/agendas/${id}`);
        mutate();
        toast.success("Agendum deleted");
      } catch (err) {
        toast.error("Failed to delete agendum");
      }
    });
  };

  const handleEditClick = (agenda: any) => {
    setEditingId(agenda.id);
    setEditContent(agenda.content || "");
    setEditTagIds((agenda.tags || []).map((t: any) => t.id));
    setCreateAtIndex(null);
  };

  const renderCreateForm = () => (
    <div className="bg-card border border-primary/50 rounded-lg relative group shadow-sm hover:shadow-md transition-shadow my-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-lg text-primary">
            New {isSuppliView ? 'Supplementary Agendum' : title}
          </h3>
        </div>
        <div className="border border-primary/50 rounded-md overflow-hidden ring-2 ring-primary/20">
          <RichTextEditor
            content={newContent}
            onChange={setNewContent}
            className="p-4 min-h-[200px]"
          />
          <div className="bg-muted p-3 flex justify-between items-center gap-4 border-t border-border">
            <div className="flex-1 min-w-0">
              <TagChipSelector
                options={allTags}
                value={newTagIds}
                onChange={setNewTagIds}
                onAddNew={(name) => handleAddNewTag(name, "new")}
                placeholder="Add tag"
              />
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => setCreateAtIndex(null)} className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-background rounded-md transition-colors">Cancel</button>
              <button onClick={handleSaveNew} disabled={isSaving || !newContent} className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 transition-opacity">
                {isSaving ? "Saving..." : (createIsSuppli ? "Create Supplementary Agendum" : "Create Agendum")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex items-start gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmModal />
      <div className={`flex-1 ${!readOnly ? 'w-[70%] max-w-4xl' : 'w-full max-w-5xl'} pb-32`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>

        {regularAgendas.length === 0 && createAtIndex === null ? (
          <div className="space-y-6">
            <div className="bg-card border border-border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-sm h-64">
              <div className="bg-muted p-4 rounded-full">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">No Agendum Found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">There are currently no agendum items for this meeting. Create a new agendum to get started.</p>
              </div>
              {!readOnly && (
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  <button
                    onClick={() => handleStartCreate(0)}
                    className="bg-primary text-primary-foreground py-2 px-5 rounded-md font-medium shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Create New Agendum
                  </button>
                  <button
                    onClick={() => {
                      handleStartCreate(0);
                      setIsDrawerOpen(true);
                    }}
                    className="bg-accent text-accent-foreground border border-border py-2 px-5 rounded-md font-medium shadow-sm hover:bg-accent/80 transition-colors flex items-center gap-2 text-sm"
                  >
                    <FileText className="w-4 h-4" /> Create from Template
                  </button>
                </div>
              )}
            </div>

            {!isSuppliView && (
              <div className="bg-muted/40 border border-border/80 p-6 rounded-lg shadow-sm opacity-80 select-none">
                <h3 className="font-semibold text-lg text-muted-foreground">
                  বিবিধ : {bibidhaSerial}
                </h3>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* If creating at index 0 (top of empty or top of list) */}
            {createAtIndex === 0 && renderCreateForm()}

            {regularAgendas.map((agenda: any, index: number) => {
              const cleanText = agenda.content ? agenda.content.replace(/<[^>]*>/g, '').trim() : '';
              const isBibidha = !isSuppliView && cleanText.startsWith('বিবিধ');
              const bibidhaSerial = (meeting.agenda_prefix || '') + toBanglaDigits(agenda.agenda_serial || index + 1, 1);
              const isOnlyBibidhaTitle = isBibidha && /^বিবিধ\s*:\s*[\d০-৯]+$/.test(cleanText);

              return (
                <div key={agenda.id}>
                  {/* Agenda Card */}
                  <div className={`bg-card border ${isBibidha ? 'border-border/80 bg-muted/20' : 'border-border'} p-6 rounded-lg relative group shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        {/* Bengali heading: "বিবিধ : ০২" for Bibidha, "প্রস্তাবনা নং {prefix}{01}" for others */}
                        <h3 className="font-semibold text-lg text-primary">
                          {isBibidha
                            ? `বিবিধ : ${bibidhaSerial}`
                            : `প্রস্তাবনা নং ${(meeting.agenda_prefix || '') + (isSuppliView ? toBanglaDigits(mainAgendaCount + (agenda.agenda_serial || index + 1), 1) : toBanglaDigits(agenda.agenda_serial || index + 1, 1))}`}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {!readOnly && (
                          <>
                            {!isBibidha && (
                              <>
                                <RevisionHistory contentId={agenda.id} contentType="agendaItem" onRestored={() => mutate()} canRestore={canEdit} />
                                <button
                                  onClick={() => handleEditClick(agenda)}
                                  className="text-primary opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-primary/10 rounded-md hover:bg-primary/20"
                                  title="Edit Agendum"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(agenda.id)}
                              className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-destructive/10 rounded-md hover:bg-destructive/20"
                              title="Delete Agendum"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {agenda.tags && agenda.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4 -mt-2">
                        {agenda.tags.map((tag: any) => (
                          <span key={tag.id} className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {editingId === agenda.id && !isBibidha ? (
                      <div className="border border-primary/50 rounded-md overflow-hidden ring-2 ring-primary/20">
                        <RichTextEditor
                          content={editContent}
                          onChange={setEditContent}
                          className="p-4 min-h-[200px]"
                        />
                        <div className="bg-muted p-2 px-3 flex justify-between items-center gap-4 border-t border-border">
                          <div className="flex-1 min-w-0">
                            <TagChipSelector
                              options={allTags}
                              value={editTagIds}
                              onChange={setEditTagIds}
                              onAddNew={(name) => handleAddNewTag(name, "edit")}
                              placeholder="Add tag"
                            />
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-muted-foreground hover:bg-background rounded-md">Cancel</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md disabled:opacity-50">
                              {isSaving ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      !isOnlyBibidhaTitle && (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                          dangerouslySetInnerHTML={{ __html: agenda.content ? sanitizeHtml(agenda.content) : "<p class='text-muted-foreground italic'>Empty content...</p>" }}
                        />
                      )
                    )}

                    {/* Annexure List placed underneath the agenda content (hidden for Bibidha) */}
                    {!isBibidha && (
                      <AnnexureList contentId={agenda.id} type="agenda" readOnly={!canManageAnnexures} />
                    )}
                  </div>

                {/* In-place creation form right after this item if active */}
                {createAtIndex === index + 1 && renderCreateForm()}

                {/* Insertion Strip (Secondary color with hover effect) */}
                {createAtIndex === null && !readOnly && !emergencyLimitReached && (
                  <div className="h-8 my-2 relative group flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-secondary"></div>
                    </div>
                    <div className="relative flex gap-2">
                      <button
                        onClick={() => handleStartCreate(index + 1)}
                        className="bg-secondary text-secondary-foreground border border-secondary/50 shadow-sm py-1 px-3 text-xs font-semibold rounded-full flex items-center gap-1.5 hover:bg-secondary/80 hover:shadow-md transition-all hover:scale-105"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Agendum Here
                      </button>
                      <button
                        onClick={() => {
                          handleStartCreate(index + 1);
                          setIsDrawerOpen(true);
                        }}
                        className="bg-secondary text-secondary-foreground border border-secondary/50 shadow-sm py-1 px-3 text-xs font-semibold rounded-full flex items-center gap-1.5 hover:bg-secondary/80 hover:shadow-md transition-all hover:scale-105"
                      >
                        <FileText className="w-3.5 h-3.5" /> From Template
                      </button>
                    </div>
                  </div>
                )}

                {createAtIndex === null && !readOnly && emergencyLimitReached && (
                  <div className="my-2 flex items-center justify-center gap-2 text-xs text-sky-600 dark:text-sky-400 bg-sky-500/10 rounded-full py-1.5 px-4 w-fit mx-auto">
                    Emergency meeting — limited to 1 agendum.
                  </div>
                )}
              </div>
            );
          })}
            {!isSuppliView && (
              <div className="bg-muted/40 border border-border/80 p-6 rounded-lg shadow-sm opacity-80 select-none">
                <h3 className="font-semibold text-lg text-muted-foreground">
                  বিবিধ : {bibidhaSerial}
                </h3>
              </div>
            )}
          </div>
        )}
      </div>
      {!readOnly && (
        <div className="w-[30%] shrink-0 sticky top-8">
          <div className="bg-sidebar/50 border border-border rounded-lg p-5 shadow-sm backdrop-blur-sm">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Reorder Sequence</h3>

            <div className="space-y-2">
              {regularAgendas.map((agenda: any, index: number) => (
                <div
                  key={agenda.id}
                  draggable={!readOnly}
                  onDragStart={(e) => !readOnly && handleDragStart(e, agenda.id)}
                  onDragOver={!readOnly ? handleDragOver : undefined}
                  onDrop={(e) => !readOnly && handleDrop(e, agenda.id)}
                  className={`bg-card border border-border p-3 rounded-md flex items-center gap-3 transition-colors group shadow-sm ${!readOnly ? 'cursor-grab hover:border-primary/50 active:cursor-grabbing' : ''}`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium text-xs">
                    প্রস্তাবনা নং {(meeting.agenda_prefix || '') + (isSuppliView ? toBanglaDigits(mainAgendaCount + (agenda.agenda_serial || index + 1), 1) : toBanglaDigits(agenda.agenda_serial || index + 1))}
                  </span>
                  <span className="text-xs text-muted-foreground truncate flex-1 opacity-60">
                    {agenda.content ? agenda.content.replace(/<[^>]*>?/gm, '').substring(0, 38) : '...'}...
                  </span>
                </div>
              ))}

              {!isSuppliView && (
                <div
                  className="bg-muted/40 border border-border/80 p-3 rounded-md flex items-center gap-3 opacity-70 select-none cursor-not-allowed"
                >
                  <span className="font-semibold text-xs text-muted-foreground">
                    বিবিধ : {bibidhaSerial}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-6 text-center italic">
              Drag and drop items to reorder the sequence in real-time.
            </p>
          </div>
        </div>
      )}


      <TemplateDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        type="agendam"
        onSelect={(templateContent) => {
          if (editingId) {
            setEditContent(prev => prev + (prev ? '<br/>' : '') + templateContent);
          } else {
            setNewContent(prev => prev + (prev ? '<br/>' : '') + templateContent);
            if (createAtIndex === null) {
              setCreateAtIndex(agendas.length);
            }
          }
        }}
      />
    </div >


  );
}
