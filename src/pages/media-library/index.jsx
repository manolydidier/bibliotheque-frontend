import { useEffect, useMemo, useRef, useState } from "react";
import FiltersPanel from "./parts/FiltersPanel";
import GridCard from "./parts/GridCard";
import ListTable from "./parts/ListTable";
import Pagination from "./parts/Pagination";
import { useDebouncedValue } from "./shared/hooks/useDebouncedValue";
import { parseSearch } from "./shared/utils/query";
import { getStore } from "./shared/store/prefs";
import { isFav, isRead } from "./shared/store/markers";

const PREF_KEY = "articlelib:prefs";

function getCategoryFromTitle(title = "") {
  const t = (title || "").toLowerCase();
  if (t.includes("intelligence artificielle") || t.includes("ia")) return "Intelligence Artificielle";
  if (t.includes("startup")) return "Startup";
  if (t.includes("développement") || t.includes("web")) return "Développement Web";
  if (t.includes("marketing")) return "Business";
  if (t.includes("technologie")) return "Mobile";
  return "Article";
}

export default function ArticleLibrary({
  articles = [],
  fetchArticles,                 // async ({ page, perPage, search, filters, sort }) => { data, total, facets? }
  routeBase = "/articles",
  initialView = "grid",
  defaultLoadMode = "pagination",
  perPageOptions = [12, 24, 48, 96],
}) {
  const persisted = getStore(PREF_KEY, {});

  const [view, setView]             = useState(persisted.view || initialView);
  const [perPage, setPerPage]       = useState(persisted.perPage || perPageOptions[0]);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const debouncedSearch             = useDebouncedValue(search);
  const [filtersOpen, setFiltersOpen]= useState(false);
  const [filters, setFilters]       = useState(
    persisted.filters || {
      categories: [],
      tags: [],
      authors: [],
      featuredOnly: false,
      stickyOnly: false,
      unreadOnly: false, // local only
      dateFrom: "",
      dateTo: "",
      ratingMin: 0,
      ratingMax: 5,
    }
  );
  const [sort, setSort]             = useState([{ key: "published_at", dir: "desc" }]);
  const [loadMode, setLoadMode]     = useState(persisted.loadMode || defaultLoadMode);

  const [rows, setRows]             = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);

  // Facettes renvoyées par le back
  const [facetAuthors, setFacetAuthors]       = useState(null);
  const [facetCategories, setFacetCategories] = useState(null);
  const [facetTags, setFacetTags]             = useState(null);

  // Options UI — si le back fournit des facettes, on les préfère
  const authorsOptions = useMemo(() => {
    if (Array.isArray(facetAuthors)) {
      // [{id,name,count}]
      return facetAuthors.map(a => ({ id: a.id, name: a.name, count: a.count }));
    }
    // fallback client: noms strings
    const set = new Set();
    (articles || []).forEach((a) => {
      const fullName =
        a?.author?.name ||
        [a?.author?.first_name, a?.author?.last_name].filter(Boolean).join(" ") ||
        a?.author_name ||
        (a?.author_id ? `Auteur #${a.author_id}` : null);
      if (fullName) set.add(fullName);
    });
    return Array.from(set).sort();
  }, [articles, facetAuthors]);

  const categoriesOptions = useMemo(() => {
    if (Array.isArray(facetCategories)) {
      // [{id,name,count}]
      return facetCategories.map(c => ({ id: c.id, name: c.name, count: c.count }));
    }
    // fallback client
    const set = new Set();
    (articles || []).forEach((a) => {
      if (Array.isArray(a?.categories) && a.categories.length) {
        a.categories.forEach((c) => c?.name && set.add(c.name));
      } else {
        set.add(getCategoryFromTitle(a?.title));
      }
    });
    return Array.from(set).sort();
  }, [articles, facetCategories]);

  const tagsOptions = useMemo(() => {
    if (Array.isArray(facetTags)) {
      // [{id,name,count}]
      return facetTags.map(t => ({ id: t.id, name: t.name, count: t.count }));
    }
    // fallback client
    const set = new Set();
    (articles || []).forEach((a) => (a?.tags || []).forEach((t) => t?.name && set.add(t.name)));
    return Array.from(set).sort();
  }, [articles, facetTags]);

  // Export CSV
  useEffect(() => {
    const handler = () => {
      if (!rows?.length) return;
      const headers = [
        "id","title","slug","excerpt","author_id","published_at","created_at","updated_at",
        "view_count","rating_average","is_featured","is_sticky","status","favorite","read","category_fallback",
      ];
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const body = rows.map((r) =>
        [
          r.id, r.title, r.slug, r.excerpt, r.author_id, r.published_at, r.created_at, r.updated_at,
          r.view_count, r.rating_average, r.is_featured, r.is_sticky, r.status,
          isFav(r.id), isRead(r.id), getCategoryFromTitle(r.title),
        ].map(esc).join(",")
      ).join("\n");
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

  // Chargement (serveur si fetchArticles)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (fetchArticles) {
          const { data, total, facets } = await fetchArticles({
            page, perPage, search: debouncedSearch, filters, sort,
          });
          if (cancelled) return;
          setRows(data ?? []);
          setTotal(total ?? 0);
          if (facets) {
            setFacetAuthors(facets.authors || null);
            setFacetCategories(facets.categories || null);
            setFacetTags(facets.tags || null);
          }
        } else {
          // Mode client (fallback)
          const src = Array.isArray(articles) ? articles : [];
          const { tokens, q } = parseSearch(debouncedSearch);

          let filtered = src.filter((r) => {
            if (!q) return true;
            const s = q.toLowerCase();
            const categoryFallback = getCategoryFromTitle(r?.title).toLowerCase();
            return (
              (r?.title || "").toLowerCase().includes(s) ||
              (r?.excerpt || "").toLowerCase().includes(s) ||
              (r?.content || "").toLowerCase().includes(s) ||
              categoryFallback.includes(s)
            );
          });

          tokens.forEach((t) => {
            const key = (t?.k || "").toLowerCase();
            const val = String(t?.v ?? "").toLowerCase();
            if (key === "author") {
              filtered = filtered.filter((r) => {
                const name =
                  r?.author?.name ||
                  [r?.author?.first_name, r?.author?.last_name].filter(Boolean).join(" ") ||
                  r?.author_name ||
                  (r?.author_id ? `Auteur #${r.author_id}` : "");
                return String(name).toLowerCase().includes(val);
              });
            }
            if (key === "author_id") {
              filtered = filtered.filter((r) => String(r?.author_id ?? "").toLowerCase() === val);
            }
            if (key === "category") {
              filtered = filtered.filter((r) => {
                const names = (r?.categories || []).map((c) => (c?.name || "").toLowerCase());
                return names.includes(val) || getCategoryFromTitle(r?.title).toLowerCase() === val;
              });
            }
            if (key === "tag") {
              filtered = filtered.filter((r) =>
                (r?.tags || []).some((tg) => String(tg?.name || "").toLowerCase() === val)
              );
            }
            if (key === "before") {
              filtered = filtered.filter((r) => new Date(r?.published_at) <= new Date(t.v));
            }
            if (key === "after") {
              filtered = filtered.filter((r) => new Date(r?.published_at) >= new Date(t.v));
            }
            if (key === "rating") {
              const op = t?.op === ">" ? ">" : "<";
              filtered = filtered.filter((r) => {
                const rating = parseFloat(r?.rating_average) || 0;
                return op === ">" ? rating > parseFloat(t.v) : rating < parseFloat(t.v);
              });
            }
            if (key === "featured") filtered = filtered.filter((r) => !!r?.is_featured);
            if (key === "sticky")   filtered = filtered.filter((r) => !!r?.is_sticky);
          });

          // Filtres UI (attention: ici, filters.categories/tags/authors sont des NOMS, pas des IDs)
          if (filters.categories?.length) {
            filtered = filtered.filter((r) => {
              const names = (r?.categories || []).map((c) => c?.name);
              const fallback = getCategoryFromTitle(r?.title);
              return names.some((n) => filters.categories.includes(n)) || filters.categories.includes(fallback);
            });
          }
          if (filters.tags?.length) {
            filtered = filtered.filter((r) =>
              (r?.tags || []).some((tg) => filters.tags.includes(tg?.name))
            );
          }
          if (filters.authors?.length) {
            filtered = filtered.filter((r) => {
              const name =
                r?.author?.name ||
                [r?.author?.first_name, r?.author?.last_name].filter(Boolean).join(" ") ||
                r?.author_name ||
                (r?.author_id ? `Auteur #${r.author_id}` : "");
              return filters.authors.includes(name);
            });
          }
          if (filters.featuredOnly) filtered = filtered.filter((r) => !!r?.is_featured);
          if (filters.stickyOnly)   filtered = filtered.filter((r) => !!r?.is_sticky);
          if (filters.unreadOnly)   filtered = filtered.filter((r) => !isRead(r?.id));
          if (filters.dateFrom)     filtered = filtered.filter((r) => new Date(r?.published_at) >= new Date(filters.dateFrom));
          if (filters.dateTo)       filtered = filtered.filter((r) => new Date(r?.published_at) <= new Date(filters.dateTo));
          if (filters.ratingMin > 0) filtered = filtered.filter((r) => (parseFloat(r?.rating_average) || 0) >= filters.ratingMin);
          if (filters.ratingMax < 5) filtered = filtered.filter((r) => (parseFloat(r?.rating_average) || 0) <= filters.ratingMax);

          if (sort?.length) {
            filtered.sort((a, b) => {
              for (const { key, dir } of sort) {
                let va = a?.[key], vb = b?.[key];
                if (key === "author") {
                  va = a?.author_id; vb = b?.author_id;
                }
                if (key === "category") {
                  va = getCategoryFromTitle(a?.title);
                  vb = getCategoryFromTitle(b?.title);
                }
                if (key === "rating_average") {
                  va = parseFloat(a?.rating_average) || 0;
                  vb = parseFloat(b?.rating_average) || 0;
                }
                if (["published_at","created_at","updated_at"].includes(key)) {
                  va = va ? new Date(va).getTime() : null;
                  vb = vb ? new Date(vb).getTime() : null;
                }
                if (va == null && vb == null) continue;
                if (va == null) return dir === "asc" ? -1 : 1;
                if (vb == null) return dir === "asc" ? 1 : -1;
                if (va < vb) return dir === "asc" ? -1 : 1;
                if (va > vb) return dir === "asc" ?  1 : -1;
              }
              return 0;
            });
          }

          const total = filtered.length;
          const start = (page - 1) * perPage;
          const data  = filtered.slice(start, start + perPage);
          setRows(data);
          setTotal(total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, perPage, debouncedSearch, filters, sort, articles, fetchArticles]);

  // Persist prefs
  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify({ view, perPage, filters, loadMode }));
  }, [view, perPage, filters, loadMode]);

  // Reset page on criteria change
  useEffect(() => setPage(1), [debouncedSearch, filters, perPage]);

  // Infinite scroll (inchangé)
  const sentinelRef = useRef(null);
  const [infiniteRows, setInfiniteRows] = useState([]);

  useEffect(() => { if (loadMode === "infinite") setInfiniteRows([]); }, [debouncedSearch, filters, sort, perPage, loadMode]);
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
    <div className="p-4 md:p-6 mt-8 w-full max-w-[1600px] mx-auto flex flex-col gap-6">
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
        <div className="bg-white border rounded-xl p-10 text-center text-slate-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          Chargement des articles...
        </div>
      ) : view === "grid" ? (
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gridAutoRows: "max-content" }}
        >
          {viewRows.map((article) => (
            <GridCard key={article.id} item={article} routeBase={routeBase} />
          ))}
        </div>
      ) : (
        <ListTable rows={viewRows} sort={sort} setSort={setSort} routeBase={routeBase} />
      )}

      {viewRows.length === 0 && !loading && (
        <div className="bg-white border rounded-xl p-16 text-center text-slate-600">
          <div className="text-8xl mb-6">📝</div>
          <h3 className="text-xl font-semibold mb-3">Aucun article trouvé</h3>
          <p className="text-slate-500 mb-6">Essayez de modifier vos critères de recherche ou vos filtres</p>
          <button
            onClick={() => {
              setSearch("");
              setFilters({
                categories: [],
                tags: [],
                authors: [],
                featuredOnly: false,
                stickyOnly: false,
                unreadOnly: false,
                dateFrom: "",
                dateTo: "",
                ratingMin: 0,
                ratingMax: 5,
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {loadMode === "pagination" ? (
        <Pagination page={page} perPage={perPage} total={total} onChange={setPage} />
      ) : (
        <div ref={sentinelRef} className="h-12 flex items-center justify-center text-slate-500 select-none">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
              Chargement...
            </div>
          ) : viewRows.length < total ? (
            "Chargement automatique..."
          ) : (
            "Fin des résultats"
          )}
        </div>
      )}

      <div className="mt-6 text-xs text-slate-500 flex justify-between items-center">
        <span>{viewRows.length} articles affichés sur {total} au total</span>
        {total > 0 && (
          <button
            onClick={() => window.dispatchEvent(new Event("articlelib:export"))}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Exporter en CSV
          </button>
        )}
      </div>
    </div>
  );
}
