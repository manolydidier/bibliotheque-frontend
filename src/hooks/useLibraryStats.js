// src/hooks/useLibraryStats.js
import { useState, useEffect, useCallback } from "react";
// ⚠️ Si tu as une instance axios centralisée, importe-la ici à la place :
import axios from "axios";

axios.defaults.baseURL = axios.defaults.baseURL || "/api";
axios.defaults.withCredentials = true;

// 💡 Si tu as déjà mis les intercepteurs ailleurs, tu peux supprimer ce bloc
axios.interceptors.request.use((config) => {
  const t =
    typeof window !== "undefined" ? localStorage.getItem("tokenGuard") : null;
  if (t && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  config.headers = { ...(config.headers || {}), "Cache-Control": "no-cache" };
  return config;
});

const PAGE_SIZE = 100;

// même logique que dans Dashboard pour normaliser la pagination Laravel
const normalizeList = (payload, fallbackPerPage = 24) => {
  const p0 = payload || {};
  const p =
    p0.data &&
    !Array.isArray(p0.data) &&
    (Array.isArray(p0.data.data) || p0.data.current_page !== undefined)
      ? p0.data
      : p0;

  const items =
    (Array.isArray(p?.data) ? p.data : null) ??
    (Array.isArray(p?.items) ? p.items : null) ??
    (Array.isArray(p0) ? p0 : []);

  const rawMeta = p?.meta && typeof p.meta === "object" ? p.meta : p || {};
  const perPage =
    Number(rawMeta.per_page ?? p.per_page ?? fallbackPerPage) ||
    fallbackPerPage;
  const currentPage =
    Number(rawMeta.current_page ?? p.current_page ?? p.page ?? 1) || 1;
  const lastPage = Number(rawMeta.last_page ?? p.last_page ?? 1) || 1;

  const links = p?.links && typeof p.links === "object" ? p.links : {};
  const hasNext = Boolean(links?.next) || currentPage < lastPage;

  return {
    items,
    meta: {
      per_page: perPage,
      current_page: currentPage,
      last_page: lastPage,
      has_next: hasNext,
    },
  };
};

export default function useLibraryStats() {
  const [loading, setLoading] = useState(true);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [filesTotal, setFilesTotal] = useState(0);
  const [downloadsTotal, setDownloadsTotal] = useState(0);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // 1) Total articles (comme dans fetchArticlesCount)
      const articlesCount = await axios
        .get("/stats/articles-count")
        .then((r) => Number(r?.data?.count || 0))
        .catch(() => 0);
      setArticlesTotal(articlesCount);

      // 2) Tous les fichiers (comme fetchAllFiles mais simplifié)
      let page = 1;
      let all = [];
      let hasNext = true;

      while (hasNext && all.length < 1000) {
        const { data } = await axios.get("/article-media", {
          params: { per_page: PAGE_SIZE, page },
        });
        const { items, meta } = normalizeList(data, PAGE_SIZE);
        all = [...all, ...(items || [])];
        hasNext = Boolean(meta?.has_next) && page < (meta?.last_page || page);
        page += 1;
      }

      const mapped = all.map((f) => {
        const downloads = Number(f.download_count || f.downloads || 0);
        return { id: f.id, downloads };
      });

      const totalDownloads = mapped.reduce(
        (sum, f) => sum + f.downloads,
        0
      );

      setFilesTotal(mapped.length);
      setDownloadsTotal(totalDownloads);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les statistiques");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    loading,
    error,
    articlesTotal,
    filesTotal,
    downloadsTotal,
    reload: loadStats,
  };
}
