// ------------------------------
// File: src/pages/ArticlesPage.jsx
// - Charge la liste initiale d’articles (affichage rapide)
// - Fournit fetchArticlesWithFilters au composant ArticleLibrary
// - Normalise toujours "filters" via le module partagé
// ------------------------------
import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";

import ArticleLibrary from "./index"; // adapte si besoin
import { toSafeFilters } from "../media-library/shared/filters";

/** Test “entier-like” (ex: 12 ou "12") */
const isIntegerLike = (v) => {
  if (Number.isInteger(v)) return true;
  if (typeof v === "string" && v.trim() !== "" && Number.isInteger(Number(v))) return true;
  return false;
};

/** Sépare un tableau de valeurs en IDs numériques et NOMS/SLUGS (strings) */
function splitIdsAndNames(arr = []) {
  const ids = [];
  const names = [];
  for (const v of arr) {
    if (isIntegerLike(v)) ids.push(String(parseInt(v, 10)));
    else if (v != null && String(v).trim() !== "") names.push(String(v).trim());
  }
  return { ids, names };
}

function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem("tokenGuard");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    return instance;
  }, []);

  // Chargement initial simple (liste brute)
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/articles");
        console.log(res);

        const payload = res?.data || {};
        const list = payload.data || payload || [];
        if (!Array.isArray(list)) throw new Error("Format de réponse invalide");
        setArticles(list);
      } catch (err) {
        console.error("Erreur lors du chargement:", err);
        setError(err?.message || "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [axiosInstance]);

  // Requête “serveur” avec filtres/tri/facettes — robuste
  const fetchArticlesWithFilters = useCallback(
    async ({ page, perPage, search, filters, sort }) => {
      try {
        const f = toSafeFilters(filters); // ← via module partagé

        // Construit les paramètres selon ton contrôleur Laravel
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(perPage),
          include_facets: "1",
          facet_fields: "categories,tags,authors",
        });

        if (search && String(search).trim() !== "") {
          params.set("search", String(search).trim());
        }

        // Catégories : autorise mélange IDs / noms
        if (f.categories.length) {
          const { ids: catIds, names: catNames } = splitIdsAndNames(f.categories);
          if (catIds.length) params.append("category_ids", catIds.join(","));
          if (catNames.length) params.append("categories", catNames.join(","));
        }

        // Tags : autorise mélange IDs / noms
        if (f.tags.length) {
          const { ids: tagIds, names: tagNames } = splitIdsAndNames(f.tags);
          if (tagIds.length) params.append("tag_ids", tagIds.join(","));
          if (tagNames.length) params.append("tags", tagNames.join(","));
        }

        // Auteurs : le contrôleur accepte surtout des IDs (author_id / author_ids)
        if (f.authors.length) {
          const { ids: authorIds } = splitIdsAndNames(f.authors);
          if (authorIds.length) params.append("author_ids", authorIds.join(","));
          // (si tu veux supporter des noms côté back, il faudra adapter le contrôleur)
        }

        // Flags & bornes
        if (f.featuredOnly) params.append("featured", "1");
        if (f.stickyOnly)  params.append("sticky", "1");
        if (f.dateFrom)    params.append("date_from", f.dateFrom);
        if (f.dateTo)      params.append("date_to", f.dateTo);
        if (f.ratingMin > 0) params.append("rating_min", String(f.ratingMin));
        if (f.ratingMax < 5) params.append("rating_max", String(f.ratingMax));

        // Tri multi-colonnes
        if (Array.isArray(sort) && sort.length) {
          params.append(
            "sort",
            sort.map((s) => `${s.key},${s.dir}`).join(";")
          );
        }

        const res = await axiosInstance.get(`/articles?${params.toString()}`);
        const payload = res?.data || {};

        // format attendu: { data: [...], meta: { total, facets } } ou { data: [...], total, facets }
        return {
          data: payload.data || [],
          total: payload.meta?.total ?? payload.total ?? 0,
          facets: payload.meta?.facets ?? payload.facets ?? null,
        };
      } catch (err) {
        console.error("Erreur lors du filtrage:", err);
        return { data: [], total: 0, facets: null };
      }
    },
    [axiosInstance]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des articles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-red-800 mb-2">Erreur de chargement</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <ArticleLibrary
        articles={articles}
        fetchArticles={fetchArticlesWithFilters}
        routeBase="/articles"
        initialView="grid"
        defaultLoadMode="pagination"  // tu peux mettre "infinite" si tu veux le mode infini par défaut
        perPageOptions={[12, 24, 48, 96]}
      />
      
    </div>
  );
}

export default ArticlesPage;
