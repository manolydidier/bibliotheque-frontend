import { useState, useEffect, useMemo } from 'react';
import ArticleLibrary from '../media-library/index';
import axios from 'axios';

function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });

    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('tokenGuard');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    return instance;
  }, []);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get('/articles');
        if (!res.data || !res.data.data) throw new Error('Format de réponse invalide');
        setArticles(res.data.data || []);
      } catch (err) {
        console.error('Erreur lors du chargement:', err);
        setError(err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [axiosInstance]);

  // Requête “serveur” avec filtres/tri/facettes
  const fetchArticlesWithFilters = async ({ page, perPage, search, filters, sort }) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        search: search || '',
        include_facets: '1',
        facet_fields: 'categories,tags,authors',
      });

      // Catégories (IDs si possible)
      if (filters.categories?.length) {
        const areIds = filters.categories.some((v) => Number.isInteger(v));
        params.append(areIds ? 'category_ids' : 'categories', filters.categories.join(','));
      }

      // Tags (IDs si possible)
      if (filters.tags?.length) {
        const areIds = filters.tags.some((v) => Number.isInteger(v));
        params.append(areIds ? 'tag_ids' : 'tags', filters.tags.join(','));
      }

      // Auteurs (IDs)
      if (filters.authors?.length) {
        const ids = filters.authors.filter((v) => Number.isInteger(v));
        if (ids.length) params.append('author_ids', ids.join(','));
      }

      if (filters.featuredOnly) params.append('featured', '1');
      if (filters.stickyOnly)  params.append('sticky', '1');
      if (filters.dateFrom)    params.append('date_from', filters.dateFrom);
      if (filters.dateTo)      params.append('date_to', filters.dateTo);
      if (filters.ratingMin > 0) params.append('rating_min', String(filters.ratingMin));
      if (filters.ratingMax < 5) params.append('rating_max', String(filters.ratingMax));

      if (sort?.length) {
        params.append('sort', sort.map((s) => `${s.key},${s.dir}`).join(';'));
      }

      const res = await axiosInstance.get(`/articles?${params.toString()}`);
      if (!res.data || !res.data.data) throw new Error('Format de réponse invalide');

      return {
        data: res.data.data || [],
        total: res.data.meta?.total || res.data.total || 0,
        facets: res.data.meta?.facets || null,
      };
    } catch (err) {
      console.error('Erreur lors du filtrage:', err);
      return { data: [], total: 0, facets: null };
    }
  };

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
        defaultLoadMode="pagination"
        perPageOptions={[12, 24, 48, 96]}
      />
    </div>
  );
}

export default ArticlesPage;
