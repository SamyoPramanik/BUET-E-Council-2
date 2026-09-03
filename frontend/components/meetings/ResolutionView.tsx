"use client";

import { useState } from "react";
import { Edit3, FileText, FileCheck, Plus, Trash2 } from "lucide-react";
import RichTextEditor from "../RichTextEditor";
import AnnexureList from "./AnnexureList";
import RevisionHistory from "./RevisionHistory";
import TagMultiSelect from "../TagMultiSelect";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import { sanitizeHtml } from "../../lib/sanitize";
import { toast } from "sonner";
import TemplateDrawer from "../TemplateDrawer";
import { useAuth } from "../../hooks/useAuth";
import { canEditResolution } from "../../lib/meetingAccess";
import { useConfirm } from "../../hooks/useConfirm";
import { toBanglaDigits, getSerialWidth } from "../../lib/banglaNumerals";

function stripLeadingResolutionPrefix(content: string): string {
  if (!content) return '';
  let str = content.normalize('NFC').replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ').trim();
  // Strip standalone paragraph(s) containing only 'সিদ্ধান্ত' (with optional colon/punctuation/spaces)
  str = str.replace(/^(?:\s*<p[^>]*>\s*(?:<[^>]+>)*\s*সিদ্ধান্ত\s*[:.\-\u0983\uFF1A]?\s*(?:<\/[^>]+>)*\s*<\/p>\s*)+/gi, '');
  // Strip inline leading 'সিদ্ধান্ত' prefix at start of paragraph
  str = str.replace(/^(?:\s*<p[^>]*>)?\s*(?:<[^>]+>)*\s*সিদ্ধান্ত\s*[:.\-\u0983\uFF1A]?\s*(?:<\/[^>]+>)*\s*/gi, (match) => {
    return match.includes('<p') ? '<p>' : '';
  });
  // Strip trailing standalone paragraph(s) containing only 'সিদ্ধান্ত'
  str = str.replace(/(?:\s*<p[^>]*>\s*(?:<[^>]+>)*\s*সিদ্ধান্ত\s*[:.\-\u0983\uFF1A]?\s*(?:<\/[^>]+>)*\s*<\/p>\s*)+$/gi, '');
  // Clean up any residual empty strong/b/span tags at start of <p>
  str = str.replace(/(<p[^>]*>)\s*(?:<(strong|b|span|em)[^>]*>\s*<\/\2>\s*)+/gi, '$1');
  return str.trim();
}

export default function ResolutionView({ meeting }: { meeting: any }) {
  const { user } = useAuth();
  const canEdit = canEditResolution(user, meeting);
  const readOnly = !canEdit;
  const { confirm, ConfirmModal } = useConfirm();
  const { data: response, mutate } = useSWR(`/agendas?meeting_id=${meeting.id}`, fetcher, { fallbackData: { data: [] } });

  // Sort main agendas first, suppli agendas last, then by serial
  const allAgendas = [...(response?.data || [])].sort((a: any, b: any) => {
    if (a.is_suppli === b.is_suppli) {
      return (a.agenda_serial || 0) - (b.agenda_serial || 0);
    }
    return a.is_suppli ? 1 : -1;
  });

  // Main agenda count (excluding Bibidha) for supplementary numbering
  const mainAgendaCount = allAgendas.filter((a: any) => {
    if (a.is_suppli) return false;
    const clean = (a.content || '').replace(/<[^>]*>/g, '').trim();
    return !(a.agenda_serial === 0 || clean.startsWith('বিবিধ'));
  }).length;

  const agendas = allAgendas;

  const { data: tagsResponse, mutate: mutateTags } = useSWR('/tags', fetcher, { fallbackData: { data: [] } });
  const allTags = tagsResponse?.data || [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [targetAgendaId, setTargetAgendaId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executionContent, setExecutionContent] = useState("");
  const [isSavingExecution, setIsSavingExecution] = useState(false);

  const handleAddNewTag = async (name: string) => {
    try {
      const res = await api.post('/tags', { name });
      const tag = res.data.data;
      mutateTags();
      setEditTagIds(prev => [...prev, tag.id]);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Failed to create tag");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanResolution = stripLeadingResolutionPrefix(editContent);
      await api.put(`/agendas/resolutions/${editingId}`, { resolution: cleanResolution, tag_ids: editTagIds });
      mutate();
      setEditingId(null);
      toast.success("Resolution saved successfully");
    } catch (err) {
      toast.error("Failed to save resolution");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (agenda: any) => {
    setEditingId(agenda.id);
    setEditContent(stripLeadingResolutionPrefix(agenda.resolution || ""));
    setEditTagIds((agenda.tags || []).map((t: any) => t.id));
  };

  const handleDelete = (agendaId: string) => {
    confirm("Delete Resolution", "Are you sure you want to delete this resolution?", async () => {
      try {
        await api.delete(`/agendas/resolutions/${agendaId}`);
        mutate();
        toast.success("Resolution deleted");
      } catch (err) {
        toast.error("Failed to delete resolution");
      }
    });
  };

  const getResolutionStatus = (agenda: any): 'not_executed' | 'executed' | 'submitted' | 'custom' => {
    if (agenda.is_submitted_for_next_meeting) return 'submitted';
    const plain = (agenda.execution_status || '').replace(/<[^>]*>/g, '').trim();
    if (plain.length > 0) return 'custom';
    if (agenda.is_executed === true || agenda.is_executed === 'yes' || agenda.is_executed === 't' || agenda.is_executed === 'true') return 'executed';
    return 'not_executed';
  };

  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

  // Single-select: exactly one status at a time. The backend enforces
  // exclusivity (clearing the other fields + creating/removing the archive
  // copy), so every transition goes through the unified execution endpoint.
  const handleStatusChange = async (agenda: any, next: 'not_executed' | 'executed' | 'submitted' | 'custom', customText?: string) => {
    const current = getResolutionStatus(agenda);
    if (current === next && next !== 'custom') return;
    setStatusSavingId(agenda.id);
    setIsSavingExecution(true);
    setArchivingId(next === 'submitted' || current === 'submitted' ? agenda.id : null);
    try {
      if (next === 'custom') {
        if (!customText || !customText.replace(/<[^>]*>/g, '').trim()) {
          toast.error("Custom status text is required");
          return;
        }
        await api.put(`/agendas/resolutions/${agenda.id}/execution`, { status: 'custom', execution_status: customText });
        toast.success("Custom status saved");
      } else if (next === 'submitted') {
        await api.put(`/agendas/resolutions/${agenda.id}/execution`, { status: 'submitted' });
        toast.success("Submitted for next meeting");
      } else {
        await api.put(`/agendas/resolutions/${agenda.id}/execution`, { status: next });
        toast.success("Execution status updated");
      }
      mutate();
      if (next === 'custom') setExecutingId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to update");
    } finally {
      setStatusSavingId(null);
      setIsSavingExecution(false);
      setArchivingId(null);
    }
  };

  const BANGLA_GROUP_LETTERS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ', 'ট', 'ঠ', 'ড', 'ঢ', 'ণ', 'ত', 'থ', 'দ', 'ধ', 'ন', 'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'ষ', 'স', 'হ'];
  const totalAgendasCount = (agendas || []).length;
  const serialWidth = getSerialWidth(totalAgendasCount);

  const categoryHeaderMap = new Map<string, string>();
  {
    let currentCatId: string | null = null;
    let groupAgendas: any[] = [];
    let groupCount = 0;

    const processGroup = () => {
      if (groupAgendas.length > 0 && currentCatId) {
        const letter = BANGLA_GROUP_LETTERS[groupCount % BANGLA_GROUP_LETTERS.length];
        const catName = groupAgendas[0].category_name;
        const firstAg = groupAgendas[0];
        const lastAg = groupAgendas[groupAgendas.length - 1];

        const firstAgSerialStr = firstAg.is_suppli
          ? toBanglaDigits((mainAgendaCount || 0) + (firstAg.agenda_serial || 1), serialWidth)
          : toBanglaDigits(firstAg.agenda_serial, serialWidth);
        const lastAgSerialStr = lastAg.is_suppli
          ? toBanglaDigits((mainAgendaCount || 0) + (lastAg.agenda_serial || 1), serialWidth)
          : toBanglaDigits(lastAg.agenda_serial, serialWidth);

        const firstFull = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + firstAgSerialStr;
        const lastFull = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + lastAgSerialStr;

        const rangeText = firstFull === lastFull
          ? `${firstFull}`
          : `${firstFull} হতে ${lastFull}`;

        const headerStr = `'${letter}' গ্রুপ (প্রস্তাব নং ${rangeText}): ${catName}`;
        categoryHeaderMap.set(firstAg.id, headerStr);
        groupCount++;
      }
      groupAgendas = [];
    };

    (agendas || []).forEach((ag: any) => {
      const cleanContent = (ag.content || '').replace(/<[^>]*>/g, '').trim();
      const isBibidha = !ag.is_suppli && (ag.agenda_serial === 0 || cleanContent.startsWith('বিবিধ'));
      const catName = ag.category_name ? String(ag.category_name).trim() : '';
      const isUncategorized = !catName || /^(uncategorized|un-categorized|অশ্রেণীভুক্ত|অশ্রেণিভুক্ত)$/i.test(catName);

      if (isBibidha || !ag.category_id || isUncategorized) {
        processGroup();
        currentCatId = null;
      } else {
        if (ag.category_id !== currentCatId) {
          processGroup();
          currentCatId = ag.category_id;
        }
        groupAgendas.push(ag);
      }
    });
    processGroup();
  }

  return (
    <div className="max-w-4xl pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmModal />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Resolutions</h2>
      </div>

      {agendas.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-sm h-64">
          <div className="bg-muted p-4 rounded-full">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">No Agendum Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">There are no agendum items to add resolutions for. Please create an agendum first.</p>
          </div>
        </div>
      ) : (
        agendas.map((agenda: any, index: number) => {
          const cleanContent = (agenda.content || '').replace(/<[^>]*>/g, '').trim();
          const isBibidha = !agenda.is_suppli && (agenda.agenda_serial === 0 || cleanContent.startsWith('বিবিধ'));
          let displayContent = agenda.content || '';
          if (isBibidha) {
            displayContent = displayContent.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*বিবিধ\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]*\s*[০-৯\d]*)?\s*[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
          } else {
            displayContent = displayContent.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*প্রস্তাব(?:না)?\s*নং\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]+\s*)*[০-৯\d\s\/\-]*[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
            displayContent = displayContent.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*[০-৯\d]+\s*[:.\-]\s*(?:<\/strong>)?\s*/i, '$1');
          }
          const isOnlyBibidhaTitle = isBibidha && !displayContent.replace(/<[^>]*>/g, '').trim();
          if (isBibidha && isOnlyBibidhaTitle && !agenda.resolution) {
            return null;
          }
          const bibidhaSerial = (meeting.agenda_prefix || '') + toBanglaDigits((mainAgendaCount || 0) + 1, serialWidth);
          const displaySerial = agenda.is_suppli
            ? toBanglaDigits(mainAgendaCount + (agenda.agenda_serial || index + 1), serialWidth)
            : toBanglaDigits(agenda.agenda_serial || index + 1, serialWidth);

          const catHeader = categoryHeaderMap.get(agenda.id);

          return (
            <div key={agenda.id}>
              {catHeader && (
                <div className="text-lg font-bold text-primary mb-4 mt-8 pt-4 border-t border-border/50">
                  {catHeader}
                </div>
              )}
              <div className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm group">

                {/* Top Section (Read-Only Agenda) */}
                <div className="mb-6">
                  <h3 className="font-semibold text-base text-primary mb-2">
                    {isBibidha
                      ? (isOnlyBibidhaTitle ? `বিবিধ : ${bibidhaSerial}` : `বিবিধ :`)
                      : `প্রস্তাব নং ${(meeting.agenda_prefix || '') + displaySerial}`}
                  </h3>
                  {agenda.tags && agenda.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {agenda.tags.map((tag: any) => (
                        <span key={tag.id} className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-muted-foreground bg-muted/30 p-4 rounded-md border-l-4 border-muted/50 prose prose-sm dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: displayContent ? sanitizeHtml(displayContent) : "<p class='italic opacity-50'>Empty agenda...</p>" }} />
                  </div>

                  {/* Annexure List placed underneath the agenda content */}
                  <AnnexureList contentId={agenda.id} type="resolution" readOnly={!canEdit} />
                </div>

                {/* Bottom Section (The Resolution) */}
                <div>
                  <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider mb-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-primary" />
                      Resolution Outcome
                    </span>
                    {agenda.resolution && (
                      <div className="flex gap-2">
                        <RevisionHistory contentId={agenda.id} contentType="resolutionItem" onRestored={() => mutate()} canRestore={canEdit} />
                        {!readOnly && (
                          <>
                            <button
                              onClick={() => handleEditClick(agenda)}
                              className="text-primary opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-primary/10 rounded-md hover:bg-primary/20"
                              title="Edit Resolution"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(agenda.id)}
                              className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-destructive/10 rounded-md hover:bg-destructive/20"
                              title="Delete Resolution"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </h4>

                  {editingId === agenda.id ? (
                    <div className="border border-primary/50 rounded-md overflow-hidden ring-4 ring-primary/10">
                      <div className="p-3 border-b border-border bg-muted/30">
                        <TagMultiSelect
                          options={allTags}
                          value={editTagIds}
                          onChange={setEditTagIds}
                          onAddNew={handleAddNewTag}
                          placeholder="Add tags..."
                        />
                      </div>
                      <RichTextEditor
                        content={editContent}
                        onChange={setEditContent}
                        className="p-4 min-h-[300px] font-bold"
                      />
                      <div className="bg-muted p-2 flex justify-between items-center border-t border-border">
                        <button
                          onClick={() => { setTargetAgendaId(agenda.id); setIsDrawerOpen(true); }}
                          className="px-3 py-1 text-xs text-primary font-medium hover:bg-primary/10 rounded-md flex items-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" /> From Template
                        </button>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-muted-foreground hover:bg-background rounded-md">Cancel</button>
                          <button onClick={handleSave} disabled={isSaving} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md disabled:opacity-50">
                            {isSaving ? "Saving..." : "Save Resolution"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : agenda.resolution ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-foreground bg-background border border-border p-5 rounded-md shadow-inner font-bold"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(
                          stripLeadingResolutionPrefix(agenda.resolution)
                        )
                      }}
                    />
                  ) : (
                    !readOnly && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEditClick(agenda)}
                          className="bg-background border border-primary text-primary hover:bg-primary/5 shadow-sm py-2 px-4 text-sm font-medium rounded-md flex items-center gap-2 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" /> Create Resolution
                        </button>
                        <button
                          onClick={() => {
                            handleEditClick(agenda);
                            setTargetAgendaId(agenda.id);
                            setIsDrawerOpen(true);
                          }}
                          className="bg-accent text-accent-foreground border border-border shadow-sm py-2 px-4 text-sm font-medium rounded-md flex items-center gap-2 hover:bg-accent/80 transition-colors"
                        >
                          <FileText className="w-4 h-4" /> From Template
                        </button>
                      </div>
                    )
                  )}
                </div>

                {/* Execution Status (Only for past meetings) */}
                {meeting.status === 'past' && agenda.resolution && (
                  <div className="mt-8 pt-6 border-t border-border/50">
                    <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                      Execution Status
                    </h4>

                    {(() => {
                      const currentStatus = getResolutionStatus(agenda);
                      const busy = statusSavingId === agenda.id || archivingId === agenda.id;
                      return (
                      <div className="space-y-4">
                      {/* Single-select resolution status: only one active at a time */}
                      <div className="flex flex-col gap-2">
                        {([
                          { value: 'not_executed', label: 'Not Executed' },
                          { value: 'executed', label: 'Executed' },
                          { value: 'submitted', label: archivingId === agenda.id ? 'Updating...' : 'Submit for Next Meeting' },
                          { value: 'custom', label: 'Custom' },
                        ] as const).map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`execution-${agenda.id}`}
                              disabled={readOnly || busy}
                              className="w-4 h-4 border-input text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                              checked={currentStatus === opt.value}
                              onChange={() => {
                                if (opt.value === 'custom') {
                                  setExecutingId(agenda.id);
                                  setExecutionContent(agenda.execution_status || "");
                                } else {
                                  handleStatusChange(agenda, opt.value);
                                }
                              }}
                            />
                            <span className="text-sm font-medium">{opt.label}</span>
                          </label>
                        ))}
                      </div>

                      {/* Custom status input — visible when Custom is selected */}
                      {(currentStatus === 'custom' || executingId === agenda.id) && (
                        <div>
                          {executingId === agenda.id && !readOnly ? (
                            <div className="border border-primary/50 rounded-md overflow-hidden ring-4 ring-primary/10">
                              <RichTextEditor
                                content={executionContent}
                                onChange={setExecutionContent}
                                className="p-4 min-h-[100px]"
                              />
                              <div className="bg-muted p-2 flex justify-end gap-2 border-t border-border">
                                <button onClick={() => {
                                  setExecutingId(null);
                                  if (currentStatus !== 'custom') setExecutionContent("");
                                }} className="px-3 py-1 text-xs text-muted-foreground hover:bg-background rounded-md">Cancel</button>
                                <button onClick={() => handleStatusChange(agenda, 'custom', executionContent)}
                                  disabled={isSavingExecution || busy} className="px-3 py-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700 rounded-md disabled:opacity-50 transition-colors">
                                  {isSavingExecution || busy ? "Saving..." : "Save"}
                                </button>
                              </div>
                            </div>
                          ) : agenda.execution_status ? (
                            <div className="relative group">
                              {!readOnly && (
                              <button
                                onClick={() => { setExecutingId(agenda.id); setExecutionContent(agenda.execution_status); }}
                                className="absolute top-0 right-0 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-emerald-50 rounded-md hover:bg-emerald-100 flex items-center gap-2 text-xs font-medium z-10"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              )}
                              <div
                                className="prose prose-sm dark:prose-invert max-w-none text-foreground bg-emerald-200/30 border border-emerald-100 p-4 rounded-md shadow-sm"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(agenda.execution_status) }}
                              />
                            </div>
                          ) : null}
                        </div>
                      )}
                      </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      <TemplateDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        type="resolution"
        onSelect={(templateContent) => {
          if (editingId === targetAgendaId) {
            setEditContent(prev => prev + (prev ? '<br/>' : '') + templateContent);
          } else {
            // Unlikely to hit this branch because we set editingId when opening from "Create" view
            setEditContent(prev => prev + (prev ? '<br/>' : '') + templateContent);
          }
        }}
      />
    </div>
  );
}
