import api from "../api/axios";

export const getNotes = async (notebookId, search = "") => {
  const params = search.trim() ? { search } : {};
  const response = await api.get(`/notebooks/${notebookId}/notes`, { params });
  return response.data;
};

export const createNote = async (notebookId, data) => {
  const response = await api.post(`/notebooks/${notebookId}/notes`, { note: data });
  return response.data;
};

export const updateNote = async (notebookId, noteId, data) => {
  const response = await api.put(`/notebooks/${notebookId}/notes/${noteId}`, { note: data });
  return response.data;
};

export const deleteNote = async (notebookId, noteId) => {
  await api.delete(`/notebooks/${notebookId}/notes/${noteId}`);
};

export const moveNote = async (notebookId, noteId, targetNotebookId) => {
  const response = await api.patch(`/notebooks/${notebookId}/notes/${noteId}/move`, {
    target_notebook_id: targetNotebookId,
  });
  return response.data;
};

export const bulkDeleteNotes = async (notebookId, noteIds) => {
  await api.delete(`/notebooks/${notebookId}/notes/bulk_destroy`, {
    data: { note_ids: noteIds },
  });
};

export const bulkMoveNotes = async (notebookId, noteIds, targetNotebookId) => {
  await api.patch(`/notebooks/${notebookId}/notes/bulk_move`, {
    note_ids: noteIds,
    target_notebook_id: targetNotebookId,
  });
};
