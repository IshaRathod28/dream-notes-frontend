import { useState, useEffect, useRef } from "react";
import { getNotes, createNote, updateNote, deleteNote, moveNote, bulkDeleteNotes, bulkMoveNotes, uploadImages, deleteImage, saveImageLayout, reorderNotes } from "../services/noteService";
import { getNotebooks } from "../services/notebookService";

function NotePanel({ notebook, resetSignal }) {
  const [notes, setNotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("both");
  const [allNotebooks, setAllNotebooks] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showMoveOptions, setShowMoveOptions] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [sortMode, setSortMode] = useState("newest");
  const [fullscreen, setFullscreen] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [imageMeta, setImageMeta] = useState({});
  const [imageOrders, setImageOrders] = useState({});
  const [createBlocks, setCreateBlocks] = useState([{ id: "b0", type: "text", value: "" }]);
  const [editBlocks, setEditBlocks] = useState([]);
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
    if (!resetSignal) return;
    setViewingNote(null);
    setEditingNote(null);
    setEditBlocks([]);
    setShowForm(false);
  }, [resetSignal]);

  useEffect(() => {
    fetchNotes();
    setEditingNote(null);
    setEditBlocks([]);
    setShowForm(false);
    setTitle("");
    setCreateBlocks([{ id: genId(), type: "text", value: "" }]);
    setSearch("");
    setSearchField("both");
    setOpenMenuId(null);
    setSelectionMode(false);
    setSelectedIds([]);
    setShowBulkMove(false);
    setFullscreen(false);
    setViewingNote(null);
    setSortMode("newest");
  }, [notebook.id]);

  useEffect(() => {
    getNotebooks().then(setAllNotebooks).catch(() => {});
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      panelRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
        setShowBulkMove(false);
      }
    };
    if (openMenuId) document.addEventListener("mousedown", handleClickOutside);
    else setShowMoveOptions(false);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const filteredNotes = notes.filter((n) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (searchField === "title") return n.title.toLowerCase().includes(q);
    if (searchField === "content") return (n.content || "").toLowerCase().includes(q);
    return n.title.toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
  });

  const displayedNotes = (() => {
    if (sortMode === "newest") return [...filteredNotes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortMode === "oldest") return [...filteredNotes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return filteredNotes; // custom — server position order
  })();

  const genId = () => Math.random().toString(36).slice(2, 9);

  const blocksFromNote = (note) => {
    const images = note.images || [];
    const layout = note.image_layout;
    if (layout?.blocks?.length) {
      const blocks = layout.blocks.map((b) => {
        if (b.type === "text") return { id: genId(), type: "text", value: b.value || "" };
        const matchedById = images.find((img) => img.id === b.id);
        // legacy notes store the full URL as b.id — match by URL to get the real signed_id
        const matchedByUrl = !matchedById ? images.find((img) => img.url === b.id) : null;
        const resolved = matchedById || matchedByUrl;
        const imageId = resolved?.id || b.id;
        const url = resolved?.url || (b.id?.startsWith("http") ? b.id : "");
        return { id: genId(), type: "image", imageId, url };
      });
      // If no text block carries content but note.content has text, inject it
      const hasText = blocks.some((b) => b.type === "text" && b.value.trim());
      if (!hasText && note.content?.trim()) {
        const first = blocks.find((b) => b.type === "text");
        if (first) first.value = note.content;
        else blocks.unshift({ id: genId(), type: "text", value: note.content });
      }
      return blocks;
    }
    const blocks = [{ id: genId(), type: "text", value: note.content || "" }];
    images.forEach((img) => {
      blocks.push({ id: genId(), type: "image", imageId: img.id, url: img.url });
    });
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

  const fetchNotes = async () => {
    try {
      const data = await getNotes(notebook.id);
      setNotes(data.map(normalizeNote));
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    }
  };

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

  const toggleSelect = (noteId) => {
    setSelectedIds((prev) => {
      const next = prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = filteredNotes.map((n) => n.id);
    if (selectedIds.length === filteredNotes.length) {
      setSelectedIds([]);
      setSelectionMode(false);
    } else {
      setSelectedIds(allIds);
    }
  };

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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const textContent = createBlocks.filter((b) => b.type === "text").map((b) => b.value).join("\n\n").trim();
      let note = normalizeNote(await createNote(notebook.id, { title: title.trim(), content: textContent }));
      const imageBlocks = createBlocks.filter((b) => b.type === "image" && b.file);
      if (imageBlocks.length > 0) {
        note = normalizeNote(await uploadImages(notebook.id, note.id, imageBlocks.map((b) => b.file)));
        let imgIdx = 0;
        const blockLayout = createBlocks.map((b) => {
          if (b.type === "text") return { type: "text", value: b.value };
          const img = note.images[imgIdx++];
          return { type: "image", id: img?.id || "" };
        }).filter((b) => b.type !== "image" || b.id);
        note = normalizeNote(await saveImageLayout(notebook.id, note.id, {
          meta: {}, order: note.images.map((img) => img.id), blocks: blockLayout,
        }));
      }
      setNotes(sortMode === "custom" ? [...notes, note] : [note, ...notes]);
      setTitle("");
      setCreateBlocks([{ id: genId(), type: "text", value: "" }]);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const handleEditSave = async () => {
    if (!editingNote.title.trim()) return;
    try {
      const textContent = editBlocks.filter((b) => b.type === "text").map((b) => b.value).join("\n\n").trim();
      let updated = normalizeNote(await updateNote(notebook.id, editingNote.id, {
        title: editingNote.title,
        content: textContent,
      }));
      const blockLayout = editBlocks
        .filter((b) => b.type !== "image" || b.imageId)
        .map((b) => b.type === "text" ? { type: "text", value: b.value } : { type: "image", id: b.imageId });
      const imageIds = editBlocks.filter((b) => b.type === "image" && b.imageId).map((b) => b.imageId);
      const noteMeta = {};
      imageIds.forEach((id) => { if (imageMeta[id]) noteMeta[id] = imageMeta[id]; });
      updated = normalizeNote(await saveImageLayout(notebook.id, editingNote.id, {
        meta: noteMeta, order: imageIds, blocks: blockLayout,
      }));
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setEditingNote(null);
      setEditBlocks([]);
      setViewingNote(updated);
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const handleMove = async (noteId, targetNotebookId) => {
    try {
      await moveNote(notebook.id, noteId, targetNotebookId);
      setNotes(notes.filter((n) => n.id !== noteId));
      setOpenMenuId(null);
    } catch (error) {
      console.error("Failed to move note:", error);
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

  const handleDragStart = (e, imageId) => {
    dragItem.current = imageId;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, imageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverItem.current = imageId;
  };

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
          ...newImgs.flatMap((img) => [
            { id: genId(), type: "image", imageId: img.id, url: img.url },
            { id: genId(), type: "text", value: "" },
          ]),
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

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const margin = 15;
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;
    const maxWidth = pageW - margin * 2;
    const maxImgHeight = pageH - margin * 2;

    let y = margin;

    const addPageIfNeeded = (heightNeeded) => {
      if (y + heightNeeded > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const fetchImg = async (url) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        const dims = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 1, h: 1 });
          img.src = base64;
        });
        return { base64, dims };
      } catch {
        return null;
      }
    };

    const selectedNotes = notes.filter((n) => selectedIds.includes(n.id));

    for (let i = 0; i < selectedNotes.length; i++) {
      const note = selectedNotes[i];

      if (i !== 0) {
        addPageIfNeeded(15);
        y += 5;
        doc.setDrawColor(200);
        doc.line(margin, y, pageW - margin, y);
        y += 8;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      const titleLines = doc.splitTextToSize(note.title, maxWidth);
      const titleLineH = 7;
      addPageIfNeeded(titleLines.length * titleLineH);
      doc.text(titleLines, margin, y);
      y += titleLines.length * titleLineH + 4;

      const layout = note.image_layout;
      const images = note.images || [];
      const blocks = layout?.blocks?.length
        ? layout.blocks
        : [
            { type: "text", value: note.content || "" },
            ...images.map((img) => ({ type: "image", id: img.id })),
          ];

      for (const block of blocks) {
        if (block.type === "text" && block.value?.trim()) {
          doc.setFont("courier", "normal");
          doc.setFontSize(11);
          const lines = doc.splitTextToSize(block.value, maxWidth);
          const lineH = 5.5;

          let remaining = [...lines];
          while (remaining.length > 0) {
            const available = pageH - margin - y;
            const linesThisPage = Math.max(1, Math.floor(available / lineH));
            const chunk = remaining.splice(0, linesThisPage);
            doc.text(chunk, margin, y);
            y += chunk.length * lineH;
            if (remaining.length > 0) { doc.addPage(); y = margin; }
          }
          y += 4;
        } else if (block.type === "image") {
          const imgObj = images.find((im) => im.id === block.id);
          if (!imgObj?.url) continue;

          const result = await fetchImg(imgObj.url);
          if (!result) continue;

          const { base64, dims } = result;
          let imgWidth = maxWidth;
          let imgHeight = (imgWidth * dims.h) / dims.w;

          if (imgHeight > maxImgHeight) {
            imgHeight = maxImgHeight;
            imgWidth = (imgHeight * dims.w) / dims.h;
          }

          addPageIfNeeded(imgHeight);
          doc.addImage(base64, "JPEG", margin, y, imgWidth, imgHeight);
          y += imgHeight + 6;
        }
      }
    }

    doc.save("notes-export.pdf");
  };
  const otherNotebooks = allNotebooks.filter((nb) => nb.id !== notebook.id);
  const allSelected = filteredNotes.length > 0 && selectedIds.length === filteredNotes.length;
  const inDetail = !showForm && (viewingNote || editingNote);

  return (
    <div ref={panelRef} className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-950">

      {/* Sticky top */}
      <div className="shrink-0 px-8 pt-8 pb-2 bg-white dark:bg-gray-950">

        {/* Notebook header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <span className="text-2xl">📓</span>
          <h2
            className={`text-xl font-bold text-gray-800 dark:text-gray-100 truncate ${inDetail ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors" : ""}`}
            onClick={() => { if (inDetail) { setViewingNote(null); setEditingNote(null); } }}
            title={inDetail ? "Back to notes" : undefined}
          >{notebook.name}</h2>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {notes.length} note{notes.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2.5 py-1.5 font-medium transition rounded-xl"
              title={fullscreen ? "Exit Fullscreen" : "Expand"}
            >
              {fullscreen ? <><span>✕</span> Exit Fullscreen</> : <><span>⛶</span> Expand</>}
            </button>
          </div>
        </div>

        {/* Toolbar: create + search */}
        {!showForm && !inDetail && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => { setViewingNote(null); setEditingNote(null); setShowForm(true); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors duration-150 shadow-sm shrink-0"
            >
              <span className="text-lg leading-none">+</span> Create Note
            </button>

            <div className="flex flex-1 items-center border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 transition">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-300 px-3 py-2.5 focus:outline-none cursor-pointer"
              >
                <option value="both">Both</option>
                <option value="title">Title</option>
                <option value="content">Content</option>
              </select>
              <input
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="px-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
                  ✕
                </button>
              )}
            </div>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer shrink-0"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="custom">Custom Order</option>
            </select>
          </div>
        )}

        {/* Bulk action bar */}
        {!showForm && !inDetail && selectedIds.length > 0 && (
          <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl" ref={menuRef}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
              title={allSelected ? "Deselect all" : "Select all"}
            />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2 ml-auto relative">
              {otherNotebooks.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowBulkMove((v) => !v)}
                    className="flex items-center gap-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-1.5 rounded-lg transition"
                  >
                    📂 Move to {showBulkMove ? "▲" : "▼"}
                  </button>
                  {showBulkMove && (
                    <div className="absolute left-0 top-9 z-20 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1 min-w-[160px]">
                      {otherNotebooks.map((nb) => (
                        <button
                          key={nb.id}
                          onClick={() => handleBulkMove(nb.id)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-2"
                        >
                          📓 <span className="truncate">{nb.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg transition"
              >
                📄 Export PDF
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg transition"
              >
                🗑️ Delete
              </button>
              <button
                onClick={() => { setSelectionMode(false); setSelectedIds([]); setShowBulkMove(false); }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Detail header — shown for both view and edit */}
        {inDetail && (
          <div className="flex items-center shrink-0 mb-0 pb-2 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => { setViewingNote(null); setEditingNote(null); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition"
            >
              ← Back
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => { setViewingNote(null); setEditingNote(null); setShowForm(true); }}
                className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg transition"
              >
                + Create Another Note
              </button>
              {viewingNote && !editingNote && (
                <button
                  onClick={() => { setEditBlocks(blocksFromNote(viewingNote)); setEditingNote(viewingNote); setViewingNote(null); }}
                  className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition"
                >
                  ✏️ Edit
                </button>
              )}
            </div>
          </div>
        )}

      </div>
      <div className={`flex-1 px-8 pb-8 ${fullscreen && showForm ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className={`flex flex-col border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 ${fullscreen ? "h-full" : ""}`}
          >
            <div className="mb-3 shrink-0">
              <p className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                <span className="text-sm">✍️</span> New Note
              </p>
            </div>
            <div className={`flex flex-col gap-3 ${fullscreen ? "flex-1 min-h-0" : ""}`}>
              <input
                autoFocus
                type="text"
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl px-4 py-2.5 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition shrink-0 ${fullscreen ? "text-lg text-gray-800 dark:text-gray-100" : "text-sm text-gray-700 dark:text-gray-200"}`}
              />

              {/* Block editor */}
              <div className={`border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition ${fullscreen ? "flex-1 overflow-y-auto min-h-0" : ""}`}>
                {createBlocks.map((block, idx) =>
                  block.type === "text" ? (
                    <textarea
                      key={block.id}
                      placeholder={idx === 0 ? "Write your note here..." : "Continue writing..."}
                      value={block.value}
                      rows={2}
                      onChange={(e) => setCreateBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, value: e.target.value } : b))}
                      className={`w-full bg-transparent px-4 py-2.5 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none resize-none ${fullscreen ? "text-base text-gray-800 dark:text-gray-100" : "text-sm text-gray-700 dark:text-gray-200"}`}
                    />
                  ) : (
                    <div key={block.id} className="px-4 py-2 flex flex-wrap gap-3">
                      <div className="relative group flex-shrink-0" style={{ width: "calc(50% - 6px)" }}>
                        <img
                          src={block.localUrl}
                          alt="preview"
                          draggable={false}
                          className="rounded-xl w-full h-auto border border-gray-100 dark:border-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() => setCreateBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-lg w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                          title="Delete image"
                        >✕</button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex gap-2 mt-1 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => { wasFullscreenRef.current = !!document.fullscreenElement; createFileInputRef.current?.click(); }}
                  className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-lg transition mr-auto"
                >
                  📎 Add Image
                </button>
                <input
                  ref={createFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (wasFullscreenRef.current) panelRef.current?.requestFullscreen();
                    Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/")).forEach((file) => {
                      setCreateBlocks((prev) => [
                        ...prev,
                        { id: genId(), type: "image", file, localUrl: URL.createObjectURL(file) },
                        { id: genId(), type: "text", value: "" },
                      ]);
                    });
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setTitle(""); setCreateBlocks([{ id: genId(), type: "text", value: "" }]); }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition"
                >
                  Add Note
                </button>
              </div>
            </div>
          </form>
        )}

        {/*
          Single persistent container for view AND edit.
          This div never unmounts when switching between view↔edit,
          so the browser fullscreen is never interrupted.
        */}
        {inDetail && (
          <div
            ref={noteDetailRef}
            onPaste={(e) => handlePaste(e, (editingNote || viewingNote).id)}
            className={
              fullscreen
                ? "flex flex-col h-full bg-white dark:bg-gray-950 p-8"
                : "border border-blue-300 dark:border-blue-700 rounded-2xl px-4 pb-4 pt-2 bg-blue-50 dark:bg-blue-900/20"
            }
          >

            {/* ── VIEW MODE ── */}
            {/* ── VIEW MODE ── */}
            {viewingNote && !editingNote && (() => {
              const layout = viewingNote.image_layout;
              const images = viewingNote.images || [];
              const blocks = layout?.blocks?.length
                ? layout.blocks
                : [
                    { type: "text", value: viewingNote.content || "" },
                    ...images.map((img) => ({ type: "image", id: img.id })),
                  ];
              return (
                <>
                  <div className="shrink-0 mb-2">
                    <p className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      <span className="text-sm">📄</span> Note
                    </p>
                  </div>
                  <p className={`w-full border-b border-blue-300 dark:border-blue-600 pb-1 mb-3 ${fullscreen ? "text-lg font-bold text-gray-800 dark:text-gray-100" : "font-semibold text-gray-800 dark:text-gray-100 text-sm"}`}>
                    {viewingNote.title}
                  </p>
                  {blocks.map((block, idx) => {
                    if (block.type === "text") {
                      if (!block.value?.trim()) return null;
                      return (
                        <p key={`t-${idx}`} className={`whitespace-pre-wrap mb-1 ${fullscreen ? "text-base text-gray-700 dark:text-gray-300" : "text-sm text-gray-600 dark:text-gray-300"}`}>
                          {block.value}
                        </p>
                      );
                    }
                    const img = images.find((i) => i.id === block.id);
                    if (!img?.url) return null;
                    return (
                      <div key={img.id} className="flex flex-wrap gap-3 mt-2 mb-2">
                        <div
                          className="relative group flex-shrink-0"
                          style={{ width: imageMeta[img.id]?.width ? `${imageMeta[img.id].width}px` : "calc(50% - 6px)" }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, img.id)}
                          onDragOver={(e) => handleDragOver(e, img.id)}
                          onDrop={(e) => handleDrop(e, viewingNote.id, viewingNote.images)}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <img
                            src={img.url}
                            alt={img.filename}
                            draggable={false}
                            style={imageMeta[img.id]?.height ? { height: `${imageMeta[img.id].height}px` } : {}}
                            className={`rounded-xl w-full border border-gray-100 dark:border-gray-800 ${imageMeta[img.id]?.height ? "object-cover" : "h-auto"}`}
                          />
                          <button
                            onClick={() => handleImageDelete(img.id, viewingNote.id)}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-lg w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                            title="Delete image"
                          >✕</button>
                          <div
                            onMouseDown={(e) => startResize(e, img.id, viewingNote.id, viewingNote.images)}
                            className="absolute bottom-2 right-2 w-5 h-5 flex items-center justify-center cursor-se-resize opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-gray-800/90 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs select-none"
                            title="Resize"
                          >⤡</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}

            {/* ── EDIT MODE ── */}
            {editingNote && (
              <>
                <div className="shrink-0 mb-2">
                  <p className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    <span className="text-sm">✍️</span> Edit Note
                  </p>
                </div>
                <input
                  autoFocus
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  className={`w-full bg-transparent border-b border-blue-300 dark:border-blue-600 pb-1 mb-3 focus:outline-none ${fullscreen ? "text-lg font-bold text-gray-800 dark:text-gray-100" : "font-semibold text-gray-800 dark:text-gray-100 text-sm"}`}
                />

                {/* Block editor */}
                <div className={fullscreen ? "flex-1 overflow-y-auto min-h-0" : ""}>
                {editBlocks.map((block, idx) =>
                  block.type === "text" ? (
                    <textarea
                      key={block.id}
                      placeholder={idx === 0 ? "Write your note here..." : "Continue writing..."}
                      value={block.value}
                      rows={2}
                      ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                      onChange={(e) => {
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                        setEditBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, value: e.target.value } : b));
                      }}
                      className={`w-full bg-transparent focus:outline-none resize-none overflow-hidden ${fullscreen ? "text-base text-gray-700 dark:text-gray-300" : "text-sm text-gray-600 dark:text-gray-300"}`}
                    />
                  ) : block.url ? (
                    <div key={block.id} className="flex flex-wrap gap-3 mt-2 mb-2">
                      <div
                        className="relative group flex-shrink-0"
                        style={{ width: imageMeta[block.imageId]?.width ? `${imageMeta[block.imageId].width}px` : "calc(50% - 6px)" }}
                      >
                        <img
                          src={block.url}
                          alt=""
                          draggable={false}
                          className="rounded-xl w-full h-auto border border-gray-100 dark:border-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleImageDelete(block.imageId, editingNote.id)}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-lg w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                          title="Delete image"
                        >✕</button>
                        <div
                          onMouseDown={(e) => startResize(e, block.imageId, editingNote.id, editingNote.images)}
                          className="absolute bottom-2 right-2 w-5 h-5 flex items-center justify-center cursor-se-resize opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-gray-800/90 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs select-none"
                          title="Resize"
                        >⤡</div>
                      </div>
                    </div>
                  ) : null
                )}
                </div>

                <div className="flex gap-2 mt-3 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => { wasFullscreenRef.current = !!document.fullscreenElement; editFileInputRef.current?.click(); }}
                    className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-lg transition mr-auto"
                  >
                    📎 Add Image
                  </button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { if (wasFullscreenRef.current) panelRef.current?.requestFullscreen(); handleImageUpload(e.target.files, editingNote.id); e.target.value = ""; }}
                  />
                  <button
                    onClick={() => { setViewingNote(editingNote); setEditingNote(null); setEditBlocks([]); }}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSave}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Notes list */}
        {!showForm && !inDetail && (
          <div className="flex flex-col gap-3" ref={selectedIds.length === 0 ? menuRef : null}>

            {notes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📝</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">No notes yet. Create your first one above!</p>
              </div>
            ) : displayedNotes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 dark:text-gray-500 text-sm">No notes match "{search}"</p>
              </div>
            ) : (
              displayedNotes.map((note) => (
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => setOpenMenuId(openMenuId === note.id ? null : note.id)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition shrink-0 text-base font-bold leading-none"
                      title="More options"
                    >
                      ⋯
                    </button>
                  </div>

                  {openMenuId === note.id && (
                    <div className="absolute right-4 top-10 z-20 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1 min-w-[180px]">
                      <button
                        onClick={() => { setEditBlocks(blocksFromNote(note)); setEditingNote(note); setOpenMenuId(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                      >
                        ✏️ <span>Edit</span>
                      </button>
                      <button
                        onClick={() => { setSelectionMode(true); toggleSelect(note.id); setOpenMenuId(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                      >
                        ☑️ <span>Select</span>
                      </button>

                      {otherNotebooks.length > 0 && (
                        <>
                          <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                          <button
                            onClick={() => setShowMoveOptions((v) => !v)}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-2"
                          >
                            <span className="flex items-center gap-2">📂 Move to</span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs">{showMoveOptions ? "▲" : "▼"}</span>
                          </button>
                          {showMoveOptions && (
                            <div className="px-3 pb-2 flex flex-col gap-0.5">
                              {otherNotebooks.map((nb) => (
                                <button
                                  key={nb.id}
                                  onClick={() => handleMove(note.id, nb.id)}
                                  className="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-2 rounded-lg transition flex items-center gap-2"
                                >
                                  📓 <span className="truncate">{nb.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                      >
                        🗑️ <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>{/* end scrollable content */}

    </div>
  );
}

export default NotePanel;
