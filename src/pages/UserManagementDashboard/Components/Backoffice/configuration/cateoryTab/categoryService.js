import api from "../../../../../../services/api";


export const categoryService = {
  // Récupérer toutes les catégories
  getAllCategories: () => api.get('/categories'),

  // Récupérer une catégorie spécifique
  getCategory: (id) => api.get(`/categories/${id}`),

  // Créer une nouvelle catégorie
  createCategory: (categoryData) => api.post('/categories', categoryData),

  // Mettre à jour une catégorie
  updateCategory: (id, categoryData) => api.put(`/categories/${id}`, categoryData),

  // Supprimer une catégorie
  deleteCategory: (id) => api.delete(`/categories/${id}`),
};

export const fetchIndex2 = async ({ q = "", perPage = 5, page = 1 }) => {
  try {
    const response = await api.get("/categories/categoriesadvance", {
      params: {
        q,           
        per_page: perPage, 
        page       
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des categories:", error);
    throw error;
  }
};

export default categoryService;