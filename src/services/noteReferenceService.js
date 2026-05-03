import api from "../api/axios";

// Get all outgoing + incoming references for a note
export const getNoteReferences = async (notebookId, noteId) => {
  const response = await api.get(`/notebooks/${notebookId}/notes/${noteId}/references`);
  return response.data; // { outgoing: [...], incoming: [...] }
};

// Add a reference from noteId → targetNoteId
export const addNoteReference = async (notebookId, noteId, targetNoteId) => {
  const response = await api.post(`/notebooks/${notebookId}/notes/${noteId}/references`, {
    target_note_id: targetNoteId,
  });
  return response.data;
};

// Remove a reference from noteId → targetNoteId
export const removeNoteReference = async (notebookId, noteId, targetNoteId) => {
  await api.delete(`/notebooks/${notebookId}/notes/${noteId}/references/${targetNoteId}`);
};

// Fetch all user notes grouped by notebook → group → notes (for reference picker dropdown)
export const getSearchableNotes = async (notebookId) => {
  const response = await api.get(`/notebooks/${notebookId}/notes/searchable`);
  return response.data; // [{ id, name, groups: [...], ungrouped: [...] }]
};
