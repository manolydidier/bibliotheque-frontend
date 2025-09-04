// ============================================
// Dossier: media-library/
// Bibliothèque décomposée en composants (grille/liste, recherche, filtres,
// pagination/infini, marqueurs lus & favoris, export CSV)
// ============================================
// NOTE DE FIX: pour éviter l'erreur « Identifier 'React' has already been declared »
// quand tout ce code est exécuté en *un seul fichier*, j'ai supprimé les
// `import React from "react"` redondants et n'importe plus que les hooks via
// `import { useState, ... } from "react"`. (React 17+ / nouveau JSX Transform)
// ============================================
// Arborescence conseillée:
// media-library/
//   index.jsx
//   parts/
//     FiltersPanel.jsx
//     GridCard.jsx
//     ListTable.jsx
//     Pagination.jsx
//   shared/
//     constants.js
//     mock/service.js
//     hooks/useDebouncedValue.js
//     utils/format.js
//     utils/query.js
//     store/prefs.js
//     store/markers.js
//     atoms/atoms.jsx
// ============================================

// ------------------------------
// File: media-library/index.jsx
// ------------------------------
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
import { MOCK_MEDIA } from "./shared/mock/service";
import { isFav, isRead } from "./shared/store/markers";

const PREF_KEY = "medialib:prefs";

export default function MediaLibrary({
  items, // optionnel: tableau de médias côté client
  fetchMedia, // optionnel: async ({ page, perPage, search, filters, sort }) => { data, total }
  routeBase = "/visualiseur",
  initialView = "grid",
  defaultLoadMode = "pagination", // or "infinite"
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
      types: [],
      categories: [],
      tags: [],
      owners: [],
      favoritesOnly: false,
      unreadOnly: false,
      dateFrom: "",
      dateTo: "",
      sizeMin: 0,
      sizeMax: 0,
    }
  );
  const [sort, setSort] = useState([{ key: "createdAt", dir: "desc" }]);
  const [loadMode, setLoadMode] = useState(persisted.loadMode || defaultLoadMode);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Propriétaires (à partir des données locales si items/mock)
  const ownersOptions = useMemo(() => {
    const src = items || MOCK_MEDIA;
    return Array.from(new Set(src.map((x) => x.owner))).sort();
  }, [items]);

  // Export CSV de la vue courante
  useEffect(() => {
    const handler = () => {
      if (!rows?.length) return;
      const headers = [
        "id",
        "name",
        "type",
        "ext",
        "sizeBytes",
        "category",
        "owner",
        "createdAt",
        "updatedAt",
        "tags",
        "favorite",
        "read",
      ];
      const esc = (v) => `"${String(v ?? "").replace(/\"/g, '""')}"`;
      const body = rows
        .map((r) =>
          [
            r.id,
            r.name,
            r.type,
            r.ext,
            r.sizeBytes,
            r.category,
            r.owner,
            r.createdAt,
            r.updatedAt,
            (r.tags || []).join("|"),
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
      a.download = `medias_export_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
    window.addEventListener("medialib:export", handler);
    return () => window.removeEventListener("medialib:export", handler);
  }, [rows]);

  // Chargement des données
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (fetchMedia) {
          const { data, total } = await fetchMedia({
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
          const src = items || MOCK_MEDIA;
          const { tokens, q } = parseSearch(debouncedSearch);
          let filtered = src.filter((r) => {
            if (!q) return true;
            const s = q.toLowerCase();
            return (
              r.name.toLowerCase().includes(s) ||
              r.description.toLowerCase().includes(s) ||
              r.owner.toLowerCase().includes(s) ||
              r.tags.some((t) => t.toLowerCase().includes(s))
            );
          });
          tokens.forEach((t) => {
            if (t.k === "type") filtered = filtered.filter((r) => r.type.toLowerCase() === t.v.toLowerCase());
            if (t.k === "tag") filtered = filtered.filter((r) => r.tags.map((x) => x.toLowerCase()).includes(t.v.toLowerCase()));
            if (t.k === "ext") filtered = filtered.filter((r) => r.ext.toLowerCase() === t.v.toLowerCase());
            if (t.k === "owner") filtered = filtered.filter((r) => r.owner.toLowerCase().includes(t.v.toLowerCase()));
            if (t.k === "before") filtered = filtered.filter((r) => new Date(r.createdAt) <= new Date(t.v));
            if (t.k === "after") filtered = filtered.filter((r) => new Date(r.createdAt) >= new Date(t.v));
            if (t.k === "size") filtered = filtered.filter((r) => (t.op === ">" ? r.sizeBytes > t.v : r.sizeBytes < t.v));
          });
          if (filters.types.length) filtered = filtered.filter((r) => filters.types.includes(r.type));
          if (filters.categories.length) filtered = filtered.filter((r) => filters.categories.includes(r.category));
          if (filters.tags.length) filtered = filtered.filter((r) => r.tags.some((x) => filters.tags.includes(x)));
          if (filters.owners.length) filtered = filtered.filter((r) => filters.owners.includes(r.owner));
          if (filters.favoritesOnly) filtered = filtered.filter((r) => isFav(r.id) || r.favorite);
          if (filters.unreadOnly) filtered = filtered.filter((r) => !isRead(r.id));
          if (filters.dateFrom) filtered = filtered.filter((r) => new Date(r.createdAt) >= new Date(filters.dateFrom));
          if (filters.dateTo) filtered = filtered.filter((r) => new Date(r.createdAt) <= new Date(filters.dateTo));
          if (filters.sizeMin) filtered = filtered.filter((r) => r.sizeBytes >= filters.sizeMin);
          if (filters.sizeMax) filtered = filtered.filter((r) => r.sizeBytes <= filters.sizeMax);

          if (sort?.length) {
            filtered.sort((a, b) => {
              for (const { key, dir } of sort) {
                const va = a[key];
                const vb = b[key];
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
  }, [page, perPage, debouncedSearch, filters, sort, items, fetchMedia]);

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
        ownersOptions={ownersOptions}
      />

      {loading && viewRows.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-slate-600">Chargement…</div>
      ) : view === "grid" ? (
        <div className="grid gap-6" style={{ 
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gridAutoRows: 'max-content'
        }}>
          {viewRows.map((it) => (
            <GridCard key={it.id} item={it} routeBase={routeBase} />
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
        Taille totale page: {formatBytes(viewRows.reduce((s, r) => s + (r.sizeBytes || 0), 0))}
      </div>
    </div>
  );
}