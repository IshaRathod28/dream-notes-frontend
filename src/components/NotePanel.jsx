import { useState, useEffect, useRef } from "react";
import {
  getNotes, createNote, updateNote, deleteNote, moveNote,
  bulkDeleteNotes, bulkMoveNotes, uploadImages, deleteImage,
  saveImageLayout, reorderNotes
} from "../services/noteService";
import { getNotebooks } from "../services/notebookService";
import { getNoteGroups, createNoteGroup, updateNoteGroup, deleteNoteGroup } from "../services/noteGroupService";
import { addNoteReference, removeNoteReference, getSearchableNotes } from "../services/noteReferenceService";
import RichTextEditor from "./RichTextEditor";

const toEditorContent = (content) => {
  if (!content) return "";
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return content
    .split("\n")
    .map((line) =>
      `<p>${line.trim() === "" ? "<br>" : line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
    )
    .join("");
};

const htmlToText = (html) => {
  if (!html) return "";
  if (!html.includes("<")) return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

function NotePanel({ notebook, resetSignal, pendingOpenNoteId, onNavigateToNote, onPendingNoteOpened }) {
  // ── Notes ──
  const [notes, setNotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("both");
  const [allNotebooks, setAllNotebooks] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showMoveOptions, setShowMoveOptions] = useState(false);
  const [showPlaceAfter, setShowPlaceAfter] = useState(false);
  const [placeAfterSearch, setPlaceAfterSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [sortMode, setSortMode] = useState("newest");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [imageMeta, setImageMeta] = useState({});
  const [imageOrders, setImageOrders] = useState({});
  const [createBlocks, setCreateBlocks] = useState([]);
  const [editBlocks, setEditBlocks] = useState([]);
  const [createEditorContent, setCreateEditorContent] = useState("");
  const [editEditorContent, setEditEditorContent] = useState("");

  // ── Note navigation history ──
  const [noteHistory, setNoteHistory] = useState([]);

  // ── Note Groups ──
  const [noteGroups, setNoteGroups] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [openGroupMenuId, setOpenGroupMenuId] = useState(null);
  const [showMoveToGroup, setShowMoveToGroup] = useState(false);
  const [createInGroupId, setCreateInGroupId] = useState(null);

  // ── Note References ──
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [refPickerFor, setRefPickerFor] = useState(null); // 'create' | 'edit'
  const [refSearch, setRefSearch] = useState("");
  const [searchableNotes, setSearchableNotes] = useState([]);
  const [createRefs, setCreateRefs] = useState([]);
  const [editRefs, setEditRefs] = useState([]);
  const [expandedRefNotebooks, setExpandedRefNotebooks] = useState(new Set());
  const [expandedRefGroups, setExpandedRefGroups] = useState(new Set());

  // ── Refs ──
  const panelRef = useRef(null);
  const menuRef = useRef(null);
  const noteDetailRef = useRef(null);
  const editFileInputRef = useRef(null);
  const createFileInputRef = useRef(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const dragNoteItem = useRef(null);
  const dragNoteOverItem = useRef(null);
  const wasFullscreenRef = useRef(false);

  // ── Effects ──
  useEffect(() => {
    if (!viewingNote?.image_layout) return;
    const { meta = {}, order } = viewingNote.image_layout;
    setImageMeta((prev) => ({ ...prev, ...meta }));
    if (order) setImageOrders((prev) => ({ ...prev, [viewingNote.id]: order }));
  }, [viewingNote?.id]);

  useEffect(() => {
    if (!editingNote?.image_layout) return;
    const { meta = {}, order } = editingNote.image_layout;
    setImageMeta((prev) => ({ ...prev, ...meta }));
    if (order) setImageOrders((prev) => ({ ...prev, [editingNote.id]: order }));
  }, [editingNote?.id]);

  useEffect(() => {
    if (!pendingOpenNoteId || notes.length === 0) return;
    const target = notes.find((n) => Number(n.id) === Number(pendingOpenNoteId));
    if (target) {
      setNoteHistory([]);
      setViewingNote(target);
      setShowForm(false);
      setEditingNote(null);
      onPendingNoteOpened?.();
    }
  }, [pendingOpenNoteId, notes]);

  useEffect(() => {
    if (!resetSignal) return;
    setViewingNote(null);
    setEditingNote(null);
    setEditBlocks([]);
    setEditEditorContent("");
    setShowForm(false);
    setCreateRefs([]);
    setEditRefs([]);
    setCreateInGroupId(null);
    setNoteHistory([]);
  }, [resetSignal]);

  useEffect(() => {
    fetchNotes();
    fetchNoteGroups();
    setEditingNote(null);
    setEditBlocks([]);
    setShowForm(false);
    setTitle("");
    setCreateBlocks([]);
    setCreateEditorContent("");
    setEditEditorContent("");
    setSearch("");
    setSearchField("both");
    setOpenMenuId(null);
    setSelectionMode(false);
    setSelectedIds([]);
    setShowBulkMove(false);
    setFullscreen(false);
    setViewingNote(null);
    setSortMode("newest");
    setNoteGroups([]);
    setCollapsedGroups(new Set());
    setShowGroupForm(false);
    setNewGroupName("");
    setEditingGroupId(null);
    setOpenGroupMenuId(null);
    setCreateRefs([]);
    setEditRefs([]);
    setCreateInGroupId(null);
    setNoteHistory([]);
  }, [notebook.id]);

  useEffect(() => {
    getNotebooks().then(setAllNotebooks).catch(() => {});
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
        setOpenGroupMenuId(null);
        setShowBulkMove(false);
      }
    };
    if (openMenuId || openGroupMenuId) document.addEventListener("mousedown", handleClickOutside);
    else {
      setShowMoveOptions(false);
      setShowPlaceAfter(false);
      setPlaceAfterSearch("");
      setShowMoveToGroup(false);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId, openGroupMenuId]);

  // ── Computed ──
  const filteredNotes = notes.filter((n) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const contentText = htmlToText(n.content || "");
    if (searchField === "title") return n.title.toLowerCase().includes(q);
    if (searchField === "content") return contentText.toLowerCase().includes(q);
    return n.title.toLowerCase().includes(q) || contentText.toLowerCase().includes(q);
  });

  const displayedNotes = (() => {
    if (sortMode === "newest") return [...filteredNotes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortMode === "oldest") return [...filteredNotes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return filteredNotes;
  })();

  const otherNotebooks = allNotebooks.filter((nb) => nb.id !== notebook.id);
  const allSelected = filteredNotes.length > 0 && selectedIds.length === filteredNotes.length;
  const inDetail = !showForm && (viewingNote || editingNote);

  // ── Helpers ──
  const genId = () => Math.random().toString(36).slice(2, 9);

  const blocksFromNote = (note) => {
    const images = note.images || [];
    const layout = note.image_layout;
    if (layout?.blocks?.length) {
      const blocks = layout.blocks.map((b) => {
        if (b.type === "text") return { id: genId(), type: "text", value: b.value || "" };
        const matchedById = images.find((img) => img.id === b.id);
        const matchedByUrl = !matchedById ? images.find((img) => img.url === b.id) : null;
        const resolved = matchedById || matchedByUrl;
        const imageId = resolved?.id || b.id;
        const url = resolved?.url || (b.id?.startsWith("http") ? b.id : "");
        return { id: genId(), type: "image", imageId, url };
      });
      const hasText = blocks.some((b) => b.type === "text" && b.value.trim());
      if (!hasText && note.content?.trim()) {
        const first = blocks.find((b) => b.type === "text");
        if (first) first.value = note.content;
        else blocks.unshift({ id: genId(), type: "text", value: note.content });
      }
      return blocks;
    }
    const blocks = [{ id: genId(), type: "text", value: note.content || "" }];
    images.forEach((img) => blocks.push({ id: genId(), type: "image", imageId: img.id, url: img.url }));
    return blocks;
  };

  const normalizeNote = (note) => {
    if (!note) return note;
    const images = (note.images || []).map((img) =>
      typeof img === "string"
        ? { id: img, url: img, filename: decodeURIComponent(img.split("/").pop().split("?")[0]) }
        : { ...img, filename: decodeURIComponent((img.url || "").split("/").pop().split("?")[0]) }
    );
    return { ...note, images };
  };

  // ── Data fetching ──
  const fetchNotes = async () => {
    try {
      const data = await getNotes(notebook.id);
      setNotes(data.map(normalizeNote));
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    }
  };

  const fetchNoteGroups = async () => {
    try {
      const data = await getNoteGroups(notebook.id);
      setNoteGroups(data);
    } catch (err) {
      console.error("Failed to fetch note groups:", err);
    }
  };

  // ── Fullscreen ──
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) panelRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  // ── Note drag-and-drop ──
  const handleNoteDragStart = (e, noteId) => {
    dragNoteItem.current = noteId;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleNoteDragOver = (e, noteId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragNoteOverItem.current = noteId;
  };

  const handleNoteDrop = async (e) => {
    e.preventDefault();
    if (!dragNoteItem.current || dragNoteItem.current === dragNoteOverItem.current) return;
    const fromIdx = notes.findIndex((n) => n.id === dragNoteItem.current);
    const toIdx = notes.findIndex((n) => n.id === dragNoteOverItem.current);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...notes];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setNotes(reordered);
    dragNoteItem.current = null;
    dragNoteOverItem.current = null;
    try {
      await reorderNotes(notebook.id, reordered.map((n) => n.id));
    } catch (err) {
      console.error("Failed to reorder notes:", err);
      fetchNotes();
    }
  };

  // ── Selection ──
  const toggleSelect = (noteId) => {
    setSelectedIds((prev) => {
      const next = prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = filteredNotes.map((n) => n.id);
    if (selectedIds.length === filteredNotes.length) { setSelectedIds([]); setSelectionMode(false); }
    else setSelectedIds(allIds);
  };

  // ── Bulk actions ──
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} note(s)?`)) return;
    try {
      await bulkDeleteNotes(notebook.id, selectedIds);
      setNotes(notes.filter((n) => !selectedIds.includes(n.id)));
      setSelectedIds([]);
    } catch (error) {
      console.error("Bulk delete failed:", error);
    }
  };

  const handleBulkMove = async (targetNotebookId) => {
    try {
      await bulkMoveNotes(notebook.id, selectedIds, targetNotebookId);
      setNotes(notes.filter((n) => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      setShowBulkMove(false);
    } catch (error) {
      console.error("Bulk move failed:", error);
    }
  };

  // ── Create note ──
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const textContent = createEditorContent;
      let note = normalizeNote(
        await createNote(notebook.id, { title: title.trim(), content: textContent, note_group_id: createInGroupId || null })
      );
      const imageBlocks = createBlocks.filter((b) => b.type === "image" && b.file);
      if (imageBlocks.length > 0) {
        note = normalizeNote(await uploadImages(notebook.id, note.id, imageBlocks.map((b) => b.file)));
        const blockLayout = [
          { type: "text", value: textContent },
          ...note.images.map((img) => ({ type: "image", id: img.id })),
        ];
        note = normalizeNote(await saveImageLayout(notebook.id, note.id, {
          meta: {}, order: note.images.map((img) => img.id), blocks: blockLayout,
        }));
      }
      for (const ref of createRefs) {
        try { await addNoteReference(notebook.id, note.id, ref.id); } catch {}
      }
      note = { ...note, referenced_notes: createRefs };
      setNotes(sortMode === "custom" ? [...notes, note] : [note, ...notes]);
      setTitle("");
      setCreateEditorContent("");
      setCreateBlocks([]);
      setCreateRefs([]);
      setCreateInGroupId(null);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  // ── Edit note ──
  const handleEditSave = async () => {
    if (!editingNote.title.trim()) return;
    try {
      const textContent = editEditorContent;
      let updated = normalizeNote(await updateNote(notebook.id, editingNote.id, {
        title: editingNote.title,
        content: textContent,
      }));
      const imageBlocks = editBlocks.filter((b) => b.type === "image" && b.imageId);
      const blockLayout = [
        { type: "text", value: textContent },
        ...imageBlocks.map((b) => ({ type: "image", id: b.imageId })),
      ];
      const imageIds = imageBlocks.map((b) => b.imageId);
      const noteMeta = {};
      imageIds.forEach((id) => { if (imageMeta[id]) noteMeta[id] = imageMeta[id]; });
      updated = normalizeNote(await saveImageLayout(notebook.id, editingNote.id, {
        meta: noteMeta, order: imageIds, blocks: blockLayout,
      }));

      const prevRefIds = new Set((editingNote.referenced_notes || []).map((r) => r.id));
      const newRefIds = new Set(editRefs.map((r) => r.id));
      for (const ref of editRefs) {
        if (!prevRefIds.has(ref.id)) {
          try { await addNoteReference(notebook.id, editingNote.id, ref.id); } catch {}
        }
      }
      for (const prevRef of (editingNote.referenced_notes || [])) {
        if (!newRefIds.has(prevRef.id)) {
          try { await removeNoteReference(notebook.id, editingNote.id, prevRef.id); } catch {}
        }
      }
      updated = { ...updated, referenced_notes: editRefs };
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setEditingNote(null);
      setEditBlocks([]);
      setEditEditorContent("");
      setEditRefs([]);
      setViewingNote(updated);
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  // ── Move / Delete note ──
  const handleMove = async (noteId, targetNotebookId) => {
    try {
      await moveNote(notebook.id, noteId, targetNotebookId);
      setNotes(notes.filter((n) => n.id !== noteId));
      setOpenMenuId(null);
    } catch (error) {
      console.error("Failed to move note:", error);
    }
  };

  const handlePlaceAfter = async (noteId, afterId) => {
    const reordered = [...notes];
    const fromIdx = reordered.findIndex((n) => n.id === noteId);
    const [moved] = reordered.splice(fromIdx, 1);
    const insertAt = afterId === null ? 0 : reordered.findIndex((n) => n.id === afterId) + 1;
    reordered.splice(insertAt, 0, moved);
    setNotes(reordered);
    setSortMode("custom");
    setOpenMenuId(null);
    setShowPlaceAfter(false);
    try {
      await reorderNotes(notebook.id, reordered.map((n) => n.id));
    } catch (err) {
      console.error("Failed to place note:", err);
      fetchNotes();
    }
  };

  const handleDelete = async (noteId) => {
    setOpenMenuId(null);
    if (!window.confirm("Delete this note?")) return;
    try {
      await deleteNote(notebook.id, noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
      if (editingNote?.id === noteId) setEditingNote(null);
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  // ── Image handlers ──
  const saveLayout = async (noteId, images, overrideMeta, overrideOrder) => {
    const meta = overrideMeta ?? imageMeta;
    const order = overrideOrder ?? (imageOrders[noteId] || images.map((i) => i.id));
    const noteMeta = {};
    images.forEach((img) => { if (meta[img.id]) noteMeta[img.id] = meta[img.id]; });
    try {
      const updated = normalizeNote(await saveImageLayout(notebook.id, noteId, { meta: noteMeta, order }));
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      if (viewingNote?.id === updated.id) setViewingNote(updated);
      if (editingNote?.id === updated.id) setEditingNote(updated);
    } catch (err) {
      console.error("Failed to save image layout:", err);
    }
  };

  const startResize = (e, imageId, noteId, images) => {
    e.preventDefault();
    e.stopPropagation();
    const container = e.currentTarget.parentElement;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = container.offsetWidth;
    const startHeight = container.querySelector("img")?.offsetHeight || container.offsetHeight;
    const maxWidth = container.parentElement?.offsetWidth || 600;
    let latestMeta = imageMeta;
    const onMove = (me) => {
      const newWidth = Math.min(maxWidth, Math.max(80, startWidth + (me.clientX - startX)));
      const newHeight = Math.max(60, startHeight + (me.clientY - startY));
      latestMeta = { ...latestMeta, [imageId]: { width: newWidth, height: newHeight } };
      setImageMeta(latestMeta);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      saveLayout(noteId, images, latestMeta, null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleDragStart = (e, imageId) => { dragItem.current = imageId; e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e, imageId) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; dragOverItem.current = imageId; };

  const handleDrop = (e, noteId, images) => {
    e.preventDefault();
    if (!dragItem.current || dragItem.current === dragOverItem.current) return;
    const currentOrder = imageOrders[noteId] || images.map((i) => i.id);
    const from = currentOrder.indexOf(dragItem.current);
    const to = currentOrder.indexOf(dragOverItem.current);
    if (from === -1 || to === -1) return;
    const newOrder = [...currentOrder];
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragItem.current);
    setImageOrders((prev) => ({ ...prev, [noteId]: newOrder }));
    dragItem.current = null;
    dragOverItem.current = null;
    saveLayout(noteId, images, null, newOrder);
  };

  const handleImageDelete = async (imageId, noteId) => {
    try {
      const updated = normalizeNote(await deleteImage(notebook.id, noteId, imageId));
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      if (viewingNote?.id === updated.id) setViewingNote(updated);
      if (editingNote?.id === updated.id) {
        setEditingNote(updated);
        setEditBlocks((prev) => prev.filter((b) => b.imageId !== imageId));
      }
    } catch (err) {
      console.error("Image delete failed:", err);
    }
  };

  const handleImageUpload = async (files, noteId) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    try {
      const prevIds = new Set((editingNote?.id === noteId ? editingNote.images : []).map((img) => img.id));
      const updated = normalizeNote(await uploadImages(notebook.id, noteId, imageFiles));
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      if (viewingNote?.id === updated.id) setViewingNote(updated);
      if (editingNote?.id === updated.id) {
        setEditingNote(updated);
        const newImgs = (updated.images || []).filter((img) => !prevIds.has(img.id));
        setEditBlocks((prev) => [
          ...prev,
          ...newImgs.map((img) => ({ id: genId(), type: "image", imageId: img.id, url: img.url })),
        ]);
      }
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };

  const handlePaste = (e, noteId) => {
    const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length) handleImageUpload(files, noteId);
  };

  // ── Note Group handlers ──
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const group = await createNoteGroup(notebook.id, newGroupName.trim());
      setNoteGroups([...noteGroups, group]);
      setNewGroupName("");
      setShowGroupForm(false);
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  const handleRenameGroup = async (groupId) => {
    if (!editingGroupName.trim()) return;
    try {
      const updated = await updateNoteGroup(notebook.id, groupId, editingGroupName.trim());
      setNoteGroups(noteGroups.map((g) => (g.id === groupId ? updated : g)));
      setEditingGroupId(null);
    } catch (err) {
      console.error("Failed to rename group:", err);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Delete this group? Notes will become ungrouped.")) return;
    try {
      await deleteNoteGroup(notebook.id, groupId);
      setNoteGroups(noteGroups.filter((g) => g.id !== groupId));
      setNotes(notes.map((n) => (n.note_group_id === groupId ? { ...n, note_group_id: null } : n)));
      setOpenGroupMenuId(null);
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  const handleMoveNoteToGroup = async (noteId, groupId) => {
    try {
      await updateNote(notebook.id, noteId, { note_group_id: groupId });
      setNotes(notes.map((n) => (n.id === noteId ? { ...n, note_group_id: groupId } : n)));
      setOpenMenuId(null);
    } catch (err) {
      console.error("Failed to move note to group:", err);
    }
  };

  const handleRemoveFromGroup = async (noteId) => {
    try {
      await updateNote(notebook.id, noteId, { note_group_id: null });
      setNotes(notes.map((n) => (n.id === noteId ? { ...n, note_group_id: null } : n)));
      setOpenMenuId(null);
    } catch (err) {
      console.error("Failed to remove note from group:", err);
    }
  };

  const toggleCollapseGroup = (groupId) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  // ── Reference handlers ──
  const openRefPicker = async (forForm) => {
    setRefPickerFor(forForm);
    setRefSearch("");
    setShowRefPicker(true);
    try {
      const data = await getSearchableNotes(notebook.id);
      setSearchableNotes(data);
      setExpandedRefNotebooks(new Set([notebook.id]));
      setExpandedRefGroups(new Set());
    } catch (err) {
      console.error("Failed to load notes for picker:", err);
    }
  };

  const handleAddRef = (refNote) => {
    const entry = { id: refNote.id, title: refNote.title, notebook_id: refNote.notebook_id };
    if (refPickerFor === "create") {
      if (!createRefs.find((r) => r.id === refNote.id)) setCreateRefs([...createRefs, entry]);
    } else {
      if (!editRefs.find((r) => r.id === refNote.id)) setEditRefs([...editRefs, entry]);
    }
    setShowRefPicker(false);
  };

  const currentRefsForPicker = refPickerFor === "create" ? createRefs : editRefs;
  const currentEditingId = refPickerFor === "edit" ? editingNote?.id : null;

  // ── PDF export ──
  const cleanForPDF = (str) =>
    htmlToText(str)
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .replace(/→|➜|➡/g, "->").replace(/←/g, "<-")
      .replace(/[""]/g, '"').replace(/['']/g, "'")
      .replace(/—/g, "--").replace(/–/g, "-").replace(/•/g, "-")
      .replace(/[^\x00-\xFF]/g, "").replace(/[^\S\n]+/g, " ").trim();

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 15;
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;
    const maxWidth = pageW - margin * 2;
    const maxImgHeight = pageH - margin * 2;
    let y = margin;
    const addPageIfNeeded = (h) => { if (y + h > pageH - margin) { doc.addPage(); y = margin; } };
    const fetchImg = async (url) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const base64 = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });
        const dims = await new Promise((resolve) => { const img = new Image(); img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => resolve({ w: 1, h: 1 }); img.src = base64; });
        return { base64, dims };
      } catch { return null; }
    };
    const selectedNotes = notes.filter((n) => selectedIds.includes(n.id));
    for (let i = 0; i < selectedNotes.length; i++) {
      const note = selectedNotes[i];
      if (i !== 0) { addPageIfNeeded(10); y += 1; doc.setDrawColor(220); doc.line(margin, y, pageW - margin, y); y += 6; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      const titleLines = doc.splitTextToSize(cleanForPDF(note.title), maxWidth);
      addPageIfNeeded(titleLines.length * 6.5);
      doc.text(titleLines, margin, y); y += titleLines.length * 6.5 + 3;
      const layout = note.image_layout;
      const images = note.images || [];
      const blocks = layout?.blocks?.length ? layout.blocks : [{ type: "text", value: note.content || "" }, ...images.map((img) => ({ type: "image", id: img.id }))];
      for (const block of blocks) {
        if (block.type === "text" && block.value?.trim()) {
          doc.setFont("helvetica", "normal"); doc.setFontSize(11);
          const lines = doc.splitTextToSize(cleanForPDF(block.value), maxWidth - 2);
          let remaining = [...lines];
          while (remaining.length > 0) {
            const available = pageH - margin - y;
            const linesThisPage = Math.max(1, Math.floor(available / 6));
            const chunk = remaining.splice(0, linesThisPage);
            doc.text(chunk, margin, y); y += chunk.length * 6;
            if (remaining.length > 0) { doc.addPage(); y = margin; }
          }
          y += 1;
        } else if (block.type === "image") {
          const imgObj = images.find((im) => im.id === block.id);
          if (!imgObj?.url) continue;
          const result = await fetchImg(imgObj.url);
          if (!result) continue;
          const { base64, dims } = result;
          let imgWidth = maxWidth;
          let imgHeight = (imgWidth * dims.h) / dims.w;
          if (imgHeight > maxImgHeight) { imgHeight = maxImgHeight; imgWidth = (imgHeight * dims.w) / dims.h; }
          addPageIfNeeded(imgHeight);
          doc.addImage(base64, "JPEG", margin, y, imgWidth, imgHeight); y += imgHeight + 6;
        }
      }
    }
    doc.save((exportFilename.trim() || "notes-export") + ".pdf");
    setShowExportModal(false); setExportFilename("");
  };

  // ── Note card renderer (used in both flat and grouped lists) ──
  const renderNoteCard = (note) => (
    <div
      key={note.id}
      draggable={sortMode === "custom" && !search}
      onDragStart={(e) => handleNoteDragStart(e, note.id)}
      onDragOver={(e) => handleNoteDragOver(e, note.id)}
      onDrop={handleNoteDrop}
      className={`relative border rounded-2xl p-4 transition ${
        sortMode === "custom" && !search ? "cursor-grab active:cursor-grabbing" : ""
      } ${
        selectedIds.includes(note.id)
          ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        {sortMode === "custom" && !search && (
          <div className="mt-1 text-gray-300 dark:text-gray-600 shrink-0 select-none text-base leading-none">⠿</div>
        )}
        {selectionMode && (
          <input
            type="checkbox"
            checked={selectedIds.includes(note.id)}
            onChange={() => toggleSelect(note.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingNote(note)}>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{note.title}</h3>
          {note.content && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{htmlToText(note.content)}</p>
          )}
          {(note.referenced_notes || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(note.referenced_notes || []).map((ref) => (
                <span key={ref.id} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 border border-blue-100 dark:border-blue-800 px-2 py-0.5 rounded-md">
                  🔗 {ref.title}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => { setOpenMenuId(openMenuId === note.id ? null : note.id); setShowMoveOptions(false); setShowPlaceAfter(false); setShowMoveToGroup(false); }}
          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition shrink-0 text-base font-bold leading-none"
        >⋯</button>
      </div>

      {openMenuId === note.id && (
        <div ref={menuRef} className="absolute right-4 top-10 z-20 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1 min-w-[190px]">
          <button
            onClick={() => {
              const imageBlocks = blocksFromNote(note).filter((b) => b.type === "image");
              setEditEditorContent(toEditorContent(note.content));
              setEditBlocks(imageBlocks);
              setEditingNote(note);
              setEditRefs(note.referenced_notes || []);
              setOpenMenuId(null);
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
          >✏️ <span>Edit</span></button>

          <button
            onClick={() => { setSelectionMode(true); toggleSelect(note.id); setOpenMenuId(null); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
          >☑️ <span>Select</span></button>

          {/* Move to Group */}
          {noteGroups.length > 0 && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
              <button
                onClick={() => { setShowMoveToGroup((v) => !v); setShowMoveOptions(false); setShowPlaceAfter(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">📁 Move to Group</span>
                <span className="text-gray-400 text-xs">{showMoveToGroup ? "▲" : "▼"}</span>
              </button>
              {showMoveToGroup && (
                <div className="px-3 pb-2 flex flex-col gap-0.5">
                  {note.note_group_id && (
                    <button
                      onClick={() => handleRemoveFromGroup(note.id)}
                      className="w-full text-left text-xs text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-3 py-2 rounded-lg transition flex items-center gap-2"
                    >✕ Remove from group</button>
                  )}
                  {noteGroups.filter((g) => g.id !== note.note_group_id).map((g) => (
                    <button
                      key={g.id}
                      onClick={() => handleMoveNoteToGroup(note.id, g.id)}
                      className="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-2 rounded-lg transition flex items-center gap-2"
                    >📁 <span className="truncate">{g.name}</span></button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Move to Notebook */}
          {otherNotebooks.length > 0 && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
              <button
                onClick={() => { setShowMoveOptions((v) => !v); setShowMoveToGroup(false); setShowPlaceAfter(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">📂 Move to Notebook</span>
                <span className="text-gray-400 text-xs">{showMoveOptions ? "▲" : "▼"}</span>
              </button>
              {showMoveOptions && (
                <div className="px-3 pb-2 flex flex-col gap-0.5">
                  {otherNotebooks.map((nb) => (
                    <button key={nb.id} onClick={() => handleMove(note.id, nb.id)}
                      className="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-2 rounded-lg transition flex items-center gap-2"
                    >📓 <span className="truncate">{nb.name}</span></button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Place After */}
          {sortMode === "custom" && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
              <button
                onClick={() => { setShowPlaceAfter((v) => !v); setShowMoveOptions(false); setShowMoveToGroup(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">📌 Place After</span>
                <span className="text-gray-400 text-xs">{showPlaceAfter ? "▲" : "▼"}</span>
              </button>
              {showPlaceAfter && (
                <div className="px-3 pb-2 flex flex-col gap-0.5">
                  <input autoFocus type="text" placeholder="Search notes..." value={placeAfterSearch} onChange={(e) => setPlaceAfterSearch(e.target.value)} onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 mb-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                    <button onClick={() => handlePlaceAfter(note.id, null)}
                      className="w-full text-left text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-2 rounded-lg transition flex items-center gap-2 font-medium shrink-0"
                    >⬆ Place at top</button>
                    {notes.filter((n) => n.id !== note.id && n.title.toLowerCase().includes(placeAfterSearch.toLowerCase())).map((n) => (
                      <button key={n.id} onClick={() => handlePlaceAfter(note.id, n.id)}
                        className="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-2 rounded-lg transition"
                      ><span className="truncate block">After: {n.title}</span></button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
          <button onClick={() => handleDelete(note.id)}
            className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
          >🗑️ <span>Delete</span></button>
        </div>
      )}
    </div>
  );

  // ── Group header renderer ──
  const renderGroupHeader = (group) => {
    const isCollapsed = collapsedGroups.has(group.id);
    const groupNoteCount = notes.filter((n) => n.note_group_id === group.id).length;
    return (
      <div key={`gh-${group.id}`} className="flex items-center gap-2 px-1 mb-2 mt-1 group/gh">
        <button onClick={() => toggleCollapseGroup(group.id)} className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-gray-400 dark:text-gray-500 w-3">{isCollapsed ? "▶" : "▼"}</span>
          {editingGroupId === group.id ? (
            <form onSubmit={(e) => { e.preventDefault(); handleRenameGroup(group.id); }} className="flex-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={editingGroupName}
                onChange={(e) => setEditingGroupName(e.target.value)}
                onBlur={() => handleRenameGroup(group.id)}
                onKeyDown={(e) => { if (e.key === "Escape") setEditingGroupId(null); }}
                className="flex-1 text-sm font-semibold bg-transparent border-b border-blue-400 dark:border-blue-500 focus:outline-none text-gray-700 dark:text-gray-200"
              />
            </form>
          ) : (
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">📁 {group.name}</span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1 shrink-0">{groupNoteCount}</span>
        </button>

        <button
          onClick={() => { setCreateInGroupId(group.id); setShowForm(true); setViewingNote(null); setEditingNote(null); }}
          className="opacity-0 group-hover/gh:opacity-100 text-xs text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded-lg transition shrink-0"
          title="Add note to this group"
        >+ Note</button>

        <div className="relative shrink-0">
          <button
            onClick={() => setOpenGroupMenuId(openGroupMenuId === group.id ? null : group.id)}
            className="opacity-0 group-hover/gh:opacity-100 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-sm font-bold"
          >⋯</button>
          {openGroupMenuId === group.id && (
            <div ref={menuRef} className="absolute right-0 top-7 z-20 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1 min-w-[150px]">
              <button
                onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); setOpenGroupMenuId(null); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >✏️ Rename</button>
              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
              >🗑️ Delete Group</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Reference chips renderer ──
  const renderRefChips = (refs, onRemove) => {
    if (!refs.length) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {refs.map((ref) => (
          <span key={ref.id} className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 px-2.5 py-1 rounded-lg">
            🔗 {ref.title}
            <button onClick={() => onRemove(ref.id)} className="ml-1 text-blue-400 hover:text-red-500 transition">✕</button>
          </span>
        ))}
      </div>
    );
  };

  // ─────────────────────────────────── JSX ────────────────────────────────────
  return (
    <div ref={panelRef} className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-950">

      {/* ── Sticky top ── */}
      <div className="shrink-0 px-4 pt-4 pb-2 sm:px-8 sm:pt-8 bg-white dark:bg-gray-950">

        {/* Notebook header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <span className="text-2xl">📓</span>
          <h2
            className={`text-xl font-bold text-gray-800 dark:text-gray-100 truncate ${inDetail ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors" : ""}`}
            onClick={() => { if (inDetail) { setViewingNote(null); setEditingNote(null); setNoteHistory([]); } }}
            title={inDetail ? "Back to notes list" : undefined}
          >{notebook.name}</h2>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-400 dark:text-gray-500">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
            <button onClick={toggleFullscreen}
              className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2.5 py-1.5 font-medium transition rounded-xl"
              title={fullscreen ? "Exit Fullscreen" : "Expand"}
            >{fullscreen ? <><span>✕</span> Exit Fullscreen</> : <><span>⛶</span> Expand</>}</button>
          </div>
        </div>

        {/* Toolbar */}
        {!showForm && !inDetail && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button
              onClick={() => { setViewingNote(null); setEditingNote(null); setCreateInGroupId(null); setShowForm(true); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors duration-150 shadow-sm shrink-0"
            ><span className="text-lg leading-none">+</span><span className="hidden sm:inline">Create Note</span><span className="sm:hidden">Note</span></button>

            <button
              onClick={() => setShowGroupForm((v) => !v)}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition shrink-0 border ${showGroupForm ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-400"}`}
              title="Create Note Group"
            ><span>📁</span><span className="hidden sm:inline">Group</span></button>

            <div className="flex flex-1 min-w-[160px] items-center border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 transition">
              <select value={searchField} onChange={(e) => setSearchField(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-300 px-2 sm:px-3 py-2.5 focus:outline-none cursor-pointer"
              ><option value="both">Both</option><option value="title">Title</option><option value="content">Content</option></select>
              <input type="text" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none min-w-0" />
              {search && (
                <button onClick={() => setSearch("")} className="px-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm">✕</button>
              )}
            </div>

            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}
              className="text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-xl px-2 sm:px-3 py-2.5 focus:outline-none cursor-pointer shrink-0"
            ><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="custom">Custom Order</option></select>
          </div>
        )}

        {/* Inline group creation */}
        {showGroupForm && !inDetail && !showForm && (
          <form onSubmit={handleCreateGroup} className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl">
            <span className="text-sm">📁</span>
            <input
              autoFocus
              type="text"
              placeholder="Group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            <button type="submit" className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition shrink-0">Create</button>
            <button type="button" onClick={() => { setShowGroupForm(false); setNewGroupName(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1.5 rounded-lg transition shrink-0"
            >Cancel</button>
          </form>
        )}

        {/* Bulk action bar */}
        {!showForm && !inDetail && selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 px-3 py-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl" ref={menuRef}>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{selectedIds.length} selected</span>
            <div className="flex flex-wrap items-center gap-2 ml-auto relative">
              {otherNotebooks.length > 0 && (
                <div className="relative">
                  <button onClick={() => setShowBulkMove((v) => !v)}
                    className="flex items-center gap-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-1.5 rounded-lg transition"
                  >📂 Move to {showBulkMove ? "▲" : "▼"}</button>
                  {showBulkMove && (
                    <div className="absolute left-0 top-9 z-20 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1 min-w-[160px]">
                      {otherNotebooks.map((nb) => (
                        <button key={nb.id} onClick={() => handleBulkMove(nb.id)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-2"
                        >📓 <span className="truncate">{nb.name}</span></button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => { setExportFilename(""); setShowExportModal(true); }}
                className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition"
              >📄 <span className="hidden sm:inline">Export PDF</span><span className="sm:hidden">PDF</span></button>
              <button onClick={handleBulkDelete}
                className="flex items-center gap-1.5 text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition"
              >🗑️ <span className="hidden sm:inline">Delete</span></button>
              <button onClick={() => { setSelectionMode(false); setSelectedIds([]); setShowBulkMove(false); }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg transition"
              >Cancel</button>
            </div>
          </div>
        )}

        {/* Detail header */}
        {inDetail && (
          <div className="flex items-center shrink-0 mb-0 pb-2 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => {
                if (noteHistory.length > 0) {
                  const prev = noteHistory[noteHistory.length - 1];
                  setNoteHistory((h) => h.slice(0, -1));
                  setViewingNote(prev);
                  setEditingNote(null);
                } else {
                  setViewingNote(null);
                  setEditingNote(null);
                }
              }}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition"
            >
              ← {noteHistory.length > 0 ? noteHistory[noteHistory.length - 1].title : "Back"}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => { setViewingNote(null); setEditingNote(null); setCreateInGroupId(null); setShowForm(true); }}
                className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg transition"
              >+ Create Another Note</button>
              {viewingNote && !editingNote && (
                <button
                  onClick={() => {
                    const imageBlocks = blocksFromNote(viewingNote).filter((b) => b.type === "image");
                    setEditEditorContent(toEditorContent(viewingNote.content));
                    setEditBlocks(imageBlocks);
                    setEditingNote(viewingNote);
                    setEditRefs(viewingNote.referenced_notes || []);
                    setViewingNote(null);
                  }}
                  className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition"
                >✏️ Edit</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className={`flex-1 px-4 pb-4 sm:px-8 sm:pb-8 ${fullscreen && showForm ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate}
            className={`flex flex-col border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 ${fullscreen ? "h-full" : ""}`}
          >
            <div className="mb-3 shrink-0">
              <p className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                <span className="text-sm">✍️</span>
                {createInGroupId ? `New Note in "${noteGroups.find((g) => g.id === createInGroupId)?.name}"` : "New Note"}
              </p>
            </div>
            <div className={`flex flex-col gap-3 ${fullscreen ? "flex-1 min-h-0" : ""}`}>
              <input autoFocus type="text" placeholder="Note title..." value={title} onChange={(e) => setTitle(e.target.value)}
                className={`w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl px-4 py-2.5 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition shrink-0 ${fullscreen ? "text-lg text-gray-800 dark:text-gray-100" : "text-sm text-gray-700 dark:text-gray-200"}`}
              />
              <div className={fullscreen ? "flex-1 min-h-0 flex flex-col" : ""}>
                <RichTextEditor content={createEditorContent} onChange={setCreateEditorContent} minHeight={fullscreen ? "300px" : "120px"} />
              </div>

              {/* Image previews */}
              {createBlocks.filter((b) => b.type === "image").length > 0 && (
                <div className="flex flex-wrap gap-3 px-1">
                  {createBlocks.filter((b) => b.type === "image").map((block) => (
                    <div key={block.id} className="relative group flex-shrink-0" style={{ width: "calc(50% - 6px)" }}>
                      <img src={block.localUrl} alt="preview" draggable={false} className="rounded-xl w-full h-auto border border-gray-100 dark:border-gray-800" />
                      <button type="button" onClick={() => setCreateBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-lg w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Reference chips */}
              {createRefs.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">References:</p>
                  {renderRefChips(createRefs, (id) => setCreateRefs(createRefs.filter((r) => r.id !== id)))}
                </div>
              )}

              <div className="flex gap-2 mt-1 justify-end shrink-0 flex-wrap">
                <button type="button" onClick={() => { wasFullscreenRef.current = !!document.fullscreenElement; createFileInputRef.current?.click(); }}
                  className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-lg transition mr-auto"
                >📎 Image</button>
                <input ref={createFileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => {
                    if (wasFullscreenRef.current) panelRef.current?.requestFullscreen();
                    Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/")).forEach((file) => {
                      setCreateBlocks((prev) => [...prev, { id: genId(), type: "image", file, localUrl: URL.createObjectURL(file) }]);
                    });
                    e.target.value = "";
                  }}
                />
                <button type="button" onClick={() => openRefPicker("create")}
                  className="text-sm text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 px-3 py-1.5 rounded-lg transition"
                >🔗 Reference</button>
                <button type="button" onClick={() => { setShowForm(false); setTitle(""); setCreateEditorContent(""); setCreateBlocks([]); setCreateRefs([]); setCreateInGroupId(null); }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg transition"
                >Cancel</button>
                <button type="submit" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition">Add Note</button>
              </div>
            </div>
          </form>
        )}

        {/* Note detail (view + edit) */}
        {inDetail && (
          <div
            ref={noteDetailRef}
            onPaste={(e) => handlePaste(e, (editingNote || viewingNote).id)}
            className={fullscreen
              ? "flex flex-col h-full bg-white dark:bg-gray-950 p-8"
              : "border border-blue-300 dark:border-blue-700 rounded-2xl px-4 pb-4 pt-2 bg-blue-50 dark:bg-blue-900/20"
            }
          >
            {/* VIEW MODE */}
            {viewingNote && !editingNote && (() => {
              const layout = viewingNote.image_layout;
              const images = viewingNote.images || [];
              const blocks = layout?.blocks?.length
                ? layout.blocks
                : [{ type: "text", value: viewingNote.content || "" }, ...images.map((img) => ({ type: "image", id: img.id }))];
              return (
                <>
                  <div className="shrink-0 mb-2">
                    <p className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide"><span className="text-sm">📄</span> Note</p>
                  </div>
                  <p className={`w-full border-b border-blue-300 dark:border-blue-600 pb-1 mb-3 ${fullscreen ? "text-lg font-bold text-gray-800 dark:text-gray-100" : "font-semibold text-gray-800 dark:text-gray-100 text-sm"}`}>
                    {viewingNote.title}
                  </p>
                  {blocks.map((block, idx) => {
                    if (block.type === "text") {
                      if (!block.value?.trim()) return null;
                      return (
                        <div key={`t-${idx}`}
                          className={`rich-view mb-1 ${fullscreen ? "text-base text-gray-700 dark:text-gray-300" : "text-sm text-gray-600 dark:text-gray-300"}`}
                          dangerouslySetInnerHTML={{ __html: toEditorContent(block.value) }}
                        />
                      );
                    }
                    const img = images.find((i) => i.id === block.id);
                    if (!img?.url) return null;
                    return (
                      <div key={img.id} className="flex flex-wrap gap-3 mt-2 mb-2">
                        <div className="relative group flex-shrink-0"
                          style={{ width: imageMeta[img.id]?.width ? `${imageMeta[img.id].width}px` : "calc(50% - 6px)" }}
                          draggable onDragStart={(e) => handleDragStart(e, img.id)}
                          onDragOver={(e) => handleDragOver(e, img.id)}
                          onDrop={(e) => handleDrop(e, viewingNote.id, viewingNote.images)}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <img src={img.url} alt={img.filename} draggable={false}
                            style={imageMeta[img.id]?.height ? { height: `${imageMeta[img.id].height}px` } : {}}
                            className={`rounded-xl w-full border border-gray-100 dark:border-gray-800 ${imageMeta[img.id]?.height ? "object-cover" : "h-auto"}`}
                          />
                          <button onClick={() => handleImageDelete(img.id, viewingNote.id)}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-lg w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                          >✕</button>
                          <div onMouseDown={(e) => startResize(e, img.id, viewingNote.id, viewingNote.images)}
                            className="absolute bottom-2 right-2 w-5 h-5 flex items-center justify-center cursor-se-resize opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-gray-800/90 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs select-none"
                          >⤡</div>
                        </div>
                      </div>
                    );
                  })}

                  {/* References section in view mode */}
                  {(viewingNote.referenced_notes || []).length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">🔗 References</p>
                      <div className="flex flex-col gap-2">
                        {(viewingNote.referenced_notes || []).map((ref) => {
                          const sameNotebook = Number(ref.notebook_id) === Number(notebook.id);
                          const target = sameNotebook ? notes.find((n) => Number(n.id) === Number(ref.id)) : null;
                          const targetNotebook = !sameNotebook ? allNotebooks.find((nb) => Number(nb.id) === Number(ref.notebook_id)) : null;
                          const canOpen = sameNotebook ? !!target : !!targetNotebook;
                          return (
                            <button
                              key={ref.id}
                              onClick={() => {
                                if (sameNotebook && target) {
                                  setNoteHistory((h) => [...h, viewingNote]);
                                  setViewingNote(target);
                                } else if (!sameNotebook && targetNotebook && onNavigateToNote) {
                                  onNavigateToNote(targetNotebook, ref.id);
                                }
                              }}
                              disabled={!canOpen}
                              className={`group flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border transition-all ${
                                canOpen
                                  ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md cursor-pointer"
                                  : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 cursor-not-allowed opacity-60"
                              }`}
                            >
                              <span className="text-blue-500 dark:text-blue-400 text-base shrink-0">🔗</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{ref.title}</p>
                                {!sameNotebook && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                                    📓 {targetNotebook?.name ?? "Another notebook"}
                                  </p>
                                )}
                              </div>
                              {canOpen && (
                                <span className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition text-base shrink-0">→</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* EDIT MODE */}
            {editingNote && (
              <>
                <div className="shrink-0 mb-2">
                  <p className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide"><span className="text-sm">✍️</span> Edit Note</p>
                </div>
                <input autoFocus value={editingNote.title} onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  className={`w-full bg-transparent border-b border-blue-300 dark:border-blue-600 pb-1 mb-3 focus:outline-none ${fullscreen ? "text-lg font-bold text-gray-800 dark:text-gray-100" : "font-semibold text-gray-800 dark:text-gray-100 text-sm"}`}
                />
                <div className={fullscreen ? "flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto" : "flex flex-col gap-3"}>
                  <RichTextEditor content={editEditorContent} onChange={setEditEditorContent} minHeight={fullscreen ? "300px" : "120px"} />
                  {editBlocks.filter((b) => b.type === "image" && b.url).length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {editBlocks.filter((b) => b.type === "image" && b.url).map((block) => (
                        <div key={block.id} className="relative group flex-shrink-0"
                          style={{ width: imageMeta[block.imageId]?.width ? `${imageMeta[block.imageId].width}px` : "calc(50% - 6px)" }}
                        >
                          <img src={block.url} alt="" draggable={false} className="rounded-xl w-full h-auto border border-gray-100 dark:border-gray-800" />
                          <button type="button" onClick={() => handleImageDelete(block.imageId, editingNote.id)}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-lg w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                          >✕</button>
                          <div onMouseDown={(e) => startResize(e, block.imageId, editingNote.id, editingNote.images)}
                            className="absolute bottom-2 right-2 w-5 h-5 flex items-center justify-center cursor-se-resize opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-gray-800/90 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs select-none"
                          >⤡</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* References in edit mode */}
                  {editRefs.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">References:</p>
                      {renderRefChips(editRefs, (id) => setEditRefs(editRefs.filter((r) => r.id !== id)))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3 justify-end shrink-0 flex-wrap">
                  <button type="button" onClick={() => { wasFullscreenRef.current = !!document.fullscreenElement; editFileInputRef.current?.click(); }}
                    className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-lg transition mr-auto"
                  >📎 Image</button>
                  <input ref={editFileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { if (wasFullscreenRef.current) panelRef.current?.requestFullscreen(); handleImageUpload(e.target.files, editingNote.id); e.target.value = ""; }}
                  />
                  <button type="button" onClick={() => openRefPicker("edit")}
                    className="text-sm text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 px-3 py-1.5 rounded-lg transition"
                  >🔗 Reference</button>
                  <button onClick={() => { setViewingNote(editingNote); setEditingNote(null); setEditBlocks([]); setEditEditorContent(""); setEditRefs([]); }}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg transition"
                  >Cancel</button>
                  <button onClick={handleEditSave} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition">Save</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Notes list ── */}
        {!showForm && !inDetail && (
          <div className="flex flex-col gap-3" ref={selectedIds.length === 0 ? menuRef : null}>
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📝</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">No notes yet. Create your first one above!</p>
              </div>
            ) : search ? (
              displayedNotes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">No notes match "{search}"</p>
                </div>
              ) : (
                displayedNotes.map((note) => renderNoteCard(note))
              )
            ) : noteGroups.length > 0 ? (
              <>
                {noteGroups.map((group) => {
                  const groupNotes = displayedNotes.filter((n) => n.note_group_id === group.id);
                  const isCollapsed = collapsedGroups.has(group.id);
                  return (
                    <div key={group.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-3">
                      {renderGroupHeader(group)}
                      {!isCollapsed && (
                        groupNotes.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No notes in this group yet.</p>
                        ) : (
                          <div className="flex flex-col gap-2 mt-1">
                            {groupNotes.map((note) => renderNoteCard(note))}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}

                {/* Ungrouped notes */}
                {displayedNotes.filter((n) => !n.note_group_id).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-2">Ungrouped</p>
                    <div className="flex flex-col gap-2">
                      {displayedNotes.filter((n) => !n.note_group_id).map((note) => renderNoteCard(note))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              displayedNotes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">No notes match "{search}"</p>
                </div>
              ) : (
                displayedNotes.map((note) => renderNoteCard(note))
              )
            )}
          </div>
        )}
      </div>

      {/* ── Reference Picker Modal ── */}
      {showRefPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowRefPicker(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-5 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">🔗 Add Reference</h3>
              <button onClick={() => setShowRefPicker(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">✕</button>
            </div>
            <input autoFocus type="text" placeholder="Search notes..." value={refSearch} onChange={(e) => setRefSearch(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3 shrink-0"
            />
            <div className="overflow-y-auto flex-1 flex flex-col gap-1">
              {searchableNotes.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Loading...</p>
              )}
              {searchableNotes.map((nb) => {
                const q = refSearch.toLowerCase();
                const matchNote = (n) => !q || n.title.toLowerCase().includes(q);
                const filteredUngrouped = nb.ungrouped.filter(matchNote).filter((n) => n.id !== currentEditingId);
                const filteredGroups = nb.groups
                  .map((g) => ({ ...g, notes: g.notes.filter(matchNote).filter((n) => n.id !== currentEditingId) }))
                  .filter((g) => g.notes.length > 0);
                if (!filteredUngrouped.length && !filteredGroups.length) return null;
                const isExpanded = refSearch ? true : expandedRefNotebooks.has(nb.id);
                return (
                  <div key={nb.id}>
                    <button
                      onClick={() => setExpandedRefNotebooks((prev) => {
                        const next = new Set(prev);
                        if (next.has(nb.id)) next.delete(nb.id); else next.add(nb.id);
                        return next;
                      })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
                    >
                      <span className="text-xs text-gray-400 w-3">{isExpanded ? "▼" : "▶"}</span>
                      <span>📓</span>
                      <span className="truncate">{nb.name}</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-4 flex flex-col gap-0.5">
                        {filteredGroups.map((g) => {
                          const gExpanded = refSearch ? true : expandedRefGroups.has(g.id);
                          return (
                            <div key={g.id}>
                              <button
                                onClick={() => setExpandedRefGroups((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(g.id)) next.delete(g.id); else next.add(g.id);
                                  return next;
                                })}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
                              >
                                <span className="text-xs text-gray-400 w-3">{gExpanded ? "▼" : "▶"}</span>
                                <span>📁</span>
                                <span className="truncate">{g.name}</span>
                              </button>
                              {gExpanded && g.notes.map((n) => {
                                const alreadyAdded = currentRefsForPicker.some((r) => r.id === n.id);
                                return (
                                  <button key={n.id} onClick={() => !alreadyAdded && handleAddRef({ ...n, notebook_id: nb.id })}
                                    disabled={alreadyAdded}
                                    className={`w-full text-left flex items-center gap-2 px-6 py-1.5 text-sm rounded-xl transition ${alreadyAdded ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"}`}
                                  ><span>📄</span><span className="truncate">{n.title}</span>{alreadyAdded && <span className="ml-auto text-xs text-green-500">✓</span>}</button>
                                );
                              })}
                            </div>
                          );
                        })}
                        {filteredUngrouped.map((n) => {
                          const alreadyAdded = currentRefsForPicker.some((r) => r.id === n.id);
                          return (
                            <button key={n.id} onClick={() => !alreadyAdded && handleAddRef({ ...n, notebook_id: nb.id })}
                              disabled={alreadyAdded}
                              className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl transition ${alreadyAdded ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"}`}
                            ><span>📄</span><span className="truncate">{n.title}</span>{alreadyAdded && <span className="ml-auto text-xs text-green-500">✓</span>}</button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Export PDF modal ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Export as PDF</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">File ka naam likho, <span className="font-medium text-gray-500 dark:text-gray-400">.pdf</span> automatically add ho jaayega</p>
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 bg-gray-50 dark:bg-gray-800 mb-4">
              <input autoFocus type="text" placeholder="notes-export" value={exportFilename} onChange={(e) => setExportFilename(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleExportPDF(); if (e.key === "Escape") setShowExportModal(false); }}
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              />
              <span className="pr-4 text-sm text-gray-400 dark:text-gray-500 select-none">.pdf</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowExportModal(false)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-4 py-2 rounded-xl transition"
              >Cancel</button>
              <button onClick={handleExportPDF}
                className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-xl transition"
              >📄 Download</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default NotePanel;
