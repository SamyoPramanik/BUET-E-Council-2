"use client";

import { useState, useEffect, useRef } from "react";
import { Edit3, Plus, FileText, GripVertical, Trash2, Tag, FolderTree, Layers, Archive, Loader2, ChevronUp, ChevronDown, ArrowLeftRight, PanelRightClose, PanelRightOpen } from "lucide-react";
import RichTextEditor from "../RichTextEditor";
import RichContentView from "./RichContentView";
import AnnexureList from "./AnnexureList";
import RevisionHistory from "./RevisionHistory";
import TagChipSelector from "../TagChipSelector";
import useSWR from "swr";
import api, { fetcher } from "../../lib/api";
import { toast } from "sonner";
import { useConfirm } from "../../hooks/useConfirm";
import useSidebarCollapsed from "../../hooks/useSidebarCollapsed";
import { useAuth } from "../../hooks/useAuth";
import { canEditAgenda, canEditSuppliAgenda, canArchiveAgenda } from "../../lib/meetingAccess";
import { toBanglaDigits, getSerialWidth } from "../../lib/banglaNumerals";
import TemplateDrawer from "../TemplateDrawer";
import ArchivedAgendasModal from "./ArchivedAgendasModal";

export default function AgendaView({ meeting, type }: { meeting: any, type: string }) {
  const { user } = useAuth();
  const isSuppliView = type === 'suppli-agenda';
  const canEdit = isSuppliView ? canEditSuppliAgenda(user, meeting) : canEditAgenda(user, meeting);
  const canManageAnnexures = canEdit;
  const { data: response, mutate } = useSWR(`/agendas?meeting_id=${meeting.id}&is_suppli=${isSuppliView}`, fetcher, { fallbackData: { data: [] } });
  const agendas = response?.data || [];
  const { confirm, ConfirmModal } = useConfirm();

  const { data: categoriesRes } = useSWR('/categories', fetcher);
  const allCategories = categoriesRes?.data || [];

  const { data: mainAgendasRes } = useSWR(
    isSuppliView ? `/agendas?meeting_id=${meeting.id}&is_suppli=false` : null,
    fetcher
  );
  const mainAgendasList = isSuppliView ? (mainAgendasRes?.data || []) : agendas;
  const mainAgendaCount = mainAgendasList.filter((a: any) => {
    if (a.is_suppli) return false;
    const clean = (a.content || '').replace(/<[^>]*>/g, '').trim();
    return a.agenda_serial !== 0 && !clean.startsWith('বিবিধ');
  }).length;

  const totalAgendasCount = (agendas || []).length;
  const serialWidth = getSerialWidth(totalAgendasCount);

  const bibidhaSerialNum = mainAgendaCount + 1;
  const bibidhaSerial = (meeting.agenda_prefix || '') + toBanglaDigits(bibidhaSerialNum, serialWidth);

  const regularAgendas = agendas;
  const hasBibidhaInAgendas = regularAgendas.some((a: any) => {
    const clean = (a.content || '').replace(/<[^>]*>/g, '').trim();
    return !isSuppliView && (a.agenda_serial === 0 || clean.startsWith('বিবিধ'));
  });

  const isEmergencyMeeting = meeting.is_regular === false;
  const emergencyLimitReached = !isSuppliView && isEmergencyMeeting && regularAgendas.length >= 1;

  const { data: tagsResponse, mutate: mutateTags } = useSWR('/tags', fetcher, { fallbackData: { data: [] } });
  const allTags = tagsResponse?.data || [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // In-place creation state
  const [createAtIndex, setCreateAtIndex] = useState<number | null>(null);
  const [createIsSuppli, setCreateIsSuppli] = useState<boolean>(isSuppliView);
  const [newContent, setNewContent] = useState("");
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const userCanArchive = canArchiveAgenda(user, meeting);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchivingId, setIsArchivingId] = useState<string | null>(null);

  const handleArchive = (id: string) => {
    confirm("Archive Agendum", "Are you sure you want to move this agenda item to the Archive Box?", async () => {
      setIsArchivingId(id);
      try {
        await api.put(`/agendas/${id}/archive`);
        toast.success("Agenda moved to Archive Box");
        mutate();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to archive agenda");
      } finally {
        setIsArchivingId(null);
      }
    });
  };

  useEffect(() => {
    setCreateAtIndex(null);
    setEditingId(null);
    setCreateIsSuppli(isSuppliView);
    setNewContent("");
    setNewTagIds([]);
    setNewCategoryId("");
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
      await api.put(`/agendas/${editingId}`, {
        content: editContent,
        tag_ids: editTagIds,
        category_id: editCategoryId || null
      });
      mutate();
      setEditingId(null);
      toast.success("Agendum saved successfully");
    } catch (err: any) {
      toast.error("Failed to save agendum");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (agenda: any) => {
    setEditingId(agenda.id);
    setEditContent(agenda.content || "");
    setEditTagIds((agenda.tags || []).map((t: any) => t.id));
    setEditCategoryId(agenda.category_id || "");
    setCreateAtIndex(null);
  };

  const handleStartCreate = (atIndex: number) => {
    setCreateAtIndex(atIndex);
    setCreateIsSuppli(isSuppliView);
    setNewContent("");
    setNewTagIds([]);
    setNewCategoryId("");
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
        category_id: newCategoryId || null,
        meeting_criteria: (!createIsSuppli && isEmergencyMeeting) ? 'emergency' : undefined
      });
      mutate();
      setCreateAtIndex(null);
      setNewTagIds([]);
      setNewCategoryId("");
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

  // Build sequence items for the right panel: contiguous category blocks or standalone uncategorized agendas
  const reorderSequence = (() => {
    const sequence: (
      | { type: 'category'; key: string; categoryId: string; categoryName: string; agendas: any[] }
      | { type: 'agenda'; key: string; agenda: any }
    )[] = [];

    regularAgendas.forEach((agenda: any, idx: number) => {
      const clean = (agenda.content || '').replace(/<[^>]*>/g, '').trim();
      const isBibidha = !isSuppliView && (agenda.agenda_serial === 0 || clean.startsWith('বিবিধ'));
      if (isBibidha) return;

      const catId = agenda.category_id || null;
      const catName = agenda.category_name ? String(agenda.category_name).trim() : '';
      const isUncategorized = !catId || !catName || /^(uncategorized|un-categorized|অশ্রেণীভুক্ত|অশ্রেণিভুক্ত)$/i.test(catName);

      if (isUncategorized) {
        sequence.push({
          type: 'agenda',
          key: `agenda-${agenda.id}`,
          agenda
        });
      } else {
        const lastItem = sequence[sequence.length - 1];
        if (lastItem && lastItem.type === 'category' && lastItem.categoryId === catId) {
          lastItem.agendas.push(agenda);
        } else {
          sequence.push({
            type: 'category',
            key: `cat-${catId}-${idx}`,
            categoryId: catId,
            categoryName: catName,
            agendas: [agenda]
          });
        }
      }
    });

    return sequence;
  })();

  // ---- Reordering: one path for drag-and-drop, Move up/down/above/below/Swap, Undo and Redo.
  // History is a list of agenda-id orders, one entry per step, so every step can be
  // undone (and redone) on its own.
  const [past, setPast] = useState<string[][]>([]);
  const [future, setFuture] = useState<string[][]>([]);
  const [reordering, setReordering] = useState(false);
  const [moveDialogId, setMoveDialogId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState('');

  const currentIds = () => regularAgendas.map((a: any) => a.id);
  const plainText = (a: any) => (a.content || '').replace(/<[^>]*>/g, '').trim();
  const isBibidhaAgenda = (a: any) => !isSuppliView && (a.agenda_serial === 0 || plainText(a).startsWith('বিবিধ'));
  const normCat = (a: any): string | null => {
    const cId = a.category_id || null;
    const cName = a.category_name ? String(a.category_name).trim() : '';
    if (!cId || !cName || /^(uncategorized|un-categorized|অশ্রেণীভুক্ত|অশ্রেণিভুক্ত)$/i.test(cName)) return null;
    return cId;
  };
  // A short preview of the agenda for the panel (about two lines).
  const agendaSnippet = (a: any) => {
    const t = plainText(a).replace(/\s+/g, ' ');
    return t.length > 90 ? `${t.slice(0, 90)}…` : t || '—';
  };
  const agendaSerialLabel = (a: any) => {
    const idx = regularAgendas.findIndex((x: any) => x.id === a.id);
    return isBibidhaAgenda(a)
      ? `বিবিধ : ${bibidhaSerial}`
      : `প্রস্তাব নং ${(meeting.agenda_prefix || '') + (isSuppliView ? toBanglaDigits(mainAgendaCount + (a.agenda_serial || idx + 1), serialWidth) : toBanglaDigits(a.agenda_serial || idx + 1, serialWidth))}`;
  };

  // Write an order (list of ids) to the cache and the server. Agendas not named in
  // `ids` (added or restored meanwhile) keep their relative order at the end.
  const writeOrder = async (ids: string[]): Promise<boolean> => {
    const byId = new Map<string, any>(agendas.map((a: any) => [a.id, a]));
    const ordered = ids.filter(id => byId.has(id));
    const placed = new Set(ordered);
    const full = [...ordered.map(id => byId.get(id)), ...agendas.filter((a: any) => !placed.has(a.id))];
    // The main agenda's বিবিধ item always ends up last (the server enforces it too).
    if (!isSuppliView) {
      const bi = full.findIndex((a: any) => isBibidhaAgenda(a));
      if (bi >= 0 && bi !== full.length - 1) full.push(full.splice(bi, 1)[0]);
    }
    const updated = full.map((a: any, idx: number) => ({ ...a, agenda_serial: idx + 1 }));
    mutate({ ...response, data: updated }, false);
    try {
      // One request for the whole order (one permission check, one transaction),
      // instead of one request per agenda.
      await api.put(`/agendas/meeting/${meeting.id}/order`, { ids: full.map((a: any) => a.id), is_suppli: isSuppliView });
      mutate();
      return true;
    } catch {
      toast.error("Failed to reorder sequence");
      mutate();
      return false;
    }
  };

  const undoReorder = async () => {
    if (readOnly || past.length === 0) return;
    if (reordering) { toast.info("Saving the previous change — try again in a moment"); return; }
    const target = past[past.length - 1];
    const now = currentIds();
    setReordering(true);
    const ok = await writeOrder(target);
    setReordering(false);
    if (ok) {
      setPast(prev => prev.slice(0, -1));
      setFuture(prev => [...prev, now]);
      toast.success("Reorder undone");
    }
  };

  const redoReorder = async () => {
    if (readOnly || future.length === 0) return;
    if (reordering) { toast.info("Saving the previous change — try again in a moment"); return; }
    const target = future[future.length - 1];
    const now = currentIds();
    setReordering(true);
    const ok = await writeOrder(target);
    setReordering(false);
    if (ok) {
      setFuture(prev => prev.slice(0, -1));
      setPast(prev => [...prev.slice(-49), now]);
      toast.success("Reorder redone");
    }
  };

  // The toast's Undo button outlives the render that created it, so it must call
  // the latest undoReorder (current agendas / history), not a stale copy.
  const undoRef = useRef<() => void>(() => {});
  useEffect(() => {
    undoRef.current = () => { void undoReorder(); };
  });

  const applyReorderedAgendas = async (newAgendas: any[]) => {
    if (readOnly) return;
    if (reordering) { toast.info("Saving the previous change — try again in a moment"); return; }
    const before = currentIds();
    const nextIds = newAgendas.map((a: any) => a.id);
    if (nextIds.length === before.length && nextIds.every((id: string, i: number) => id === before[i])) return;
    setReordering(true);
    const ok = await writeOrder(nextIds);
    setReordering(false);
    if (ok) {
      setPast(prev => [...prev.slice(-49), before]);
      setFuture([]);
      toast.success("Sequence reordered", { action: { label: "Undo", onClick: () => undoRef.current() } });
    }
  };

  // A category's agendas must stay together in one group.
  const categoriesContiguous = (list: any[]) => {
    const seen = new Set<string>();
    let prevCat: string | null = null;
    for (const a of list) {
      const c = normCat(a);
      if (c !== null && c !== prevCat && seen.has(c)) return false;
      if (c !== null) seen.add(c);
      prevCat = c;
    }
    return true;
  };

  // Move / swap an agenda by a button instead of dragging. It obeys the same rules
  // as drag-and-drop (categories can't be mixed, বিবিধ stays last) and also won't
  // split a category group.
  const moveAgenda = async (id: string, how: 'up' | 'down' | 'above' | 'below' | 'swap', targetId?: string) => {
    if (readOnly) return;
    if (reordering) { toast.info("Saving the previous change — try again in a moment"); return; }
    const list = [...regularAgendas];
    const si = list.findIndex((a: any) => a.id === id);
    if (si < 0) return;
    const source = list[si];
    if (isBibidhaAgenda(source)) { toast.error("বিবিধ always stays last"); return; }

    let result: any[] | null = null;
    if (how === 'up' || how === 'down') {
      const dir = how === 'up' ? -1 : 1;
      const neighbour = list[si + dir];
      if (!neighbour || isBibidhaAgenda(neighbour)) return;
      const sc = normCat(source);
      const nc = normCat(neighbour);
      if (sc !== null && nc !== null && sc !== nc) { toast.error("Agendas of different categories cannot be mixed"); return; }
      const arr = [...list];
      if (sc === null && nc !== null) {
        // An uncategorized agenda hops over the whole neighbouring category group.
        let ti = si + dir;
        while (arr[ti + dir] && normCat(arr[ti + dir]) === nc && !isBibidhaAgenda(arr[ti + dir])) ti += dir;
        const [m] = arr.splice(si, 1);
        arr.splice(ti, 0, m);
      } else {
        [arr[si], arr[si + dir]] = [arr[si + dir], arr[si]];
      }
      result = arr;
    } else {
      const target = list.find((a: any) => a.id === targetId);
      if (!target || target.id === id) return;
      if (isBibidhaAgenda(target)) { toast.error("বিবিধ always stays last"); return; }
      const sc = normCat(source);
      const tc = normCat(target);
      if (sc !== null && tc !== null && sc !== tc) { toast.error("Agendas of different categories cannot be mixed"); return; }
      const arr = [...list];
      if (how === 'swap') {
        const ti = arr.findIndex((a: any) => a.id === target.id);
        [arr[si], arr[ti]] = [arr[ti], arr[si]];
      } else {
        const [m] = arr.splice(si, 1);
        const ti = arr.findIndex((a: any) => a.id === target.id);
        arr.splice(how === 'above' ? ti : ti + 1, 0, m);
      }
      result = arr;
    }

    if (!result) return;
    if (categoriesContiguous(list) && !categoriesContiguous(result)) {
      toast.error("That would split a category group — keep each category's agendas together");
      return;
    }
    await applyReorderedAgendas(result);
  };

  // Double-clicking an item in the right panel scrolls to that agenda's card and
  // briefly highlights it.
  const jumpToAgenda = (agendaId: string) => {
    const el = document.getElementById(`agenda-card-${agendaId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary');
    window.setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1600);
  };

  // Agenda Drag & Drop inside Right Panel
  const handleAgendaDragStart = (e: React.DragEvent, agendaId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData("type", "agenda");
    e.dataTransfer.setData("agenda_id", agendaId);
  };

  const handleAgendaDrop = async (e: React.DragEvent, targetAgendaId: string) => {
    e.preventDefault();
    if (readOnly) return;
    e.stopPropagation();

    const dragType = e.dataTransfer.getData("type");
    if (dragType === "category") {
      const sourceSeqKey = e.dataTransfer.getData("seq_key");
      handleSequenceBlockDrop(sourceSeqKey, targetAgendaId);
      return;
    }

    if (dragType !== "agenda") return;

    const sourceAgendaId = e.dataTransfer.getData("agenda_id");
    if (sourceAgendaId === targetAgendaId) return;

    const sourceAg = regularAgendas.find((a: any) => a.id === sourceAgendaId);
    const targetAg = regularAgendas.find((a: any) => a.id === targetAgendaId);
    if (!sourceAg || !targetAg) return;

    const getNormCat = (ag: any) => {
      const cId = ag.category_id || null;
      const cName = ag.category_name ? String(ag.category_name).trim() : '';
      if (!cId || !cName || /^(uncategorized|un-categorized|অশ্রেণীভুক্ত|অশ্রেণিভুক্ত)$/i.test(cName)) {
        return null;
      }
      return cId;
    };

    const sourceCatId = getNormCat(sourceAg);
    const targetCatId = getNormCat(targetAg);

    // Enforce category boundary rule: Agendas belonging to different categories cannot be mixed
    if (sourceCatId !== null && targetCatId !== null && sourceCatId !== targetCatId) {
      toast.error("Agendas of different categories cannot be mixed");
      return;
    }

    const sourceIndex = regularAgendas.findIndex((a: any) => a.id === sourceAgendaId);
    const targetIndex = regularAgendas.findIndex((a: any) => a.id === targetAgendaId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const newAgendas = [...regularAgendas];
    const [moved] = newAgendas.splice(sourceIndex, 1);
    newAgendas.splice(targetIndex, 0, moved);

    await applyReorderedAgendas(newAgendas);
  };

  // Category Block Drag & Drop
  const handleCategoryDragStart = (e: React.DragEvent, seqKey: string) => {
    e.dataTransfer.setData("type", "category");
    e.dataTransfer.setData("seq_key", seqKey);
  };

  const handleSequenceBlockDrop = async (sourceSeqKey: string, targetAgendaId: string) => {
    const sourceBlock = reorderSequence.find(item => item.key === sourceSeqKey);
    if (!sourceBlock || sourceBlock.type !== 'category') return;

    const sourceAgendaIds = sourceBlock.agendas.map((a: any) => a.id);
    if (sourceAgendaIds.includes(targetAgendaId)) return;

    const sourceAgendas = regularAgendas.filter((a: any) => sourceAgendaIds.includes(a.id));
    const remainingAgendas = regularAgendas.filter((a: any) => !sourceAgendaIds.includes(a.id));

    let insertIdx = remainingAgendas.findIndex((a: any) => a.id === targetAgendaId);
    if (insertIdx < 0) insertIdx = remainingAgendas.length;

    remainingAgendas.splice(insertIdx, 0, ...sourceAgendas);

    await applyReorderedAgendas(remainingAgendas);
  };

  const handleSequenceDropOnBlock = async (e: React.DragEvent, targetSeqKey: string) => {
    e.preventDefault();
    if (readOnly) return;
    e.stopPropagation();

    const dragType = e.dataTransfer.getData("type");
    if (dragType === "category") {
      const sourceSeqKey = e.dataTransfer.getData("seq_key");
      if (sourceSeqKey === targetSeqKey) return;
      const targetBlock = reorderSequence.find(item => item.key === targetSeqKey);
      if (!targetBlock) return;
      const targetFirstAgendaId = targetBlock.type === 'category' ? targetBlock.agendas[0]?.id : targetBlock.agenda.id;
      if (targetFirstAgendaId) {
        handleSequenceBlockDrop(sourceSeqKey, targetFirstAgendaId);
      }
    } else if (dragType === "agenda") {
      const targetBlock = reorderSequence.find(item => item.key === targetSeqKey);
      if (!targetBlock) return;
      const targetFirstAgendaId = targetBlock.type === 'category' ? targetBlock.agendas[0]?.id : targetBlock.agenda.id;
      if (targetFirstAgendaId) {
        handleAgendaDrop(e, targetFirstAgendaId);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // The list scrolls, so a long drag needs help: while dragging near its top or
  // bottom edge, scroll it (faster the closer to the edge).
  const listRef = useRef<HTMLDivElement>(null);

  // The sequence panel can be hidden with an icon (remembered in this browser).
  const [panelHidden, togglePanel] = useSidebarCollapsed('agendaSequencePanelHidden');
  const autoScrollWhileDragging = (e: React.DragEvent) => {
    const el = listRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const zone = 64;
    const fromTop = e.clientY - rect.top;
    const fromBottom = rect.bottom - e.clientY;
    if (fromTop < zone) el.scrollTop -= Math.ceil(((zone - Math.max(fromTop, 0)) / zone) * 26);
    else if (fromBottom < zone) el.scrollTop += Math.ceil(((zone - Math.max(fromBottom, 0)) / zone) * 26);
  };

  // Small up / down / "change position" buttons on each panel item (editors only).
  const renderMoveControls = (agenda: any) => {
    if (readOnly) return null;
    const idx = regularAgendas.findIndex((a: any) => a.id === agenda.id);
    const prev = regularAgendas[idx - 1];
    const next = regularAgendas[idx + 1];
    const canUp = !!prev && !isBibidhaAgenda(prev);
    const canDown = !!next && !isBibidhaAgenda(next);
    const btn = "p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground cursor-pointer disabled:cursor-not-allowed";
    const stop = (e: React.SyntheticEvent) => e.stopPropagation();
    return (
      <div className="flex items-center shrink-0" onDoubleClick={stop} onClick={stop}>
        <button type="button" className={btn} disabled={!canUp || reordering} title="Move up" onClick={() => moveAgenda(agenda.id, 'up')}>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btn} disabled={!canDown || reordering} title="Move down" onClick={() => moveAgenda(agenda.id, 'down')}>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={btn} disabled={reordering} title="Change position: place above / below another agenda, or swap"
          onClick={() => { setMoveTargetId(''); setMoveDialogId(agenda.id); }}>
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderCreateForm = () => (
    <div className="bg-card border border-primary/50 rounded-lg relative group shadow-sm hover:shadow-md transition-shadow my-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-lg text-primary">
            New {isSuppliView ? 'Supplementary Agendum' : title}
          </h3>
        </div>
        <div className="border border-primary/50 rounded-md overflow-hidden ring-2 ring-primary/20 space-y-4 p-4 bg-background">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category (Optional)</label>
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">(No Category / Uncategorized)</option>
              {allCategories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <RichTextEditor
            content={newContent}
            onChange={setNewContent}
            onSave={() => { if (!isSaving && newContent) handleSaveNew(); }}
            className="p-4 min-h-[380px]"
          />

          <div className="bg-muted p-3 flex justify-between items-center gap-4 border-t border-border rounded-md">
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

  const hasCustomAgendas = regularAgendas.some((a: any) => {
    const clean = (a.content || '').replace(/<[^>]*>/g, '').trim();
    return !(!isSuppliView && (a.agenda_serial === 0 || clean.startsWith('বিবিধ')));
  });

  const BANGLA_GROUP_LETTERS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ', 'ট', 'ঠ', 'ড', 'ঢ', 'ণ', 'ত', 'থ', 'দ', 'ধ', 'ন', 'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'ষ', 'স', 'হ'];
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

        const firstAgSerialStr = isSuppliView
          ? toBanglaDigits(mainAgendaCount + (firstAg.agenda_serial || 1), serialWidth)
          : toBanglaDigits(firstAg.agenda_serial, serialWidth);
        const lastAgSerialStr = isSuppliView
          ? toBanglaDigits(mainAgendaCount + (lastAg.agenda_serial || 1), serialWidth)
          : toBanglaDigits(lastAg.agenda_serial, serialWidth);

        const firstFull = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + firstAgSerialStr;
        const lastFull = (meeting.agenda_prefix ? toBanglaDigits(meeting.agenda_prefix) : '') + lastAgSerialStr;

        const rangeText = firstFull === lastFull
          ? `${firstFull}`
          : `${firstFull} হতে ${lastFull}`;

        const headerStr = `'${letter}' গ্রুপ প্রস্তাব নং ${rangeText}${firstFull === lastFull ? ":" : " পর্যন্ত"} (${String(catName ?? "").trim().replace(/^[\s(（]+|[\s)）]+$/g, "")})`;
        categoryHeaderMap.set(firstAg.id, headerStr);
        groupCount++;
      }
      groupAgendas = [];
    };

    (regularAgendas || []).forEach((ag: any) => {
      const cleanText = ag.content ? ag.content.replace(/<[^>]*>/g, '').trim() : '';
      const isBibidha = !isSuppliView && (ag.agenda_serial === 0 || cleanText.startsWith('বিবিধ'));
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

  if (isSuppliView && isEmergencyMeeting) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-3 max-w-2xl mx-auto my-8 shadow-sm">
        <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto" />
        <h3 className="text-xl font-bold text-foreground">No Supplementary Agendas</h3>
        <p className="text-sm text-muted-foreground">Immediate meetings are restricted to 1 main agendum and cannot have supplementary agendas.</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmModal />
      <div className={`flex-1 ${reorderSequence.length > 0 && !panelHidden ? 'w-[70%] max-w-4xl' : 'w-full max-w-5xl'} pb-32`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          {meeting.status === 'draft' && userCanArchive && (
            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              <span>+ Add from Archive Box</span>
            </button>
          )}
        </div>

        {!hasCustomAgendas && createAtIndex === null ? (
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

            {regularAgendas.map((agenda: any, index: number) => {
              const cleanText = agenda.content ? agenda.content.replace(/<[^>]*>/g, '').trim() : '';
              const isBibidha = !isSuppliView && (agenda.agenda_serial === 0 || cleanText.startsWith('বিবিধ'));
              if (!isBibidha) return null;
              let displayContent = agenda.content || '';
              displayContent = displayContent.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*বিবিধ\s*[:.\-]?\s*(?:[০-৯\d]+\s*)?[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
              const strippedText = displayContent.replace(/<[^>]*>/g, '').trim();
              const isOnlyBibidhaTitle = isBibidha && !strippedText;

              return (
                <div key={agenda.id} className="bg-card border border-border/80 bg-muted/20 p-6 rounded-lg relative group shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg text-primary flex items-center gap-2 flex-wrap">
                      {`বিবিধ : ${bibidhaSerial}`}
                    </h3>
                    <div className="flex items-center gap-2">
                      {!readOnly && !isBibidha && (
                        <button
                          onClick={() => handleDelete(agenda.id)}
                          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-destructive/10 rounded-md hover:bg-destructive/20"
                          title="Delete Agendum"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {!isOnlyBibidhaTitle && (
                    <RichContentView html={displayContent || "<p class='text-muted-foreground italic'>Empty content...</p>"} />
                  )}
                </div>
              );
            })}

            {!isSuppliView && !isEmergencyMeeting && !hasBibidhaInAgendas && (
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
              const isBibidha = !isSuppliView && (agenda.agenda_serial === 0 || cleanText.startsWith('বিবিধ'));
              let displayContent = agenda.content || '';
              if (isBibidha) {
                displayContent = displayContent.replace(/(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*বিবিধ\s*[:.\-]?\s*(?:[০-৯\d]+\s*)?[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
              } else {
                // Anchored to the start, and a "-" only ends the serial when it is
                // NOT followed by more digits, so a leading year range like
                // "2026-2027 …" is left intact (matches stripProposalPrefix on the
                // backend — keep the two in sync).
                displayContent = displayContent.replace(/^(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*প্রস্তাব(?:না)?\s*নং\s*[:.\-]?\s*(?:[ঀ-৥ৰ-৿\w]+\s*)*[০-৯\d\s\/\-]*[:.\-]?\s*(?:<\/strong>)?\s*/i, '$1');
                displayContent = displayContent.replace(/^(<p[^>]*>)?\s*(?:<strong[^>]*>)?\s*[০-৯\d]+\s*(?:[:.]|-(?!\s*[০-৯\d]))\s*(?:<\/strong>)?\s*/i, '$1');
              }

              const strippedText = displayContent.replace(/<[^>]*>/g, '').trim();
              const isOnlyBibidhaTitle = isBibidha && !strippedText;
              const catHeader = categoryHeaderMap.get(agenda.id);
              // The PDF's "A" / "C" token for the flush-left label column.
              const acToken = String(meeting.agenda_prefix || '').trim().split(/\s+/)[0] || '';
              // The serial the PDF prints after the label: the whole "A ২৬০৬০১" minus its
              // A / C token (same rule as pdfGenerator's serialOnly).
              const fullSerial = (meeting.agenda_prefix || '') + (isSuppliView
                ? toBanglaDigits(mainAgendaCount + (agenda.agenda_serial || index + 1), serialWidth)
                : toBanglaDigits(agenda.agenda_serial || index + 1, serialWidth));
              const serialOnly = acToken && fullSerial.startsWith(toBanglaDigits(acToken))
                ? fullSerial.slice(toBanglaDigits(acToken).length).replace(/^\s+/, '')
                : fullSerial;

              return (
                <div key={agenda.id}>
                  {catHeader && (
                    <div className="text-lg font-bold text-primary mb-4 mt-8 pt-4 border-t border-border/50">
                      {catHeader}
                    </div>
                  )}
                  {/* Agenda Card */}
                  <div id={`agenda-card-${agenda.id}`} className={`bg-card border ${isBibidha ? 'border-border/80 bg-muted/20' : 'border-border'} p-6 rounded-lg relative group shadow-sm hover:shadow-md transition-all scroll-mt-24`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg text-primary flex items-center gap-2 flex-wrap">
                          {isBibidha
                            ? `বিবিধ : ${bibidhaSerial}`
                            : `প্রস্তাব নং ${(meeting.agenda_prefix || '') + (isSuppliView ? toBanglaDigits(mainAgendaCount + (agenda.agenda_serial || index + 1), serialWidth) : toBanglaDigits(agenda.agenda_serial || index + 1, serialWidth))}`}
                        </h3>
                        {agenda.category_name && !isBibidha && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            <FolderTree className="w-3 h-3" />
                            {agenda.category_name}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!readOnly && (
                          <>
                            {(!isBibidha || !isOnlyBibidhaTitle) && (
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
                            {!isBibidha && (
                              <>
                                {meeting.status === 'draft' && userCanArchive && (
                                  <button
                                    onClick={() => handleArchive(agenda.id)}
                                    disabled={isArchivingId === agenda.id}
                                    className="text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-amber-500/10 rounded-md hover:bg-amber-500/20 disabled:opacity-50"
                                    title="Archive Agendum"
                                  >
                                    {isArchivingId === agenda.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Archive className="w-4 h-4" />
                                    )}
                                  </button>
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
                          </>
                        )}
                      </div>
                    </div>

                    {agenda.tags && agenda.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4 mt-1">
                        {agenda.tags.map((tag: any) => (
                          <span key={tag.id} className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {editingId === agenda.id ? (
                      <div className="border border-primary/50 rounded-md overflow-hidden ring-2 ring-primary/20 p-4 space-y-4 bg-background">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category (Optional)</label>
                          <select
                            value={editCategoryId}
                            onChange={(e) => setEditCategoryId(e.target.value)}
                            className="w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          >
                            <option value="">(No Category / Uncategorized)</option>
                            {allCategories.map((cat: any) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <RichTextEditor
                          key={editingId}
                          content={editContent}
                          onChange={setEditContent}
                          onSave={() => { if (!isSaving) handleSave(); }}
                          className="p-4 min-h-[380px]"
                          hangingLabel={isBibidha ? undefined : `প্রস্তাব নং${acToken ? " " + acToken : ""}`}
                          hangingPrefix={isBibidha ? undefined : `${serialOnly}:`}
                        />

                        <div className="bg-muted p-2 px-3 flex justify-between items-center gap-4 border-t border-border rounded-md">
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
                        <RichContentView html={displayContent || "<p class='text-muted-foreground italic'>Empty content...</p>"} />
                      )
                    )}

                    {!isBibidha && (
                      <AnnexureList contentId={agenda.id} type="agenda" isSuppli={agenda.is_suppli || isSuppliView} readOnly={!canManageAnnexures} />
                    )}
                  </div>

                  {createAtIndex === index + 1 && renderCreateForm()}

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
            {!isSuppliView && !isEmergencyMeeting && !hasBibidhaInAgendas && (
              <div className="bg-muted/40 border border-border/80 p-6 rounded-lg shadow-sm opacity-80 select-none">
                <h3 className="font-semibold text-lg text-muted-foreground">
                  বিবিধ : {bibidhaSerial}
                </h3>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Side Reorder Panel (also on the supplementary agenda tab). Everyone can
          use it to jump to an agenda; only editors can drag to reorder. */}
      {reorderSequence.length > 0 && panelHidden && (
        <div className="shrink-0 sticky top-8">
          <button
            type="button"
            onClick={togglePanel}
            title={readOnly ? 'Show the agenda list' : 'Show the reorder panel'}
            className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/50 shadow-sm cursor-pointer"
          >
            <PanelRightOpen className="w-5 h-5" />
          </button>
        </div>
      )}
      {reorderSequence.length > 0 && !panelHidden && (
        <div className="w-[30%] shrink-0 sticky top-8">
          <div className="bg-sidebar/50 border border-border rounded-lg p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{readOnly ? 'Agenda Sequence' : 'Reorder Sequence'}{reordering && <span className="ml-2 normal-case tracking-normal text-xs text-primary animate-pulse">Saving…</span>}</h3>
              <div className="flex items-center gap-1.5">
              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={undoReorder}
                    disabled={past.length === 0 || reordering}
                    title={past.length ? `Undo the last change (${past.length} step${past.length > 1 ? 's' : ''} available)` : 'Nothing to undo'}
                    className="px-2.5 py-1 rounded-md border border-border bg-background text-xs font-semibold text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {`Undo${past.length ? ` (${past.length})` : ''}`}
                  </button>
                  <button
                    type="button"
                    onClick={redoReorder}
                    disabled={future.length === 0 || reordering}
                    title={future.length ? `Redo (${future.length} step${future.length > 1 ? 's' : ''} available)` : 'Nothing to redo'}
                    className="px-2.5 py-1 rounded-md border border-border bg-background text-xs font-semibold text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {`Redo${future.length ? ` (${future.length})` : ''}`}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={togglePanel}
                title="Hide this panel"
                className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted cursor-pointer"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
              </div>
            </div>

            {/* Scrolls when the list is longer than the window. */}
            <div
              ref={listRef}
              onDragOver={autoScrollWhileDragging}
              className="space-y-4 max-h-[calc(100vh-15rem)] overflow-y-auto pr-1"
            >
              {reorderSequence.map((item) => {
                if (item.type === 'category') {
                  return (
                    <div
                      key={item.key}
                      draggable={!readOnly && !reordering}
                      onDragStart={(e) => handleCategoryDragStart(e, item.key)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleSequenceDropOnBlock(e, item.key)}
                      className="border border-border/80 rounded-lg p-3 bg-background/60 shadow-xs space-y-2 group/category"
                    >
                      {/* Category Header */}
                      <div className="flex items-center gap-2 pb-1 border-b border-border/50 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-4 h-4 text-muted-foreground group-hover/category:text-primary transition-colors shrink-0" />
                        <span className="font-semibold text-[11px] text-primary truncate flex-1" title={item.categoryName}>
                          {item.categoryName}
                        </span>
                      </div>

                      {/* Agendas within this Category Block */}
                      <div className="space-y-1.5">
                        {item.agendas.map((agenda: any) => {
                          const globalIdx = regularAgendas.findIndex((a: any) => a.id === agenda.id);
                          const isAgendaBibidha = !isSuppliView && (agenda.agenda_serial === 0 || (agenda.content && agenda.content.replace(/<[^>]*>/g, '').trim().startsWith('বিবিধ')));
                          return (
                            <div
                              key={agenda.id}
                              draggable={!readOnly && !reordering}
                              onDragStart={(e) => handleAgendaDragStart(e, agenda.id)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleAgendaDrop(e, agenda.id)}
                              onDoubleClick={() => jumpToAgenda(agenda.id)}
                              title="Double-click to go to this agenda"
                              className={`bg-card border border-border p-2 rounded-md flex items-center gap-2 transition-colors group shadow-2xs ${!readOnly ? 'cursor-grab hover:border-primary/50 active:cursor-grabbing' : ''}`}
                            >
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                              <span className="font-semibold text-[11px] shrink-0">
                                {isAgendaBibidha
                                  ? `বিবিধ : ${bibidhaSerial}`
                                  : `প্রস্তাব নং ${(meeting.agenda_prefix || '') + (isSuppliView ? toBanglaDigits(mainAgendaCount + (agenda.agenda_serial || globalIdx + 1), serialWidth) : toBanglaDigits(agenda.agenda_serial || globalIdx + 1, serialWidth))}`}
                              </span>
                              <span className="text-[10px] leading-snug text-muted-foreground line-clamp-2 flex-1 opacity-80" title={plainText(agenda)}>
                                {agendaSnippet(agenda)}
                              </span>
                              {renderMoveControls(agenda)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else {
                  // Standalone uncategorized agenda item
                  const agenda = item.agenda;
                  const globalIdx = regularAgendas.findIndex((a: any) => a.id === agenda.id);
                  const isAgendaBibidha = !isSuppliView && (agenda.agenda_serial === 0 || (agenda.content && agenda.content.replace(/<[^>]*>/g, '').trim().startsWith('বিবিধ')));
                  return (
                    <div
                      key={item.key}
                      draggable={!readOnly && !reordering}
                      onDragStart={(e) => handleAgendaDragStart(e, agenda.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleAgendaDrop(e, agenda.id)}
                      onDoubleClick={() => jumpToAgenda(agenda.id)}
                      title="Double-click to go to this agenda"
                      className={`bg-card border border-border p-2 rounded-lg flex items-center gap-2 transition-colors group shadow-2xs ${!readOnly ? 'cursor-grab hover:border-primary/50 active:cursor-grabbing' : ''}`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      <span className="font-semibold text-[11px] shrink-0 text-foreground">
                        {isAgendaBibidha
                          ? `বিবিধ : ${bibidhaSerial}`
                          : `প্রস্তাব নং ${(meeting.agenda_prefix || '') + (isSuppliView ? toBanglaDigits(mainAgendaCount + (agenda.agenda_serial || globalIdx + 1), serialWidth) : toBanglaDigits(agenda.agenda_serial || globalIdx + 1, serialWidth))}`}
                      </span>
                      <span className="text-[10px] leading-snug text-muted-foreground line-clamp-2 flex-1 opacity-80" title={plainText(agenda)}>
                        {agendaSnippet(agenda)}
                      </span>
                      {renderMoveControls(agenda)}
                    </div>
                  );
                }
              })}

              {!isSuppliView && !isEmergencyMeeting && (
                <div className="bg-muted/40 border border-border/80 p-3 rounded-md flex items-center gap-3 opacity-70 select-none cursor-not-allowed">
                  <span className="font-semibold text-xs text-muted-foreground">
                    বিবিধ : {bibidhaSerial}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-6 text-center italic">
              {readOnly ? 'Double-click an agenda to go to it.' : 'Drag to reorder (the list scrolls while you drag near its edge), or use the ↑ ↓ and ⇄ buttons to move or swap. Categories stay together. Double-click an agenda to go to it.'}
            </p>
          </div>
        </div>
      )}

      {moveDialogId && (() => {
        const source = regularAgendas.find((a: any) => a.id === moveDialogId);
        if (!source) return null;
        const choices = regularAgendas.filter((a: any) => a.id !== moveDialogId && !isBibidhaAgenda(a));
        const act = async (how: 'above' | 'below' | 'swap') => {
          const id = moveDialogId;
          const target = moveTargetId;
          setMoveDialogId(null);
          await moveAgenda(id, how, target);
        };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setMoveDialogId(null)}>
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div>
                <h3 className="font-semibold text-base">Change position</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">{agendaSerialLabel(source)}</span> — choose another agenda:
                </p>
              </div>
              <select
                value={moveTargetId}
                onChange={(e) => setMoveTargetId(e.target.value)}
                className="w-full bg-input/20 border border-input rounded px-2 py-2 text-sm"
              >
                <option value="">Select an agenda…</option>
                {choices.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {agendaSerialLabel(a)} — {plainText(a).substring(0, 40)}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" disabled={!moveTargetId} onClick={() => act('above')}
                  className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  Place above
                </button>
                <button type="button" disabled={!moveTargetId} onClick={() => act('below')}
                  className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  Place below
                </button>
                <button type="button" disabled={!moveTargetId} onClick={() => act('swap')}
                  className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  Swap
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Agendas of different categories can't be mixed, and a category's agendas stay together.</p>
              <div className="flex justify-end">
                <button type="button" onClick={() => setMoveDialogId(null)} className="px-3 py-1.5 rounded-md border border-border text-sm cursor-pointer">Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

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

      <ArchivedAgendasModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        currentMeetingId={meeting.id}
        isSuppli={isSuppliView}
        onRestored={() => mutate()}
      />
    </div>
  );
}
