import { useState, useEffect, useRef } from "react";
import { getNotes, createNote, updateNote, deleteNote, moveNote, bulkDeleteNotes, bulkMoveNotes } from "../services/noteService";
import { getNotebooks } from "../services/notebookService";

function NotePanel({ notebook }) {
  const [notes, setNotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("both");
  const [allNotebooks, setAllNotebooks] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showMoveOptions, setShowMoveOptions] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const menuRef = useRef(null);
  const formRef = useRef(null);
  const editFormRef = useRef(null);

  useEffect(() => {
    fetchNotes();
    setEditingNote(null);
    setShowForm(false);
    setTitle("");
    setContent("");
    setSearch("");
    setSearchField("both");
    setOpenMenuId(null);
    setSelectionMode(false);
    setSelectedIds([]);
    setShowBulkMove(false);
    setFullscreen(false);
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
      formRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleEditFullscreen = () => {
    if (!document.fullscreenElement) {
      editFormRef.current?.requestFullscreen();
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

  const fetchNotes = async () => {
    try {
      const data = await getNotes(notebook.id);
      setNotes(data);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    }
  };

  const toggleSelect = (noteId) => {
    setSelectedIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
  };

  const toggleSelectAll = () => {
    const allIds = filteredNotes.map((n) => n.id);
    setSelectedIds(selectedIds.length === filteredNotes.length ? [] : allIds);
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
      const note = await createNote(notebook.id, { title: title.trim(), content: content.trim() });
      setNotes([note, ...notes]);
      setTitle("");
      setContent("");
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const handleEditSave = async () => {
    if (!editingNote.title.trim()) return;
    try {
      const updated = await updateNote(notebook.id, editingNote.id, {
        title: editingNote.title,
        content: editingNote.content,
      });
      setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
      setEditingNote(null);
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

  const otherNotebooks = allNotebooks.filter((nb) => nb.id !== notebook.id);
  const allSelected = filteredNotes.length > 0 && selectedIds.length === filteredNotes.length;

  return (
    <div className="flex flex-col h-full">

      {/* Notebook header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <span className="text-2xl">📓</span>
        <h2 className="text-xl font-bold text-gray-800 truncate">{notebook.name}</h2>
        <span className="ml-auto text-xs text-gray-400 shrink-0">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Toolbar: create + search */}
      {!showForm && (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors duration-150 shadow-sm shrink-0"
          >
            <span className="text-lg leading-none">+</span> Create Note
          </button>

          <div className="flex flex-1 items-center border border-gray-200 bg-gray-50 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 transition">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="bg-gray-100 border-r border-gray-200 text-xs font-medium text-gray-500 px-3 py-2.5 focus:outline-none cursor-pointer"
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
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="px-3 text-gray-400 hover:text-gray-600 text-sm">
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {!showForm && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl" ref={menuRef}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
            title={allSelected ? "Deselect all" : "Select all"}
          />
          <span className="text-sm font-semibold text-blue-700">
            {selectedIds.length} selected
          </span>

          <div className="flex items-center gap-2 ml-auto relative">
            {/* Bulk move */}
            {otherNotebooks.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowBulkMove((v) => !v)}
                  className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-1.5 rounded-lg transition"
                >
                  📂 Move to {showBulkMove ? "▲" : "▼"}
                </button>
                {showBulkMove && (
                  <div className="absolute left-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                    {otherNotebooks.map((nb) => (
                      <button
                        key={nb.id}
                        onClick={() => handleBulkMove(nb.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                      >
                        📓 <span className="truncate">{nb.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bulk delete */}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg transition"
            >
              🗑️ Delete
            </button>

            {/* Cancel */}
            <button
              onClick={() => { setSelectionMode(false); setSelectedIds([]); setShowBulkMove(false); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create note form — inline or fullscreen */}
      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleCreate}
          className={
            fullscreen
              ? "flex flex-col h-full bg-white p-8"
              : "flex flex-col flex-1 border border-blue-100 bg-blue-50 rounded-2xl p-4 min-h-0"
          }
        >
          <div className={`flex items-center justify-between shrink-0 ${fullscreen ? "mb-6 pb-4 border-b border-gray-200" : "mb-3"}`}>
            <p className={`flex items-center gap-2 ${fullscreen ? "text-2xl font-bold text-gray-800" : "text-xs font-semibold text-blue-600 uppercase tracking-wide"}`}>
              <span className={fullscreen ? "text-2xl" : "text-sm"}>✍️</span>
              New Note
            </p>
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`flex items-center gap-2 font-medium transition rounded-xl ${
                fullscreen
                  ? "text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2"
                  : "text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5"
              }`}
            >
              {fullscreen ? (
                <><span className="text-base">✕</span> Exit Fullscreen</>
              ) : (
                <><span className="text-sm">⛶</span> Expand</>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <input
              autoFocus
              type="text"
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition shrink-0 ${fullscreen ? "text-lg text-gray-800" : "text-sm text-gray-700"}`}
            />
            <textarea
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`flex-1 w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition resize-none min-h-[150px] ${fullscreen ? "text-base text-gray-800" : "text-sm text-gray-700"}`}
            />
            <div className="flex gap-2 justify-end mt-1 shrink-0">
              <button
                type="button"
                onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); setShowForm(false); setTitle(""); setContent(""); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2 rounded-xl transition-colors duration-150 shadow-sm"
              >
                Add Note
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Notes list */}
      {!showForm && (
        <div className="flex flex-col gap-3" ref={selectedIds.length === 0 ? menuRef : null}>

          {notes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-gray-400 text-sm">No notes yet. Create your first one above!</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No notes match "{search}"</p>
            </div>
          ) : (
            filteredNotes.map((note) =>
              editingNote?.id === note.id ? (
                /* Edit mode */
                <div
                  key={note.id}
                  ref={editFormRef}
                  className={fullscreen ? "flex flex-col h-full bg-white p-8" : "border border-blue-300 rounded-2xl p-4 bg-blue-50"}
                >
                  <div className={`flex items-center justify-between shrink-0 ${fullscreen ? "mb-6 pb-4 border-b border-gray-200" : "mb-3"}`}>
                    <p className={`flex items-center gap-2 ${fullscreen ? "text-2xl font-bold text-gray-800" : "text-xs font-semibold text-blue-600 uppercase tracking-wide"}`}>
                      <span className={fullscreen ? "text-2xl" : "text-sm"}>✍️</span>
                      Edit Note
                    </p>
                    <button
                      type="button"
                      onClick={toggleEditFullscreen}
                      className={`flex items-center gap-2 font-medium transition rounded-xl ${
                        fullscreen
                          ? "text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2"
                          : "text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5"
                      }`}
                    >
                      {fullscreen ? (
                        <><span className="text-base">✕</span> Exit Fullscreen</>
                      ) : (
                        <><span className="text-sm">⛶</span> Expand</>
                      )}
                    </button>
                  </div>
                  <input
                    autoFocus
                    value={editingNote.title}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                    className={`w-full bg-transparent border-b border-blue-300 pb-1 mb-3 focus:outline-none ${fullscreen ? "text-lg font-bold text-gray-800" : "font-semibold text-gray-800 text-sm"}`}
                  />
                  <textarea
                    value={editingNote.content}
                    onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                    className={`w-full bg-transparent focus:outline-none resize-none ${fullscreen ? "flex-1 text-base text-gray-700" : "text-sm text-gray-600"}`}
                    rows={fullscreen ? undefined : 4}
                  />
                  <div className="flex gap-2 mt-3 justify-end shrink-0">
                    <button
                      onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); setEditingNote(null); }}
                      className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg transition"
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
                </div>
              ) : (
                /* View mode */
                <div
                  key={note.id}
                  className={`relative border rounded-2xl p-4 transition ${
                    selectedIds.includes(note.id)
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox — only visible in selection mode */}
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(note.id)}
                        onChange={() => toggleSelect(note.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm">{note.title}</h3>
                      {note.content && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}
                    </div>

                    {/* Three-dot button */}
                    <button
                      onClick={() => setOpenMenuId(openMenuId === note.id ? null : note.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition shrink-0 text-base font-bold leading-none"
                      title="More options"
                    >
                      ⋯
                    </button>
                  </div>

                  {/* Dropdown menu */}
                  {openMenuId === note.id && (
                    <div className="absolute right-4 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px]">
                      <button
                        onClick={() => { setEditingNote(note); setOpenMenuId(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        ✏️ <span>Edit</span>
                      </button>
                      <button
                        onClick={() => { setSelectionMode(true); toggleSelect(note.id); setOpenMenuId(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        ☑️ <span>Select</span>
                      </button>

                      {otherNotebooks.length > 0 && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => setShowMoveOptions((v) => !v)}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between gap-2"
                          >
                            <span className="flex items-center gap-2">📂 Move to</span>
                            <span className="text-gray-400 text-xs">{showMoveOptions ? "▲" : "▼"}</span>
                          </button>
                          {showMoveOptions && (
                            <div className="px-3 pb-2 flex flex-col gap-0.5">
                              {otherNotebooks.map((nb) => (
                                <button
                                  key={nb.id}
                                  onClick={() => handleMove(note.id, nb.id)}
                                  className="w-full text-left text-xs text-gray-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition flex items-center gap-2"
                                >
                                  📓 <span className="truncate">{nb.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                      >
                        🗑️ <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            )
          )}
        </div>
      )}

    </div>
  );
}

export default NotePanel;
