// src/pages/ArticlesPage.jsx
import { useState, useEffect } from 'react';
import ArticleLibrary from '../media-library/index';

function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/articles');
        if (!response.ok) throw new Error('Erreur de chargement');
        const data = await response.json();
        
        // Adaptation pour le format de réponse Laravel
        // Votre API semble renvoyer { data: [...], meta: {...}, links: {...} }
        setArticles(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const fetchArticlesWithFilters = async ({ page, perPage, search, filters, sort }) => {
    try {
      // Construction des paramètres de requête adaptés à Laravel
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(), // Laravel utilise souvent per_page au lieu de perPage
        search: search || '',
      });

      // Ajout des filtres
      if (filters.categories.length) {
        params.append('categories', filters.categories.join(','));
      }
      if (filters.tags.length) {
        params.append('tags', filters.tags.join(','));
      }
      if (filters.authors.length) {
        params.append('authors', filters.authors.join(','));
      }
      if (filters.featuredOnly) {
        params.append('featured', '1');
      }
      if (filters.dateFrom) {
        params.append('date_from', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('date_to', filters.dateTo);
      }
      if (filters.ratingMin > 0) {
        params.append('rating_min', filters.ratingMin.toString());
      }
      if (filters.ratingMax < 5) {
        params.append('rating_max', filters.ratingMax.toString());
      }

      // Ajout du tri
      if (sort.length) {
        params.append('sort', sort.map(s => `${s.key},${s.dir}`).join(';'));
      }

      const response = await fetch(`/api/articles?${params}`);
      if (!response.ok) throw new Error('Erreur de filtrage');
      
      const data = await response.json();
      
      return {
        data: data.data || [],
        total: data.meta?.total || data.total || 0
      };
    } catch (error) {
      console.error('Erreur:', error);
      return { data: [], total: 0 };
    }
  };

  if (loading) return <div className="text-center py-12">Chargement...</div>;
  if (error) return <div className="text-center py-12 text-red-600">Erreur: {error}</div>;

  return (
    <ArticleLibrary 
      articles={articles}
      fetchArticles={fetchArticlesWithFilters}
      routeBase="/articles"
      initialView="grid"
      defaultLoadMode="pagination"
    />
  );
}

export default ArticlesPage;