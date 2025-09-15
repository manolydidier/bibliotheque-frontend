import { useState, useEffect, useCallback } from 'react';

import {articleService, articleFormatter} from '../services/articleService';

/**
 * Hook pour la gestion des articles avec toutes les opérations CRUD
 */
export const useArticles = (initialFilters = {}) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [facets, setFacets] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchArticles = useCallback(async (customFilters = null) => {
    const currentFilters = customFilters !== null ? customFilters : filters;
    
    setLoading(true);
    setError(null);

    try {
      const response = await articleService.getArticles(currentFilters);
      setArticles(response.data);
      setPagination(response.meta);
      setFacets(response.meta?.facets || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createArticle = useCallback(async (articleData) => {
    setLoading(true);
    setError(null);

    try {
      const formattedData = articleFormatter.formatForApi(articleData);
      const response = await articleService.createArticle(formattedData);
      
      // Recharger la liste après création
      await fetchArticles();
      
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchArticles]);

  const updateArticle = useCallback(async (id, articleData) => {
    setLoading(true);
    setError(null);

    try {
      const formattedData = articleFormatter.formatForApi(articleData);
      const response = await articleService.updateArticle(id, formattedData);
      
      // Mettre à jour la liste localement
      setArticles(prev => prev.map(article => 
        article.id === id ? response.data : article
      ));
      
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteArticle = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      await articleService.deleteArticle(id);
      
      // Mettre à jour la liste localement
      setArticles(prev => prev.filter(article => article.id !== id));
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const changePage = useCallback((page) => {
    updateFilters({ page });
  }, [updateFilters]);

  const changePerPage = useCallback((perPage) => {
    updateFilters({ per_page: perPage, page: 1 });
  }, [updateFilters]);

  // Chargement initial
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return {
    // Données
    articles,
    loading,
    error,
    pagination,
    facets,
    filters,
    
    // Actions CRUD
    fetchArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    
    // Actions de filtrage
    updateFilters,
    resetFilters,
    changePage,
    changePerPage,
    
    // États dérivés
    hasNextPage: pagination ? pagination.current_page < pagination.last_page : false,
    hasPrevPage: pagination ? pagination.current_page > 1 : false,
    totalItems: pagination?.total || 0,
    currentPage: pagination?.current_page || 1
  };
};

/**
 * Hook pour la gestion d'un article unique avec CRUD
 */
export const useArticle = (idOrSlug = null, initialParams = {}) => {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetchArticle = useCallback(async (customParams = null) => {
    if (!idOrSlug) return;
    
    const currentParams = customParams !== null ? customParams : params;
    
    setLoading(true);
    setError(null);

    try {
      const response = await articleService.getArticle(idOrSlug, currentParams);
      setArticle(articleFormatter.parseFromApi(response.data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [idOrSlug, params]);

  const createArticle = useCallback(async (articleData) => {
    setLoading(true);
    setError(null);

    try {
      const formattedData = articleFormatter.formatForApi(articleData);
      const response = await articleService.createArticle(formattedData);
      setArticle(articleFormatter.parseFromApi(response.data));
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateArticle = useCallback(async (articleData) => {
    if (!article?.id) throw new Error('No article to update');
    
    setLoading(true);
    setError(null);

    try {
      const formattedData = articleFormatter.formatForApi(articleData);
      const response = await articleService.updateArticle(article.id, formattedData);
      setArticle(articleFormatter.parseFromApi(response.data));
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [article]);

  const deleteArticle = useCallback(async () => {
    if (!article?.id) throw new Error('No article to delete');
    
    setLoading(true);
    setError(null);

    try {
      await articleService.deleteArticle(article.id);
      setArticle(null);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [article]);

  const updateParams = useCallback((newParams) => {
    setParams(prev => ({ ...prev, ...newParams }));
  }, []);

  useEffect(() => {
    if (idOrSlug) {
      fetchArticle();
    }
  }, [idOrSlug, fetchArticle]);

  return {
    article,
    loading,
    error,
    params,
    fetchArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    updateParams
  };
};

/**
 * Hook pour la création d'article avec gestion d'état
 */
export const useArticleForm = (initialData = {}) => {
  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setError(null);
    setSuccess(false);
  }, [initialData]);

  const submit = useCallback(async (submitData = null) => {
    const dataToSubmit = submitData || formData;
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formattedData = articleFormatter.formatForApi(dataToSubmit);
      const response = await articleService.createArticle(formattedData);
      
      setSuccess(true);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [formData]);

  return {
    formData,
    loading,
    error,
    success,
    updateFormData,
    resetForm,
    submit
  };
};