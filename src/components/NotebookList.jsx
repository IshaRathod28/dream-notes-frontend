import { useEffect, useState, useRef } from "react";
import { getNotebooks, updateNotebook, deleteNotebook, bulkDeleteNotebooks } from "../services/notebookService";

function NotebookList({ selectedId, onSelect, onRefresh }) {
  const [notebooks, setNotebooks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const fetchNotebooks = async () => {
    try {
      const data = await getNotebooks();
      setNotebooks(data);
    } catch (error) {
      console.error("Failed to fetch notebooks:", error);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const allSelected = notebooks.length > 0 && selectedIds.length === notebooks.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : notebooks.map((n) => n.id));
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} notebook(s) and all their notes?`)) return;
    try {
      await bulkDeleteNotebooks(selectedIds);
      const deleted = new Set(selectedIds);
      setNotebooks(notebooks.filter((n) => !deleted.has(n.id)));
      if (deleted.has(selectedId)) onRefresh?.();
      cancelSelection();
    } catch (error) {
      console.error("Bulk delete failed:", error);
    }
  };

  const handleEditStart = (notebook, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditingId(notebook.id);
    setEditName(notebook.name);
  };

  const handleEditSubmit = async (id) => {
    if (!editName.trim()) { setEditingId(null); return; }
    try {
      const updated = await updateNotebook(id, editName.trim());
      setNotebooks(notebooks.map((n) => (n.id === id ? updated : n)));
      if (selectedId === id) onRefresh?.();
    } catch (error) {
      console.error("Failed to update notebook:", error);
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = async (notebook, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!window.confirm(`Delete "${notebook.name}" and all its notes?`)) return;
    try {
      await deleteNotebook(notebook.id);
      setNotebooks(notebooks.filter((n) => n.id !== notebook.id));
      if (selectedId === notebook.id) onRefresh?.();
    } catch (error) {
      console.error("Failed to delete notebook:", error);
    }
  };

  return (
    <div ref={menuRef}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        My Notebooks
      </p>

      {/* Bulk action bar */}
      {selectionMode && selectedIds.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
            title={allSelected ? "Deselect all" : "Select all"}
          />
          <span className="text-xs font-semibold text-blue-700 flex-1">
            {selectedIds.length} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition"
          >
            🗑️ Delete
          </button>
          <button
            onClick={cancelSelection}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      )}

      {notebooks.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {notebooks.map((notebook) => (
            <li
              key={notebook.id}
              onClick={() => !selectionMode && editingId !== notebook.id && onSelect(notebook)}
              className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 ${
                selectedIds.includes(notebook.id)
                  ? "bg-blue-50 border border-blue-100"
                  : selectedId === notebook.id
                  ? "bg-blue-50 border border-blue-100"
                  : "hover:bg-gray-50"
              }`}
            >
              {/* Checkbox — only in selection mode */}
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(notebook.id)}
                  onChange={() => toggleSelect(notebook.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                />
              )}

              <span className="text-base shrink-0">📓</span>

              {editingId === notebook.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditSubmit(notebook.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => handleEditSubmit(notebook.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              ) : (
                <>
                  <span
                    className={`flex-1 text-sm font-medium truncate transition-colors duration-150 ${
                      selectedId === notebook.id ? "text-blue-700" : "text-gray-700"
                    }`}
                  >
                    {notebook.name}
                  </span>

                  {/* Three-dot button */}
                  {!selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === notebook.id ? null : notebook.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition shrink-0 text-base font-bold leading-none"
                      title="More options"
                    >
                      ⋯
                    </button>
                  )}

                  {/* Dropdown */}
                  {openMenuId === notebook.id && (
                    <div className="absolute right-2 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[150px]">
                      <button
                        onClick={(e) => handleEditStart(notebook, e)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        ✏️ <span>Rename</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectionMode(true); toggleSelect(notebook.id); setOpenMenuId(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        ☑️ <span>Select</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={(e) => handleDelete(notebook, e)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                      >
                        🗑️ <span>Delete</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic px-1">No notebooks yet</p>
      )}
    </div>
  );
}

export default NotebookList;
