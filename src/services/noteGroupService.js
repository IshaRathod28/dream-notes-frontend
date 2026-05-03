import api from "../api/axios";

export const getNoteGroups = async (notebookId) => {
  const response = await api.get(`/notebooks/${notebookId}/note_groups`);
  return response.data;
};

export const createNoteGroup = async (notebookId, name) => {
  const response = await api.post(`/notebooks/${notebookId}/note_groups`, {
    note_group: { name },
  });
  return response.data;
};

export const updateNoteGroup = async (notebookId, groupId, name) => {
  const response = await api.patch(`/notebooks/${notebookId}/note_groups/${groupId}`, {
    note_group: { name },
  });
  return response.data;
};

export const deleteNoteGroup = async (notebookId, groupId) => {
  await api.delete(`/notebooks/${notebookId}/note_groups/${groupId}`);
};

export const reorderNoteGroups = async (notebookId, orderedIds) => {
  await api.patch(`/notebooks/${notebookId}/note_groups/reorder`, {
    ordered_ids: orderedIds,
  });
};
