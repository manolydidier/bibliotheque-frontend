import { useState, useEffect, useCallback } from 'react';
import { tagService, fetchIndex2} from '../services/tagService';

export const useTags = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true); // Mettre à true initialement car on fetch au montage
  const [error, setError] = useState(null);

  // Charger tous les tags
  const fetchTags = useCallback(async () => {
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
  }, []);

  // Créer un tag
  const createTag = useCallback(async (tagData) => {
    try {
      setLoading(true);
      const response = await tagService.createTag(tagData);
      setError(null);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.errors || 'Erreur lors de la création';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour un tag
  const updateTag = useCallback(async (id, tagData) => {
    try {
      setLoading(true);
      const response = await tagService.updateTag(id, tagData);
      // La mise à jour locale est supprimée car elle est gérée par un re-fetch dans le composant.
      setError(null);      
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.errors || 'Erreur lors de la mise à jour';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  },[]);

  // Supprimer un tag
  const deleteTag = useCallback(async (id) => {
    try {
      setLoading(true);
      await tagService.deleteTag(id);
      // La mise à jour locale est supprimée.
      setError(null);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  }, []);

  //Charger un tag
  const getOneTag = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await tagService.getTag(id);
      setError(null);
      return response.data;
    } catch (err){
      const errorMsg = err.response?.data?.message || 'Erreur lors de la recherche';
      setError(errorMsg);
      throw errorMsg;
    }finally {
      setLoading(false);
    }
  }, []);

  const researchTag = useCallback((searchTerm) => {
    if (!searchTerm) return tags;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(lowerCaseSearchTerm) || 
      (tag.description && tag.description.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [tags]);
 

 const [totalTags, setTotalTags]= useState(0)
  const [pageNbr, setPageNbr]= useState(1)


  const loadTags = useCallback(async (search,page) => {
    try {
      setLoading(true);
      const data = await fetchIndex2({ q: search, perPage: 5, page });
      setTags(data.data);       
      setTotalTags(data.total)
      setPageNbr(data.last_page)
    } catch (err) {
      console.error(err);      
    }
    setLoading(false);
  },[]);

  


  // useEffect(() => {
  //   fetchTags();
  // }, [fetchTags]);

  useEffect(()=>{
    loadTags();
  },[loadTags])
  

  return {
    tags,
    loading,
    error,
    totalTags,
    pageNbr,
    fetchTags,
    getOneTag,
    createTag,
    updateTag,
    deleteTag,
    researchTag,
    loadTags
  };
};