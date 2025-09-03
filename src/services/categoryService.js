import axios from 'axios';
import api from './tagService';

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

export default categoryService;