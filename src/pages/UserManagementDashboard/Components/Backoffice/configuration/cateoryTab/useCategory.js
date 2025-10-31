import { useState, useEffect, useCallback } from "react";
import { fetchIndex2 } from "./categoryService";
import categoryService from "./categoryService";

/**
 * Hook centralisé pour la gestion des catégories
 * CRUD + Corbeille + Restauration + Suppression définitive
 * Compatible avec CategoryIndex.jsx
 */
export const useCategories = () => {
  const [categories, setCategories] = useState([]);         // ✅ toujours un tableau
  const [trashList, setTrashList] = useState([]);           // ✅ catégories supprimées
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [totalCategori, setTotalCategori] = useState(0);
  const [pageNbr, setPageNbr] = useState(1);

  /* ==========================================================
     🔹 CRUD CLASSIQUE
  ========================================================== */

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAllCategories();
      const safeData = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      setCategories(safeData);
      setError(null);
      setFieldErrors({});
      return safeData;
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Erreur lors du chargement des catégories";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategory = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await categoryService.getCategory(id);
      setSelectedCategory(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Erreur lors du chargement de la catégorie";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (categoryData) => {
    try {
      setLoading(true);
      const response = await categoryService.createCategory(categoryData);
      setCategories((prev) => [...prev, response.data]);
      setError(null);
      setFieldErrors({});
      return response.data;
    } catch (err) {
      // ✅ On propage TOUTE la réponse 422 (avec toutes les erreurs par champ)
      if (err?.response?.status === 422 && err?.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);      // toutes les erreurs
        setError(err.response?.data?.message || "Erreur de validation.");
        throw err; // ⬅ IMPORTANT: on relance l'erreur originale (et pas un new Error)
      }
      const msg =
        err?.response?.data?.message ||
        "Impossible de communiquer avec le serveur.";
      setError(msg);
      setFieldErrors({});
      throw err; // ⬅ relancer l'original pour laisser le composant décider
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCategory = useCallback(async (id, data) => {
    try {
      setLoading(true);
      const response = await categoryService.updateCategory(id, data);
      setCategories((prev) =>
        prev.map((c) => (c.id === parseInt(id) ? response.data : c))
      );
      setError(null);
      setFieldErrors({});
      return response.data;
    } catch (err) {
      // ✅ Gèrer aussi 422 ici (mêmes règles que create)
      if (err?.response?.status === 422 && err?.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
        setError(err.response?.data?.message || "Erreur de validation.");
        throw err; // ⬅ relance l’erreur originale
      }
      const msg =
        err?.response?.data?.message || "Erreur lors de la mise à jour.";
      setError(msg);
      setFieldErrors({});
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCategory = useCallback(async (id) => {
    try {
      setLoading(true);
      await categoryService.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== parseInt(id)));
      setError(null);
      setFieldErrors({});
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Erreur lors de la suppression.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /* ==========================================================
     🔹 CORBEILLE
  ========================================================== */

  const loadTrashedCategories = useCallback(
    async (perPage = 10, search = "") => {
      try {
        setLoading(true);
        const response = await categoryService.getTrashedCategories(perPage, search);
        const safe =
          Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.data)
            ? response.data.data
            : [];
        setTrashList(safe);
        setError(null);
        setFieldErrors({});
        return safe;
      } catch (err) {
        console.error("Erreur lors du chargement de la corbeille :", err);
        setError("Erreur lors du chargement des catégories supprimées");
        setTrashList([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const restoreCategory = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await categoryService.restoreCategory(id);
      setTrashList((prev) => prev.filter((c) => c.id !== id));
      await fetchCategories();
      return response;
    } catch (err) {
      console.error("Erreur lors de la restauration :", err);
      setError("Erreur lors de la restauration");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  const forceDeleteCategory = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await categoryService.forceDeleteCategory(id);
      setTrashList((prev) => prev.filter((c) => c.id !== id));
      return response;
    } catch (err) {
      console.error("Erreur suppression définitive :", err);
      setError("Erreur lors de la suppression définitive");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /* ==========================================================
     🔹 RECHERCHE + PAGINATION
  ========================================================== */

  const loadCategories = useCallback(async (search = "", page = 1, perPage = 24) => {
    try {
      setLoading(true);

      const res = await fetchIndex2({ q: search, per_page: perPage, page });

      const safeData = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];

      const meta = res?.meta || {};

      setCategories(safeData);
      setTotalCategori(meta.total || safeData.length || 0);
      setPageNbr(meta.last_page || 1);

      setError(null);
      setFieldErrors({});
    } catch (err) {
      console.error("Erreur loadCategories:", err);
      setCategories([]);
      setError("Erreur lors du chargement des catégories");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ==========================================================
     🔹 UTILITAIRES
  ========================================================== */
  const clearError = () => {
    setError(null);
    setFieldErrors({});
  };

  /* ==========================================================
     🔹 EXPORT DU HOOK
  ========================================================== */
  return {
    categories,
    trashList,
    selectedCategory,
    loading,
    error,
    fieldErrors,
    pageNbr,
    totalCategori,
    fetchCategories,
    fetchCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    loadCategories,
    loadTrashedCategories,
    restoreCategory,
    forceDeleteCategory,
    clearError,
    setSelectedCategory,
  };
};
