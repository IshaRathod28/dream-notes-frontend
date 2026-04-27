import api from "../api/axios";

export const getNotebooks = async () => {
  const response = await api.get("/notebooks");
  return response.data;
};

export const createNotebook = async (name) => {
  const response = await api.post("/notebooks", { notebook: { name } });
  return response.data;
};

export const updateNotebook = async (id, name) => {
  const response = await api.put(`/notebooks/${id}`, { notebook: { name } });
  return response.data;
};

export const deleteNotebook = async (id) => {
  await api.delete(`/notebooks/${id}`);
};
