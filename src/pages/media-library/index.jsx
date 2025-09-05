import { useEffect, useMemo, useRef, useState } from "react";
import { FaSync } from "react-icons/fa";
import FiltersPanel from "./parts/FiltersPanel";
import GridCard from "./parts/GridCard";
import ListTable from "./parts/ListTable";
import Pagination from "./parts/Pagination";
import { useDebouncedValue } from "./shared/hooks/useDebouncedValue";
import { parseSearch } from "./shared/utils/query";
import { getStore } from "./shared/store/prefs";
import { formatBytes } from "./shared/utils/format";
import { isFav, isRead } from "./shared/store/markers";

const PREF_KEY = "articlelib:prefs";

export default function ArticleLibrary({
  articles, // tableau d'articles
  fetchArticles, // async ({ page, perPage, search, filters, sort }) => { data, total }
  routeBase = "/articles",
  initialView = "grid",
  defaultLoadMode = "pagination",
  perPageOptions = [12, 24, 48, 96],
}) {
  const persisted = getStore(PREF_KEY, {});

  const [view, setView] = useState(persisted.view || initialView);
  const [perPage, setPerPage] = useState(persisted.perPage || perPageOptions[0]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(
    persisted.filters || {
      categories: [],
      tags: [],
      authors: [],
      featuredOnly: false,
      unreadOnly: false,
      dateFrom: "",
      dateTo: "",
      ratingMin: 0,
      ratingMax: 5,
    }
  );
  const [sort, setSort] = useState([{ key: "published_at", dir: "desc" }]);
  const [loadMode, setLoadMode] = useState(persisted.loadMode || defaultLoadMode);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Auteurs (à partir des données d'articles)
  const authorsOptions = useMemo(() => {
    return Array.from(new Set(articles.map(article => article.author?.name || "Auteur inconnu"))).sort();
  }, [articles]);

  // Catégories (à partir des données d'articles)
  const categoriesOptions = useMemo(() => {
    return Array.from(new Set(articles.flatMap(article => 
      article.categories.map(cat => cat.name)
    ))).sort();
  }, [articles]);

  // Tags (à partir des données d'articles)
  const tagsOptions = useMemo(() => {
    return Array.from(new Set(articles.flatMap(article => 
      article.tags.map(tag => tag.name)
    ))).sort();
  }, [articles]);

  // Export CSV de la vue courante
  useEffect(() => {
    const handler = () => {
      if (!rows?.length) return;
      const headers = [
        "id",
        "title",
        "author",
        "categories",
        "tags",
        "published_at",
        "view_count",
        "share_count",
        "comment_count",
        "rating_average",
        "reading_time",
        "word_count",
        "is_featured",
        "is_sticky",
        "favorite",
        "read",
      ];
      const esc = (v) => `"${String(v ?? "").replace(/\"/g, '""')}"`;
      const body = rows
        .map((r) =>
          [
            r.id,
            r.title,
            r.author?.name,
            r.categories.map(c => c.name).join("|"),
            r.tags.map(t => t.name).join("|"),
            r.published_at,
            r.view_count,
            r.share_count,
            r.comment_count,
            r.rating_average,
            r.reading_time,
            r.word_count,
            r.is_featured,
            r.is_sticky,
            isFav(r.id),
            isRead(r.id),
          ]
            .map(esc)
            .join(",")
        )
        .join("\n");
      const csv = headers.map(esc).join(",") + "\n" + body;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `articles_export_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
    window.addEventListener("articlelib:export", handler);
    return () => window.removeEventListener("articlelib:export", handler);
  }, [rows]);

  // Chargement des données
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (fetchArticles) {
          const { data, total } = await fetchArticles({
            page,
            perPage,
            search: debouncedSearch,
            filters,
            sort,
          });
          if (cancelled) return;
          setRows(data);
          setTotal(total);
        } else {
          // Mode client: filtrage/tri/pagination côté front
          const src = articles || [];
          const { tokens, q } = parseSearch(debouncedSearch);
          let filtered = src.filter((r) => {
            if (!q) return true;
            const s = q.toLowerCase();
            return (
              r.title.toLowerCase().includes(s) ||
              r.excerpt.toLowerCase().includes(s) ||
              (r.author?.name || "").toLowerCase().includes(s) ||
              r.categories.some(c => c.name.toLowerCase().includes(s)) ||
              r.tags.some(t => t.name.toLowerCase().includes(s))
            );
          });
          
          // Filtrage par tokens de recherche
          tokens.forEach((t) => {
            if (t.k === "author") filtered = filtered.filter((r) => (r.author?.name || "").toLowerCase().includes(t.v.toLowerCase()));
            if (t.k === "category") filtered = filtered.filter((r) => r.categories.some(c => c.name.toLowerCase() === t.v.toLowerCase()));
            if (t.k === "tag") filtered = filtered.filter((r) => r.tags.some(tag => tag.name.toLowerCase() === t.v.toLowerCase()));
            if (t.k === "before") filtered = filtered.filter((r) => new Date(r.published_at) <= new Date(t.v));
            if (t.k === "after") filtered = filtered.filter((r) => new Date(r.published_at) >= new Date(t.v));
            if (t.k === "rating") filtered = filtered.filter((r) => (t.op === ">" ? r.rating_average > t.v : r.rating_average < t.v));
          });
          
          // Filtrage par filtres sélectionnés
          if (filters.categories.length) filtered = filtered.filter((r) => 
            r.categories.some(c => filters.categories.includes(c.name))
          );
          if (filters.tags.length) filtered = filtered.filter((r) => 
            r.tags.some(t => filters.tags.includes(t.name))
          );
          if (filters.authors.length) filtered = filtered.filter((r) => 
            filters.authors.includes(r.author?.name || "")
          );
          if (filters.featuredOnly) filtered = filtered.filter((r) => r.is_featured);
          if (filters.unreadOnly) filtered = filtered.filter((r) => !isRead(r.id));
          if (filters.dateFrom) filtered = filtered.filter((r) => new Date(r.published_at) >= new Date(filters.dateFrom));
          if (filters.dateTo) filtered = filtered.filter((r) => new Date(r.published_at) <= new Date(filters.dateTo));
          if (filters.ratingMin) filtered = filtered.filter((r) => r.rating_average >= filters.ratingMin);
          if (filters.ratingMax) filtered = filtered.filter((r) => r.rating_average <= filters.ratingMax);

          // Tri
          if (sort?.length) {
            filtered.sort((a, b) => {
              for (const { key, dir } of sort) {
                let va = a[key];
                let vb = b[key];
                
                // Gestion des valeurs imbriquées
                if (key === "author") {
                  va = a.author?.name;
                  vb = b.author?.name;
                }
                
                if (va == null && vb == null) continue;
                if (va == null) return dir === "asc" ? -1 : 1;
                if (vb == null) return dir === "asc" ? 1 : -1;
                if (va < vb) return dir === "asc" ? -1 : 1;
                if (va > vb) return dir === "asc" ? 1 : -1;
              }
              return 0;
            });
          }
          
          const total = filtered.length;
          const start = (page - 1) * perPage;
          const data = filtered.slice(start, start + perPage);
          setRows(data);
          setTotal(total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, perPage, debouncedSearch, filters, sort, articles, fetchArticles]);

  // Persistance préférences
  useEffect(() => {
    localStorage.setItem(
      PREF_KEY,
      JSON.stringify({ view, perPage, filters, loadMode })
    );
  }, [view, perPage, filters, loadMode]);

  // Reset page lorsque critères changent
  useEffect(() => setPage(1), [debouncedSearch, filters, perPage]);

  // Défilement infini
  const sentinelRef = useRef(null);
  const [infiniteRows, setInfiniteRows] = useState([]);
  useEffect(() => {
    if (loadMode !== "infinite") return;
    setInfiniteRows([]);
  }, [debouncedSearch, filters, sort, perPage, loadMode]);

  useEffect(() => {
    if (loadMode !== "infinite") return;
    setInfiniteRows((prev) => {
      const ids = new Set(prev.map((x) => x.id));
      return [...prev, ...rows.filter((x) => !ids.has(x.id))];
    });
  }, [rows, loadMode]);

  useEffect(() => {
    if (loadMode !== "infinite") return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !loading) {
          const maxPages = Math.ceil(total / perPage);
          if (page < maxPages) setPage(page + 1);
        }
      });
    }, { threshold: 1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [sentinelRef, page, perPage, total, loading, loadMode]);

  const viewRows = loadMode === "infinite" ? infiniteRows : rows;

  return (
    <div className="p-4 md:p-6 mt-8 w-full max-w-[1600px] mx-auto flex flex-col gap-6 ">
      <FiltersPanel
        open={filtersOpen}
        setOpen={setFiltersOpen}
        search={search}
        setSearch={setSearch}
        filters={filters}
        setFilters={setFilters}
        view={view}
        setView={setView}
        perPage={perPage}
        setPerPage={setPerPage}
        loadMode={loadMode}
        setLoadMode={setLoadMode}
        authorsOptions={authorsOptions}
        categoriesOptions={categoriesOptions}
        tagsOptions={tagsOptions}
      />

      {loading && viewRows.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-slate-600">Chargement…</div>
      ) : view === "grid" ? (
        <div className="grid gap-6" style={{ 
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gridAutoRows: 'max-content'
        }}>
          {viewRows.map((article) => (
            <GridCard key={article.id} item={article} routeBase={routeBase} />
          ))}
        </div>
      ) : (
        <ListTable rows={viewRows} sort={sort} setSort={setSort} routeBase={routeBase} />
      )}

      {loadMode === "pagination" ? (
        <Pagination page={page} perPage={perPage} total={total} onChange={setPage} />
      ) : (
        <div ref={sentinelRef} className="h-12 flex items-center justify-center text-slate-500 select-none">
          {viewRows.length < total ? "Chargement automatique…" : "Fin des résultats"}
        </div>
      )}

      <div className="mt-6 text-xs text-slate-500 hidden">
        {viewRows.length} articles affichés
      </div>
    </div>
  );
}