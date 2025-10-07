// src/pages/articles/ArticlesIndex.jsx
// Page index Articles — intègre un panneau de filtres (sans import externe)
// Compatible avec votre contrôleur Laravel (params: search, category_ids/categories, tag_ids/tags, author_id/author_ids, featured, sticky, date_from/date_to, rating_min/rating_max, include_facets, facet_fields, sort_by, sort_direction)

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Toast from '../../../../../component/toast/Toaster';
import {
  FaEye, FaCalendarAlt, FaTag, FaUser, FaEdit, FaTrashAlt, FaTrash,
  FaExternalLinkAlt, FaSync, FaThumbsUp, FaFilter, FaEraser, FaRocket, FaDownload,
} from 'react-icons/fa';

/* =========================
   Axios de base pour Sanctum
========================= */
axios.defaults.withCredentials = true;
axios.defaults.baseURL = axios.defaults.baseURL || '/api'; // garantit /articles => /api/articles
const API = '/articles';

let csrfReady = false;
async function ensureCsrf() {
  if (csrfReady) return;
  try { await axios.get('/sanctum/csrf-cookie'); } catch {}
  csrfReady = true;
}

/* =========================
   Helpers API & mapping
========================= */
function normalizeList(payload, fallbackPerPage = 24) {
  const items = payload?.data ?? payload?.items ?? (Array.isArray(payload) ? payload : []);
  const meta = payload?.meta ?? {
    current_page: payload?.current_page ?? 1,
    last_page: payload?.last_page ?? 1,
    total: payload?.total ?? items.length,
    per_page: payload?.per_page ?? fallbackPerPage,
    facets: payload?.meta?.facets ?? null
  };
  return { items, meta };
}

const splitNumericAndString = (arr = []) => {
  const nums = [];
  const strs = [];
  for (const v of arr) {
    const n = Number(v);
    if (Number.isFinite(n) && String(n) === String(v)) nums.push(n);
    else if (v != null) strs.push(String(v));
  }
  return { nums, strs };
};

// IMPORTANT: inclure include_facets=1 (et pas true/false) pour passer la validation Laravel "boolean"
function buildQuery({ page, per_page, search, filters }) {
  const q = {
    page,
    per_page,
    search: search?.trim() || undefined,
    sort_by: 'published_at',
    sort_direction: 'desc',
    include_facets: 1,
    facet_fields: 'categories,tags,authors',
  };

  // Catégories
  if (filters?.categories?.length) {
    const { nums, strs } = splitNumericAndString(filters.categories);
    if (nums.length) q.category_ids = nums.join(',');
    if (strs.length) q.categories = strs.join(',');
  }
  // Tags
  if (filters?.tags?.length) {
    const { nums, strs } = splitNumericAndString(filters.tags);
    if (nums.length) q.tag_ids = nums.join(',');
    if (strs.length) q.tags = strs.join(',');
  }
  // Auteurs (IDs seulement)
  if (filters?.authors?.length) {
    const { nums } = splitNumericAndString(filters.authors);
    if (nums.length === 1) q.author_id = nums[0];
    if (nums.length >= 1) q.author_ids = nums.join(',');
  }

  // Flags
  if (filters?.featuredOnly) q.featured = 1;
  if (filters?.stickyOnly) q.sticky = 1;

  // Dates
  if (filters?.dateFrom) q.date_from = filters.dateFrom;
  if (filters?.dateTo) q.date_to = filters.dateTo;

  // Rating — n’envoyer que si différent des bornes par défaut
  const toNumberOrUndef = (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const rmin = toNumberOrUndef(filters?.ratingMin);
  const rmax = toNumberOrUndef(filters?.ratingMax);
  if (rmin !== undefined && rmin > 0) q.rating_min = rmin;
  if (rmax !== undefined && rmax < 5) q.rating_max = rmax;

  // (optionnel) status / visibility si vous les ajoutez dans l’UI un jour
  if (filters?.status) q.status = filters.status;
  if (filters?.visibility) q.visibility = filters.visibility;

  return q;
}

async function apiList({ page, per_page, search, filters }) {
  const params = buildQuery({ page, per_page, search, filters });
  const { data } = await axios.get(API, { params });
  return normalizeList(data, per_page);
}
async function apiSoftDelete(id) { await ensureCsrf(); return axios.delete(`${API}/${id}`); }
async function apiForceDelete(id) {
  await ensureCsrf();
  try { return await axios.delete(`${API}/${id}/force`); }
  catch (e) {
    if (e?.response?.status === 404) return axios.delete(`${API}/${id}`, { params: { force: 1 } });
    throw e;
  }
}

/* =========================
   Helpers UI
========================= */
const badgeClass = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'published': return 'bg-green-100 text-green-700 border-green-200';
    case 'archived':  return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'draft':
    default:          return 'bg-amber-100 text-amber-700 border-amber-200';
  }
};
function getCategoryFromTitle(title) {
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('intelligence artificielle') || titleLower.includes('ia')) return 'Intelligence Artificielle';
  if (titleLower.includes('startup')) return 'Startup';
  if (titleLower.includes('développement') || titleLower.includes('web')) return 'Développement Web';
  if (titleLower.includes('marketing')) return 'Business';
  if (titleLower.includes('technologie')) return 'Mobile';
  return 'Article';
}
const cleanSlug = (x) => { const s = (x ?? '').toString().trim(); if (!s || s === 'undefined' || s === 'null') return null; return s; };
const buildPublicPath = (rec) => { const slug = cleanSlug(rec?.slug); const id = rec?.id != null ? String(rec.id) : null; return slug ? `/articles/${slug}` : (id ? `/articles/${id}` : '#'); };

const Thumb = ({ src, alt }) => (
  src ? (
    <img src={src} alt={alt || 'thumb'} className="w-12 h-12 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200" />
  ) : (
    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center group-hover:from-slate-200 group-hover:to-slate-300 transition-colors duration-200">📝</div>
  )
);

/* =========================
   Helpers Dates — FR + compatibles Safari
========================= */
const RE_SQL = /^\d{4}-\d{2}-\d{2}(?:[ T])\d{2}:\d{2}:\d{2}$/;
// Convertit les dates SQL "YYYY-MM-DD HH:mm:ss" ou ISO en Date (local)
function toDate(val) {
  if (!val) return null;
  if (typeof val === 'string' && RE_SQL.test(val)) {
    // Safari ne parse pas "YYYY-MM-DD HH:mm:ss" => on remplace l'espace par "T"
    return new Date(val.replace(' ', 'T'));
  }
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}
function formatDate(d) {
  try { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(d); }
  catch { return d?.toLocaleDateString('fr-FR'); }
}
function formatTime(d) {
  try { return new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(d); }
  catch { return d?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
}
function formatRelative(target) {
  if (!target) return '';
  const rtf = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
  const now = new Date();
  const diffMs = target - now;
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr  = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const month = Math.round(day / 30);
  const year = Math.round(month / 12);
  if (Math.abs(year)  >= 1) return rtf.format(year,  'year');
  if (Math.abs(month) >= 1) return rtf.format(month, 'month');
  if (Math.abs(day)   >= 1) return rtf.format(day,   'day');
  if (Math.abs(hr)    >= 1) return rtf.format(hr,    'hour');
  if (Math.abs(min)   >= 1) return rtf.format(min,   'minute');
  return rtf.format(sec, 'second');
}

/* =========================
   Export CSV (liste courante)
========================= */
function exportRowsToCSV(rows = []) {
  const headers = ['id','title','slug','status','visibility','published_at','view_count','rating_average','rating_count','author_id','author_name'];
  const lines = [headers.join(',')];
  for (const a of rows) {
    const row = [
      a.id,
      JSON.stringify(a.title ?? ''),
      JSON.stringify(a.slug ?? ''),
      JSON.stringify(a.status ?? ''),
      JSON.stringify(a.visibility ?? ''),
      JSON.stringify(a.published_at ?? ''),
      a.view_count ?? 0,
      (a.rating_average ?? 0).toFixed ? (Number(a.rating_average) || 0).toFixed(1) : (a.rating_average ?? 0),
      a.rating_count ?? 0,
      a.author_id ?? '',
      JSON.stringify(a.author_name ?? ''),
    ];
    lines.push(row.join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  link.download = `articles-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* =========================
   Panneau de filtres (Local)
========================= */
const FiltersBar = ({
  search, setSearch,
  filters, setFilters,
  perPage, setPerPage,
  facets = { categories: [], tags: [], authors: [] },
  onExportClick,
}) => {
  // états locaux pour éviter d’envoyer des 0/5 par défaut si non modifiés
  const [local, setLocal] = useState(filters);
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => setLocal(filters), [filters]);
  useEffect(() => setLocalSearch(search), [search]);

  const apply = () => {
    setSearch(localSearch);
    setFilters({
      ...local,
      ratingMin: local.ratingMin === '' ? 0 : Number(local.ratingMin),
      ratingMax: local.ratingMax === '' ? 5 : Number(local.ratingMax),
    });
  };
  const reset = () => {
    setLocal({
      categories: [],
      tags: [],
      authors: [],
      featuredOnly: false,
      stickyOnly: false,
      unreadOnly: false,
      dateFrom: '',
      dateTo: '',
      ratingMin: 0,
      ratingMax: 5,
    });
    setLocalSearch('');
    setSearch('');
    setFilters({
      categories: [],
      tags: [],
      authors: [],
      featuredOnly: false,
      stickyOnly: false,
      unreadOnly: false,
      dateFrom: '',
      dateTo: '',
      ratingMin: 0,
      ratingMax: 5,
    });
  };

  // helpers pour champs CSV
  const csvToArray = (s) => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  const arrayToCsv = (arr) => (arr || []).join(', ');

  // chips depuis facettes (on ajoute l’id quand possible)
  const addFacet = (kind, item) => {
    setLocal(prev => {
      const val = (kind === 'authors') ? String(item.id ?? item) : (item.id ?? item.name ?? item);
      const arr = new Set([...(prev[kind] || []).map(String), String(val)]);
      return { ...prev, [kind]: Array.from(arr) };
    });
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="px-6 py-3 flex flex-col gap-3">

        {/* ligne 1 : recherche + commandes */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e)=> e.key==='Enter' && apply()}
              placeholder="Rechercher titre / contenu…"
              className="w-full h-10 pl-3 pr-28 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
              <button
                className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                onClick={() => { setLocalSearch(''); }}
                title="Effacer"
              >
                Effacer
              </button>
              <button
                className="h-8 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={apply}
                title="Appliquer"
              >
                Rechercher
              </button>
            </div>
          </div>

          <select
            value={perPage}
            onChange={(e)=> setPerPage(Number(e.target.value))}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
            title="Éléments par page"
          >
            {[12,24,48,96].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>

          <button
            type="button"
            onClick={onExportClick}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center"
            title="Exporter la page en CSV"
          >
            <FaDownload />
          </button>

          <button
            type="button"
            onClick={apply}
            className="h-10 px-4 rounded-xl bg-blue-600 text-white inline-flex items-center gap-2"
            title="Appliquer les filtres"
          >
            <FaRocket /><span>Appliquer</span>
          </button>

          <button
            type="button"
            onClick={reset}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
            title="Réinitialiser"
          >
            <FaEraser /><span>Réinitialiser</span>
          </button>
        </div>

        {/* ligne 2 : filtres rapides */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-slate-600"><FaFilter />Filtres</span>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!local.featuredOnly}
              onChange={(e)=> setLocal(p => ({ ...p, featuredOnly: e.target.checked }))}
            />
            Vedettes uniquement
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!local.stickyOnly}
              onChange={(e)=> setLocal(p => ({ ...p, stickyOnly: e.target.checked }))}
            />
            Épinglés uniquement
          </label>

          <div className="flex items-center gap-2 text-sm">
            <FaCalendarAlt className="text-slate-500" />
            <input
              type="date"
              value={local.dateFrom}
              onChange={(e)=> setLocal(p=>({ ...p, dateFrom: e.target.value }))}
              className="h-9 px-2 rounded border border-slate-200"
              title="Date de début"
            />
            <span>→</span>
            <input
              type="date"
              value={local.dateTo}
              onChange={(e)=> setLocal(p=>({ ...p, dateTo: e.target.value }))}
              className="h-9 px-2 rounded border border-slate-200"
              title="Date de fin"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <FaThumbsUp className="text-amber-600" />
            <input
              type="number" min="0" max="5" step="0.1"
              value={local.ratingMin}
              onChange={(e)=> setLocal(p=>({ ...p, ratingMin: e.target.value }))}
              placeholder="Note min"
              className="h-9 w-24 px-2 rounded border border-slate-200"
              title="Note minimale"
            />
            <span>→</span>
            <input
              type="number" min="0" max="5" step="0.1"
              value={local.ratingMax}
              onChange={(e)=> setLocal(p=>({ ...p, ratingMax: e.target.value }))}
              placeholder="Note max"
              className="h-9 w-24 px-2 rounded border border-slate-200"
              title="Note maximale"
            />
          </div>
        </div>

        {/* ligne 3 : catégories / tags / auteurs via CSV */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Catégories (ID ou noms, séparés par des virgules)</label>
            <input
              type="text"
              value={arrayToCsv(local.categories)}
              onChange={(e)=> setLocal(p=>({ ...p, categories: csvToArray(e.target.value) }))}
              placeholder="ex: 1, IA, Mobile"
              className="w-full h-10 px-3 rounded-lg border border-slate-200"
            />
            {/* Facettes catégories */}
            {Array.isArray(facets.categories) && facets.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {facets.categories.slice(0,12).map((c) => (
                  <button key={`c-${c.id}`}
                          type="button"
                          onClick={()=> addFacet('categories', c)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50">
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Tags (ID ou noms, séparés par des virgules)</label>
            <input
              type="text"
              value={arrayToCsv(local.tags)}
              onChange={(e)=> setLocal(p=>({ ...p, tags: csvToArray(e.target.value) }))}
              placeholder="ex: 3, startup, dev"
              className="w-full h-10 px-3 rounded-lg border border-slate-200"
            />
            {/* Facettes tags */}
            {Array.isArray(facets.tags) && facets.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {facets.tags.slice(0,12).map((t) => (
                  <button key={`t-${t.id}`}
                          type="button"
                          onClick={()=> addFacet('tags', t)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50">
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Auteurs (IDs séparés par des virgules)</label>
            <input
              type="text"
              value={arrayToCsv(local.authors)}
              onChange={(e)=> setLocal(p=>({ ...p, authors: csvToArray(e.target.value) }))}
              placeholder="ex: 12, 27"
              className="w-full h-10 px-3 rounded-lg border border-slate-200"
            />
            {/* Facettes auteurs */}
            {Array.isArray(facets.authors) && facets.authors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {facets.authors.slice(0,12).map((u) => (
                  <button key={`u-${u.id}`}
                          type="button"
                          onClick={()=> addFacet('authors', u)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-50">
                    {u.name || `Auteur #${u.id || ''}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Composant principal
========================= */
const ArticlesIndex = () => {
  const navigate = useNavigate();

  // Recherche & filtres
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    categories: [],
    tags: [],
    authors: [],
    featuredOnly: false,
    stickyOnly: false,
    unreadOnly: false, // UI seulement
    dateFrom: '',
    dateTo: '',
    ratingMin: 0,
    ratingMax: 5,
  });

  // Vue & pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(24);

  // Données + facettes
  const [data, setData] = useState({
    items: [],
    meta: { total: 0, current_page: 1, last_page: 1, per_page: 24, facets: { categories: [], tags: [], authors: [] } }
  });

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiList({ page, per_page: perPage, search, filters });
      setData(res);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, filters]);

  // recharger quand deps changent
  useEffect(() => { load(); }, [load]);

  // revenir page 1 quand critères changent
  useEffect(() => { setPage(1); }, [search, filters]);

  // Export CSV via bouton
  const handleExport = () => exportRowsToCSV(data.items || []);

  const ask = (msg) => window.confirm(msg);

  const doSoftDelete = async (id) => {
    if (!ask('Envoyer cet article à la corbeille ?')) return;
    try { await apiSoftDelete(id); setToast({ type:'success', message:'Envoyé à la corbeille' }); load(); }
    catch (e) { setToast({ type:'error', message: e?.response?.data?.message || 'Erreur' }); }
  };

  const doDestroy = async (id) => {
    if (!ask('Suppression définitive. Continuer ?')) return;
    try { await apiForceDelete(id); setToast({ type:'success', message:'Supprimé définitivement' }); load(); }
    catch (e) { setToast({ type:'error', message: e?.response?.data?.message || 'Erreur' }); }
  };

  const rows = useMemo(() => data.items || [], [data.items]);

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}

      {/* Header */}
      <div className="p-5 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Articles</h2>
            <p className="text-sm/5 opacity-90">Liste avec filtres, facettes & export CSV.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={load} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded inline-flex items-center gap-2">
              <FaSync /> Actualiser
            </button>
            <Link to="/articles/new" className="px-3 py-2 bg-white text-blue-700 rounded hover:bg-gray-100">
              Créer
            </Link>
            <Link to="/articles/trashed" className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded">
              Corbeille
            </Link>
          </div>
        </div>
      </div>

      {/* Panneau de filtres (local) */}
      <FiltersBar
        search={search}
        setSearch={setSearch}
        filters={filters}
        setFilters={setFilters}
        perPage={perPage}
        setPerPage={setPerPage}
        facets={{
          categories: data?.meta?.facets?.categories || [],
          tags: data?.meta?.facets?.tags || [],
          authors: data?.meta?.facets?.authors || [],
        }}
        onExportClick={handleExport}
      />

      {/* Bandeau chargement */}
      {loading && (
        <div className="bg-amber-50 border-y border-amber-200 text-amber-800 px-4 py-2">Chargement en cours…</div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-xs font-medium text-slate-600">Image</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Titre</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Auteur</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Catégorie</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Publié le</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Vues</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Note</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Statut</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-slate-600">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((article) => {
              const publicTo = buildPublicPath(article);
              const primaryCategory = getCategoryFromTitle(article.title);

              const formattedViewCount =
                Number(article.view_count || 0) > 1000
                  ? `${(Number(article.view_count) / 1000).toFixed(1)}k`
                  : `${article.view_count ?? 0}`;

              const formattedRating = article.rating_average
                ? parseFloat(article.rating_average).toFixed(1)
                : '0.0';

              // === Dates à jour (FR + relatif) ===
              const publishedAt = toDate(article.published_at);
              const createdAt   = toDate(article.created_at);
              const updatedAt   = toDate(article.updated_at);

              const pubDate = publishedAt ? formatDate(publishedAt) : '—';
              const pubTime = publishedAt ? formatTime(publishedAt) : '';
              const pubRel  = publishedAt ? formatRelative(publishedAt) : '';

              const updRel  = updatedAt ? formatRelative(updatedAt) : null;
              const creRel  = createdAt ? formatRelative(createdAt) : null;

              return (
                <tr key={article.id} className="hover:bg-slate-50/50 transition-colors duration-200 group">
                  {/* Image */}
                  <td className="px-3 py-4">
                    <Thumb src={article.featured_image_url || article.featured_image || null}
                           alt={article.featured_image_alt || article.title} />
                  </td>

                  {/* Titre */}
                  <td className="px-3 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={publicTo}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors duration-200 block truncate"
                          title={article.title}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {article.title || <span className="text-gray-400 italic">Sans titre</span>}
                        </Link>
                        <a
                          href={publicTo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Ouvrir l'article"
                        >
                          <FaExternalLinkAlt size={12} />
                        </a>
                      </div>
                      {article.excerpt && (
                        <div className="text-xs text-slate-500 truncate max-w-[420px] mt-1">{article.excerpt}</div>
                      )}
                      <div className="flex gap-1 mt-2">
                        {article.is_featured && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">⭐ À la une</span>)}
                        {article.is_sticky && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">📌 Épinglé</span>)}
                        {article.visibility && article.visibility !== 'public' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">🔒 {article.visibility}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Auteur */}
                  <td className="px-3 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <FaUser className="text-slate-500" size={12} />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{article.author_name || `Auteur #${article.author_id || '—'}`}</div>
                        {article.author_id && (<div className="text-xs text-slate-500">ID: {article.author_id}</div>)}
                      </div>
                    </div>
                  </td>

                  {/* Catégorie dérivée */}
                  <td className="px-3 py-4 text-sm">
                    <span className="inline-flex items-center px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition-colors duration-200">
                      <FaTag className="mr-1" size={10} />{primaryCategory}
                    </span>
                  </td>

                  {/* Publié le — date locale + heure + relatif */}
                  <td className="px-3 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-slate-400" size={12} />
                      <div>
                        <div className="font-medium text-slate-900">{pubDate}</div>
                        <div className="text-xs text-slate-500">
                          {publishedAt ? `${pubTime} • ${pubRel}` : '—'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Vues */}
                  <td className="px-3 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-blue-600"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </div>
                      <div>
                        <div className="font-bold text-blue-700">{formattedViewCount}</div>
                        <div className="text-xs text-slate-500">vues</div>
                      </div>
                    </div>
                  </td>

                  {/* Note */}
                  <td className="px-3 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <FaThumbsUp className="text-amber-600" size={12} />
                      </div>
                      <div>
                        <div className="font-bold text-amber-700">{formattedRating}/5</div>
                        <div className="text-xs text-slate-500">{article.rating_count || 0} avis</div>
                      </div>
                    </div>
                  </td>

                  {/* Statut + dates de création/màj (relatif + exact) */}
                  <td className="px-3 py-4 text-sm">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeClass(article.status)}`}>
                        {article.status || 'draft'}
                      </span>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        {createdAt && (
                          <div>
                            Créé {creRel} • {formatDate(createdAt)} {formatTime(createdAt)}
                          </div>
                        )}
                        {updatedAt && (
                          <div>
                            Maj {updRel} • {formatDate(updatedAt)} {formatTime(updatedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-4 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        to={publicTo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:scale-105 transition-all duration-200 inline-flex items-center justify-center"
                        title="Voir l'article"
                      >
                        <FaEye size={14} />
                      </Link>

                      <button
                        className="p-2 rounded-lg border text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:scale-105 transition-all duration-200"
                        onClick={()=>navigate(`/articles/${article.id}/edit`, { state: { article } })}
                        title="Éditer"
                      >
                        <FaEdit size={14} />
                      </button>

                      <button
                        className="p-2 rounded-lg border text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:scale-105 transition-all duration-200"
                        onClick={()=>doSoftDelete(article.id)}
                        title="Envoyer à la corbeille"
                      >
                        <FaTrashAlt size={14} />
                      </button>

                      <button
                        className="p-2 rounded-lg border text-red-600 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:scale-105 transition-all duration-200"
                        onClick={()=>doDestroy(article.id)}
                        title="Supprimer définitivement"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {(!loading && rows.length === 0) && (
              <tr>
                <td className="p-10 text-center text-slate-500" colSpan={9}>
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="text-6xl mb-2">📝</div>
                    <p className="text-lg">Aucun article</p>
                    <button onClick={()=>{ setPage(1); load(); }} className="text-blue-600 hover:text-blue-800 text-sm">
                      Actualiser
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t">
        <div className="text-sm text-slate-600">
          Total : <b>{data.meta.total || 0}</b> • Page <b>{data.meta.current_page || 1}</b> / <b>{data.meta.last_page || 1}</b>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50"
            disabled={page<=1}
            onClick={()=>setPage(p=>p-1)}
          >
            Préc.
          </button>
          <button
            className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50"
            disabled={page>= (data.meta.last_page || 1)}
            onClick={()=>setPage(p=>p+1)}
          >
            Suiv.
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticlesIndex;
