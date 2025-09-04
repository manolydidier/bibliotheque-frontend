import { useState, useEffect } from 'react';
import { tagService } from '../services/tagService';

export const useTags = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger tous les tags
  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await tagService.getAllTags();
      setTags(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des tags');
    } finally {
      setLoading(false);
    }
  };

  // Créer un tag
  const createTag = async (tagData) => {
    try {
      setLoading(true);
      const response = await tagService.createTag(tagData);
      setTags(prev => [...prev, response.data]);
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.errors || 'Erreur lors de la création';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour un tag
  const updateTag = async (id, tagData) => {
    try {
      setLoading(true);
      const response = await tagService.updateTag(id, tagData);
      setTags(prev => prev.map(tag => 
        tag.id === parseInt(id) ? response.data : tag
      ));
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.errors || 'Erreur lors de la mise à jour';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un tag
  const deleteTag = async (id) => {
    try {
      setLoading(true);
      await tagService.deleteTag(id);
      setTags(prev => prev.filter(tag => tag.id !== parseInt(id)));
      setError(null);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
  };
};