import { useState, useEffect, useCallback } from 'react';
import categoryService from '../services/categoryService';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Charger toutes les catégories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAllCategories();
      setCategories(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors du chargement des catégories';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger une catégorie spécifique
  const fetchCategory = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await categoryService.getCategory(id);
      setSelectedCategory(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors du chargement de la catégorie';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  }, []);

  // Créer une catégorie
  const createCategory = async (categoryData) => {
    try {
      setLoading(true);
      const response = await categoryService.createCategory(categoryData);
      setCategories(prev => [...prev, response.data]);
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.errors || err.response?.data?.message || 'Erreur lors de la création';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour une catégorie
  const updateCategory = async (id, categoryData) => {
    try {
      setLoading(true);
      const response = await categoryService.updateCategory(id, categoryData);
      setCategories(prev => prev.map(category => 
        category.id === parseInt(id) ? response.data : category
      ));
      if (selectedCategory && selectedCategory.id === parseInt(id)) {
        setSelectedCategory(response.data);
      }
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.errors || err.response?.data?.message || 'Erreur lors de la mise à jour';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une catégorie
  const deleteCategory = async (id) => {
    try {
      setLoading(true);
      await categoryService.deleteCategory(id);
      setCategories(prev => prev.filter(category => category.id !== parseInt(id)));
      if (selectedCategory && selectedCategory.id === parseInt(id)) {
        setSelectedCategory(null);
      }
      setError(null);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  };

  // Recherche locale (côté client)
  const searchCategoriesLocal = (searchTerm) => {
    if (!searchTerm) return categories;
    
    return categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Réinitialiser les erreurs
  const clearError = () => setError(null);

  // Charger les catégories au montage
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    selectedCategory,
    loading,
    error,
    fetchCategories,
    fetchCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    searchCategoriesLocal, // Recherche côté client
    clearError,
    setSelectedCategory,
  };
};