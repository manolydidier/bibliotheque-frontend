// src/pages/categories/categoryService.js
import axios from "axios";
import api from "../../../../../../services/api";

/**
 * Service centralisé pour les requêtes API liées aux catégories.
 * Compatible avec ton backend Laravel (routes /categories/... et /cat/...).
 */
const categoryService = {
  /* ==========================================================
     🔹 CRUD CLASSIQUE
  ========================================================== */

  // Récupérer toutes les catégories
  getAllCategories: async () => {
    const response = await api.get("/categories");
    console.log(response);
    
    return response;
  },

  // Récupérer une catégorie spécifique
  getCategory: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response;
  },

  // Créer une catégorie
  createCategory: async (data) => {
    try {
      const response = await api.post("/categories", data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Mettre à jour une catégorie
  updateCategory: async (id, data) => {
    try {
      const response = await api.put(`/categories/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Supprimer (soft delete → corbeille)
  deleteCategory: async (id) => {
    try {
      const response = await api.delete(`/categories/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /* ==========================================================
     🔹 GESTION DE LA CORBEILLE - CORRIGÉ
  ========================================================== */

  getTrashedCategories: async (perPage = 24, search = "", page = 1) => {
    try {
      const response = await api.get(`/cat/trashed`, {
        params: { 
          per_page: perPage, 
          page: page,
          q: search 
        },
      });
      return response; // ← Retourne la réponse complète, pas seulement data
    } catch (error) {
      console.error("Erreur fetch corbeille :", error);
      throw error;
    }
  },

  restoreCategory: async (id) => {
    try {
      const response = await api.post(`/cat/${id}/restore`);
      return response.data;
    } catch (error) {
      console.error("Erreur restauration :", error);
      throw error;
    }
  },

  forceDeleteCategory: async (id) => {
    try {
      const response = await api.delete(`/cat/${id}/force`);
      return response.data;
    } catch (error) {
      console.error("Erreur suppression définitive :", error);
      throw error;
    }
  },
};

/* ==========================================================
   🔹 Recherche + pagination avancée - CORRIGÉ
========================================================== */

export const fetchIndex2 = async (params = {}, signal = null) => {
  try {
    const config = {
      params: {
        per_page: params.per_page || 12,
        page: params.page || 1,
        q: params.q || ""
      },
      signal,
    };
    const response = await axios.get("/categories/categorieAdvance", config);
    return response.data; // on reçoit { data: [...], meta: {...} }
    console.log(response);
    
  } catch (error) {
    console.error("Erreur fetchIndex2 :", error);
    throw error;
  }
};




export default categoryService;