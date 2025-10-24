import api from '../../../../../services/api';

export const tagService = {
  getAllTags: () => api.get('/tags'),

  getTag: (id) => api.get(`/tags/${id}`),

  createTag: (tagData) => api.post('/tags', tagData),

  updateTag: (id, tagData) => api.put(`/tags/${id}`, tagData),

  deleteTag: (id) => api.delete(`/tags/${id}`),
};

export const fetchIndex2 = async ({ q = "", perPage = 5, page = 1 }) => {
  try {
    const response = await api.get("/tags/tagsadvance", {
      params: {
        q,           // mot-clé recherché
        per_page: perPage, 
        page         // page Laravel (pagination automatique)
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des tags:", error);
    throw error;
  }
};