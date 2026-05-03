import api from "../api/axios";

export const getNoteHistory = async (notebookId, noteId) => {
  const response = await api.get(`/notebooks/${notebookId}/notes/${noteId}/history`);
  return response.data;
};
