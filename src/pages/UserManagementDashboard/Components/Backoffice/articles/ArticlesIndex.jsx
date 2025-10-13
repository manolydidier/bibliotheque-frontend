// src/pages/articles/ArticlesIndex.jsx

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Toast from '../../../../../component/toast/Toaster';
import {
  FaEye, FaCalendarAlt, FaTag, FaUser, FaEdit, FaTrashAlt, FaTrash,
  FaExternalLinkAlt, FaSync, FaThumbsUp, FaFilter, FaEraser, FaRocket, FaDownload,
  FaTimes, FaSpinner, FaCheck, FaUndo, FaCheckSquare, FaSquare,
  FaTable, FaThLarge, FaSort, FaSortUp, FaSortDown, FaChevronDown, FaChevronUp
} from 'react-icons/fa';

// ✅ nouveau FiltersBar stylé
import FiltersBar from './FiltersBar';

/* =========================
   Axios de base pour Sanctum
========================= */
axios.defaults.withCredentials = true;
axios.defaults.baseURL = axios.defaults.baseURL || '/api';
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
  const nums = []; const strs = [];
  for (const v of arr) {
    const n = Number(v);
    if (Number.isFinite(n) && String(n) === String(v)) nums.push(n);
    else if (v != null) strs.push(String(v));
  }
  return { nums, strs };
};

function buildQuery({ page, per_page, search, filters, sortBy, sortDir }) {
  const q = {
    page, per_page,
    search: search?.trim() || undefined,
    sort_by: sortBy || 'published_at',
    sort_direction: (sortDir || 'desc'),
    include_facets: 1,
    facet_fields: 'categories,tags,authors',
  };

  if (filters?.categories?.length) {
    const { nums, strs } = splitNumericAndString(filters.categories);
    if (nums.length) q.category_ids = nums.join(',');
    if (strs.length) q.categories = strs.join(',');
  }
  if (filters?.tags?.length) {
    const { nums, strs } = splitNumericAndString(filters.tags);
    if (nums.length) q.tag_ids = nums.join(',');
    if (strs.length) q.tags = strs.join(',');
  }
  if (filters?.authors?.length) {
    const { nums } = splitNumericAndString(filters.authors);
    if (nums.length === 1) q.author_id = nums[0];
    if (nums.length >= 1) q.author_ids = nums.join(',');
  }

  if (filters?.featuredOnly) q.featured = 1;
  if (filters?.stickyOnly) q.sticky = 1;
  if (filters?.dateFrom) q.date_from = filters.dateFrom;
  if (filters?.dateTo) q.date_to = filters.dateTo;

  const toNumberOrUndef = (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const rmin = toNumberOrUndef(filters?.ratingMin);
  const rmax = toNumberOrUndef(filters?.ratingMax);
  if (rmin !== undefined && rmin > 0) q.rating_min = rmin;
  if (rmax !== undefined && rmax < 5) q.rating_max = rmax;

  if (filters?.status) q.status = filters.status;
  if (filters?.visibility) q.visibility = filters.visibility;

  return q;
}

async function apiList({ page, per_page, search, filters, sortBy, sortDir }) {
  const params = buildQuery({ page, per_page, search, filters, sortBy, sortDir });
  const { data } = await axios.get(API, { params });
  return normalizeList(data, per_page);
}
async function apiSoftDelete(id) { await ensureCsrf(); return axios.post(`${API}/${id}/soft-delete`); }
async function apiForceDelete(id) {
  await ensureCsrf();
  try { return await axios.delete(`${API}/${id}/hard-delete`); }
  catch (e) {
    if (e?.response?.status === 404) return axios.delete(`${API}/${id}`, { params: { force: 1 } });
    throw e;
  }
}
async function apiRestore(id) { await ensureCsrf(); return axios.post(`${API}/${id}/restore`); }

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
  const s = (title || '').toLowerCase();
  if (s.includes('intelligence artificielle') || s.includes('ia')) return 'Intelligence Artificielle';
  if (s.includes('startup')) return 'Startup';
  if (s.includes('développement') || s.includes('web')) return 'Développement Web';
  if (s.includes('marketing')) return 'Business';
  if (s.includes('technologie')) return 'Mobile';
  return 'Article';
}
const cleanSlug = (x) => { const s = (x ?? '').toString().trim(); if (!s || s === 'undefined' || s === 'null') return null; return s; };
const buildPublicPath = (rec) => { const slug = cleanSlug(rec?.slug); const id = rec?.id != null ? String(rec.id) : null; return slug ? `/articles/${slug}` : (id ? `/articles/${id}` : '#'); };

const Thumb = ({ src, alt, className='' }) => (
  src ? (
    <img src={src} alt={alt || 'thumb'} className={`object-cover rounded-lg shadow-sm ${className}`} />
  ) : (
    <div className={`rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ${className}`}>📝</div>
  )
);

/* =========================
   Dates
========================= */
const RE_SQL = /^\d{4}-\d{2}-\d{2}(?:[ T])\d{2}:\d{2}:\d{2}$/;
function toDate(val) { if (!val) return null; if (typeof val === 'string' && RE_SQL.test(val)) return new Date(val.replace(' ', 'T')); const d=new Date(val); return Number.isNaN(d.getTime())?null:d; }
function formatDate(d){ try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(d);}catch{return d?.toLocaleDateString('fr-FR');}}
function formatTime(d){ try{return new Intl.DateTimeFormat('fr-FR',{timeStyle:'short'}).format(d);}catch{return d?.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}}
function formatRelative(target){ if(!target)return''; const rtf=new Intl.RelativeTimeFormat('fr-FR',{numeric:'auto'}); const now=new Date(); const diffMs=target-now; const sec=Math.round(diffMs/1000); const min=Math.round(sec/60); const hr=Math.round(min/60); const day=Math.round(hr/24); const month=Math.round(day/30); const year=Math.round(month/12); if(Math.abs(year)>=1)return rtf.format(year,'year'); if(Math.abs(month)>=1)return rtf.format(month,'month'); if(Math.abs(day)>=1)return rtf.format(day,'day'); if(Math.abs(hr)>=1)return rtf.format(hr,'hour'); if(Math.abs(min)>=1)return rtf.format(min,'minute'); return rtf.format(sec,'second'); }

/* =========================
   Export CSV
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
   Composant principal
========================= */
const ArticlesIndex = () => {
  const navigate = useNavigate();

  // Recherche & filtres
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ categories: [], tags: [], authors: [], featuredOnly: false, stickyOnly: false, unreadOnly: false, dateFrom: '', dateTo: '', ratingMin: 0, ratingMax: 5 });

  // Vue & pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(24);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Tri
  const [sortBy, setSortBy] = useState('published_at');
  const [sortDir, setSortDir] = useState('desc');
  const sortableCols = [
    { key: 'title', label: 'Titre' },
    { key: 'published_at', label: 'Publié le' },
    { key: 'view_count', label: 'Vues' },
    { key: 'rating_average', label: 'Note' },
    { key: 'status', label: 'Statut' },
  ];
  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  };
  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <FaSort className="opacity-40" />;
    return sortDir === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  // Données + facettes
  const [data, setData] = useState({ items: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 24, facets: { categories: [], tags: [], authors: [] } } });

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal suppression
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id|ids, mode, title }

  // Drag & Drop
  const [draggingId, setDraggingId] = useState(null);
  const [overSoft, setOverSoft] = useState(false);
  const [overHard, setOverHard] = useState(false);
  const [pulseSoft, setPulseSoft] = useState(false);
  const [shakeHard, setShakeHard] = useState(false);

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState(new Set());
  const allSelectedOnPage = useMemo(() => {
    const ids = (data.items || []).map(a => a.id);
    return ids.length > 0 && ids.every(id => selectedIds.has(id));
  }, [selectedIds, data.items]);

  // Undo (restore)
  const [lastSoftDeletedIds, setLastSoftDeletedIds] = useState([]);

  // Affichage/masquage des filtres
  const [showFilters, setShowFilters] = useState(true);
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (search?.trim()) c++;
    if (filters.categories?.length) c++;
    if (filters.tags?.length) c++;
    if (filters.authors?.length) c++;
    if (filters.featuredOnly) c++;
    if (filters.stickyOnly) c++;
    if (filters.dateFrom) c++;
    if (filters.dateTo) c++;
    if ((filters.ratingMin ?? 0) > 0) c++;
    if ((filters.ratingMax ?? 5) < 5) c++;
    if (filters.status) c++;
    if (filters.visibility) c++;
    return c;
  }, [filters, search]);

  useEffect(() => {
    const onKey = (e) => { if (e.key.toLowerCase() === 'f' && e.shiftKey) { e.preventDefault(); setShowFilters(v => !v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Chargement
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiList({ page, per_page: perPage, search, filters, sortBy, sortDir });
      setData(res);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, filters, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filters, sortBy, sortDir]);

  const handleExport = () => exportRowsToCSV(data.items || []);

  /* ============
     Modal logic
  ============ */
  const openConfirm = (mode, articleOrIds) => {
    if (Array.isArray(articleOrIds)) setConfirmDelete({ mode, ids: articleOrIds });
    else setConfirmDelete({ id: articleOrIds.id, mode, title: articleOrIds.title });
  };
  const closeConfirm = () => setConfirmDelete(null);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      if (confirmDelete.mode === 'soft') {
        await apiSoftDelete(confirmDelete.id);
        setLastSoftDeletedIds([confirmDelete.id]);
        setToast({ type: 'success', message: 'Envoyé à la corbeille' });
        setPulseSoft(true); setTimeout(()=> setPulseSoft(false), 700);
      }
      if (confirmDelete.mode === 'hard') {
        await apiForceDelete(confirmDelete.id);
        setToast({ type: 'success', message: 'Supprimé définitivement' });
        setShakeHard(true); setTimeout(()=> setShakeHard(false), 500);
      }
      if (confirmDelete.mode === 'soft-many') {
        const ids = confirmDelete.ids || [];
        const results = await Promise.allSettled(ids.map(id => apiSoftDelete(id)));
        const ok = results.filter(r => r.status === 'fulfilled').length;
        setLastSoftDeletedIds(ids);
        setToast({ type: 'success', message: `Corbeille : ${ok}/${ids.length} article(s)` });
        setPulseSoft(true); setTimeout(()=> setPulseSoft(false), 700);
      }
      if (confirmDelete.mode === 'hard-many') {
        const ids = confirmDelete.ids || [];
        const results = await Promise.allSettled(ids.map(id => apiForceDelete(id)));
        const ok = results.filter(r => r.status === 'fulfilled').length;
        setToast({ type: 'success', message: `Supprimé(s) : ${ok}/${ids.length} article(s)` });
        setShakeHard(true); setTimeout(()=> setShakeHard(false), 500);
      }
      closeConfirm();
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur' });
    } finally {
      setIsDeleting(false);
    }
  };

  // ESC pour fermer + raccourcis suppression
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { if (confirmDelete) closeConfirm(); }
      if (selectedIds.size > 0) {
        if (e.key === 'Delete' && !e.shiftKey) { e.preventDefault(); openConfirm('soft-many', Array.from(selectedIds)); }
        if (e.key === 'Delete' && e.shiftKey)  { e.preventDefault(); openConfirm('hard-many', Array.from(selectedIds)); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDelete, selectedIds]);

  /* ===================
     Drag & Drop events
  =================== */
  const onDragStartRow = (e, article) => {
    setDraggingId(article.id);
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: article.id, title: article.title }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragEndRow = () => { setDraggingId(null); setOverSoft(false); setOverHard(false); };
  const allowDrop = (e) => { e.preventDefault(); };
  const onDropSoft = async (e) => {
    e.preventDefault(); setOverSoft(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (!payload?.id) return;
      await apiSoftDelete(payload.id);
      setLastSoftDeletedIds([payload.id]);
      setToast({ type: 'success', message: `Article "${payload.title || payload.id}" → corbeille` });
      setPulseSoft(true); setTimeout(()=> setPulseSoft(false), 700);
      await load();
    } catch { setToast({ type: 'error', message: 'Erreur lors de l’envoi à la corbeille' }); }
    finally { setDraggingId(null); }
  };
  const onDropHard = async (e) => {
    e.preventDefault(); setOverHard(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (!payload?.id) return;
      openConfirm('hard', { id: payload.id, title: payload.title });
    } catch { setToast({ type: 'error', message: 'Erreur lors de la suppression' }); }
    finally { setDraggingId(null); }
  };

  /* ===================
     Sélection multiple
  =================== */
  const toggleSelect = (id) => setSelectedIds(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleSelectAllOnPage = () => {
    const ids = (data.items || []).map(a => a.id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (ids.length && ids.every(id => next.has(id))) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  /* ============
     Undo (restore)
  ============ */
function optimisticPublish(ids) {
  setData(prev => {
    const items = (prev.items || []).map(it =>
      ids.includes(it.id)
        ? { ...it, status: 'published', deleted_at: null }
        : it
    );
    return { ...prev, items };
  });
}
async function apiRestoreAndPublish(id) {
  await ensureCsrf();

  // 1) RESTORE (efface deleted_at côté DB)
  const restoreRes = await axios.post(`${API}/${id}/restore`);

  // 2) PUBLISH (au cas où le backend ne force pas déjà le statut)
  try {
    await axios.put(`${API}/${id}`, { status: 'published' });
  } catch (_) {
    // si ton endpoint restore met déjà published, ce PUT renverra 422/400 -> on ignore.
  }

  return restoreRes;
}


  const handleUndo = async () => {
  if (!lastSoftDeletedIds.length) return;

  const ids = [...lastSoftDeletedIds];

  // patch optimiste (immédiat dans l’UI)
  optimisticPublish(ids);

  try {
    const results = await Promise.allSettled(
      ids.map(id => apiRestoreAndPublish(id))
    );
    const ok = results.filter(r => r.status === 'fulfilled').length;

    setToast({ type: 'success', message: `Restauration : ${ok}/${ids.length}` });
    setLastSoftDeletedIds([]);

    // Re-synchronise complètement depuis l’API
    await load();
  } catch (e) {
    setToast({ type: 'error', message: 'Erreur lors de la restauration' });
  }
};


  const rows = useMemo(() => data.items || [], [data.items]);

  /* =========================
     Filtres ↔ URL (shareable)
  ========================= */
  useEffect(() => {
    const params = new URLSearchParams();
    if (search?.trim()) params.set('q', search.trim());
    if (filters.categories?.length) params.set('cats', filters.categories.join(','));
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.authors?.length) params.set('authors', filters.authors.join(','));
    if (filters.featuredOnly) params.set('featured', '1');
    if (filters.stickyOnly) params.set('sticky', '1');
    if (filters.dateFrom) params.set('from', filters.dateFrom);
    if (filters.dateTo) params.set('to', filters.dateTo);
    if ((filters.ratingMin ?? 0) > 0) params.set('rmin', String(filters.ratingMin));
    if ((filters.ratingMax ?? 5) < 5) params.set('rmax', String(filters.ratingMax));
    params.set('sort', sortBy);
    params.set('dir', sortDir);
    params.set('page', String(page));
    params.set('pp', String(perPage));
    params.set('view', viewMode);
    const url = `${location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }, [search, filters, sortBy, sortDir, page, perPage, viewMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    const pickCsv = (k) => (params.get(k)?.split(',').map(s=>s.trim()).filter(Boolean) || []);
    const next = {
      categories: pickCsv('cats'),
      tags: pickCsv('tags'),
      authors: pickCsv('authors'),
      featuredOnly: params.get('featured') === '1',
      stickyOnly: params.get('sticky') === '1',
      unreadOnly: false,
      dateFrom: params.get('from') || '',
      dateTo: params.get('to') || '',
      ratingMin: Number(params.get('rmin') ?? 0) || 0,
      ratingMax: Number(params.get('rmax') ?? 5) || 5,
    };
    setSearch(q);
    setFilters(next);
    setSortBy(params.get('sort') || 'published_at');
    setSortDir(params.get('dir') || 'desc');
    setPage(Number(params.get('page') ?? 1));
    setPerPage(Number(params.get('pp') ?? 24));
    setViewMode(params.get('view') === 'grid' ? 'grid' : 'table');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     Vues enregistrées
  ========================= */
  const VIEWS_KEY = 'articles_saved_views_v1';
  function loadViews() { try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]'); } catch { return []; } }
  function saveViews(list) { localStorage.setItem(VIEWS_KEY, JSON.stringify(list.slice(0, 30))); }

  const [viewsModal, setViewsModal] = useState(false);
  const [views, setViews] = useState(loadViews());
  const [newViewName, setNewViewName] = useState('');

  const saveCurrentView = () => {
    const payload = {
      name: newViewName || `Vue ${new Date().toLocaleString()}`,
      search, filters, sortBy, sortDir, perPage, viewMode,
      createdAt: Date.now()
    };
    const next = [payload, ...views];
    setViews(next); saveViews(next);
    setNewViewName(''); setViewsModal(false);
    setToast({ type: 'success', message: 'Vue enregistrée' });
  };
  const applyView = (v) => {
    setSearch(v.search || '');
    setFilters(v.filters || {});
    setSortBy(v.sortBy || 'published_at');
    setSortDir(v.sortDir || 'desc');
    setPerPage(v.perPage || 24);
    setViewMode(v.viewMode || 'table');
    setViewsModal(false);
  };
  const deleteView = (idx) => {
    const next = views.filter((_, i) => i !== idx);
    setViews(next); saveViews(next);
  };

  /* =========================
     Colonnes configurables
  ========================= */
  const COLS_KEY = 'articles_visible_cols_v1';
  const defaultCols = { image:true, title:true, author:true, category:true, published_at:true, views:true, rating:true, status:true, actions:true, select:true };
  const [visibleCols, setVisibleCols] = useState(() => {
    try { return { ...defaultCols, ...(JSON.parse(localStorage.getItem(COLS_KEY) || '{}')) }; }
    catch { return defaultCols; }
  });
  useEffect(() => { localStorage.setItem(COLS_KEY, JSON.stringify(visibleCols)); }, [visibleCols]);
  const [colsOpen, setColsOpen] = useState(false);

  /* ===================
     Rendu
  =================== */
  return (
    <div className="relative bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}

      {/* Header */}
      <div className="p-5 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Articles</h2>
            <p className="text-sm/5 opacity-90">Filtres, tri, export, corbeille, DnD, multi-sélection, undo, vue table/grid, URL, vues, colonnes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={load} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded inline-flex items-center gap-2"><FaSync /> Actualiser</button>
            <Link to="/articles/new" className="px-3 py-2 bg-white text-blue-700 rounded hover:bg-gray-100">Créer</Link>
            <Link to="/articles/trashed" className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded">Corbeille</Link>

            {/* Bouton Vues enregistrées */}
            <button
              onClick={()=> setViewsModal(true)}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded inline-flex items-center gap-2"
              title="Vues enregistrées"
            >
              💾 Vues
            </button>

            {/* Toggle Filtres */}
            <button
              onClick={()=> setShowFilters(v=>!v)}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded inline-flex items-center gap-2"
              title="Afficher/Masquer les filtres (Maj+F)"
            >
              <FaFilter />
              <span>Filtres</span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 text-xs rounded-full bg-white/30 px-1">
                {activeFiltersCount}
              </span>
              {showFilters ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {/* Choix colonnes */}
            <div className="relative">
              <button
                onClick={()=> setColsOpen(o=>!o)}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded inline-flex items-center gap-2"
                title="Choisir les colonnes"
              >
                🧱 Colonnes
              </button>
              {colsOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border p-3 z-[75]">
                  {Object.keys(defaultCols).map(key => (
                    <label key={key} className="flex items-center justify-between py-1 text-sm">
                      <span className="capitalize text-blue-500">{key.replace('_',' ')}</span>
                      <input type="checkbox" className="accent-blue-600" checked={!!visibleCols[key]} onChange={()=> setVisibleCols(v => ({ ...v, [key]: !v[key] }))}/>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Vue Table/Grid */}
            <div className="ml-2 inline-flex bg-white/20 rounded overflow-hidden">
              <button
                className={`px-3 py-2 flex items-center gap-2 ${viewMode==='table'?'bg-white text-blue-700':'text-white/90 hover:bg-white/10'}`}
                onClick={()=>setViewMode('table')}
                title="Vue table"
              ><FaTable /> Table</button>
              <button
                className={`px-3 py-2 flex items-center gap-2 ${viewMode==='grid'?'bg-white text-blue-700':'text-white/90 hover:bg-white/10'}`}
                onClick={()=>setViewMode('grid')}
                title="Vue grid"
              ><FaThLarge /> Grid</button>
            </div>
          </div>
        </div>
      </div>

      {/* Barre d’actions multi */}
      {selectedIds.size > 0 && (
        <div className="sticky top-[56px] z-30 bg-amber-50 border-y border-amber-200 text-amber-900 px-4 py-2 flex items-center justify-between animate-[slideDown_160ms_ease-out]">
          <style>{`@keyframes slideDown{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div className="flex items-center gap-3">
            <FaCheckSquare /> <b>{selectedIds.size}</b> sélectionné(s)
            <button onClick={()=>openConfirm('soft-many', Array.from(selectedIds))} className="ml-3 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 inline-flex items-center gap-2"><FaTrashAlt /> Corbeille</button>
            <button onClick={()=>openConfirm('hard-many', Array.from(selectedIds))} className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-100 hover:bg-rose-200 text-rose-900 inline-flex items-center gap-2"><FaTrash /> Supprimer</button>
          </div>
          <button onClick={clearSelection} className="text-sm underline">Tout désélectionner</button>
        </div>
      )}

      {/* Filtres (pliables) */}
      <div
        className={`transition-all duration-200 ease-out
          ${showFilters ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'}
        `}
        aria-hidden={!showFilters}
      >
        {showFilters && (
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
        )}
      </div>

      {/* Bandeau compact quand filtres masqués */}
      {!showFilters && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Filtres masqués. Actifs : <b>{activeFiltersCount}</b>
          </div>
          <button
            onClick={()=> setShowFilters(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-sm inline-flex items-center gap-2"
            title="Afficher les filtres"
          >
            <FaFilter /> Afficher
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && <div className="bg-amber-50 border-y border-amber-200 text-amber-800 px-4 py-2">Chargement en cours…</div>}

      {/* === VUE TABLE === */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {visibleCols.select && (
                  <th className="px-3 py-3 text-xs font-medium text-slate-600">
                    <button className="inline-flex items-center gap-2 select-none" onClick={toggleSelectAllOnPage}>
                      {allSelectedOnPage ? <FaCheckSquare /> : <FaSquare />} Sélect.
                    </button>
                  </th>
                )}

                {visibleCols.image && <th className="px-3 py-3 text-xs font-medium text-slate-600">Image</th>}

                {visibleCols.title && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">
                    <button onClick={()=>toggleSort('title')} className="inline-flex items-center gap-1 hover:underline">
                      Titre <SortIcon col="title" />
                    </button>
                  </th>
                )}

                {visibleCols.author && <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Auteur</th>}
                {visibleCols.category && <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Catégorie</th>}

                {visibleCols.published_at && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">
                    <button onClick={()=>toggleSort('published_at')} className="inline-flex items-center gap-1 hover:underline">
                      Publié le <SortIcon col="published_at" />
                    </button>
                  </th>
                )}

                {visibleCols.views && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">
                    <button onClick={()=>toggleSort('view_count')} className="inline-flex items-center gap-1 hover:underline">
                      Vues <SortIcon col="view_count" />
                    </button>
                  </th>
                )}

                {visibleCols.rating && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">
                    <button onClick={()=>toggleSort('rating_average')} className="inline-flex items-center gap-1 hover:underline">
                      Note <SortIcon col="rating_average" />
                    </button>
                  </th>
                )}

                {visibleCols.status && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">
                    <button onClick={()=>toggleSort('status')} className="inline-flex items-center gap-1 hover:underline">
                      Statut <SortIcon col="status" />
                    </button>
                  </th>
                )}

                {visibleCols.actions && <th className="px-3 py-3 text-right text-xs font-medium text-slate-600">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {(data.items || []).map((article) => {
                const publicTo = buildPublicPath(article);
                const formattedViewCount = Number(article.view_count || 0) > 1000 ? `${(Number(article.view_count) / 1000).toFixed(1)}k` : `${article.view_count ?? 0}`;
                const formattedRating = article.rating_average ? parseFloat(article.rating_average).toFixed(1) : '0.0';
                const publishedAt = toDate(article.published_at);
                const createdAt   = toDate(article.created_at);
                const updatedAt   = toDate(article.updated_at);
                const pubDate = publishedAt ? formatDate(publishedAt) : '—';
                const pubTime = publishedAt ? formatTime(publishedAt) : '';
                const pubRel  = publishedAt ? formatRelative(publishedAt) : '';
                const updRel  = updatedAt ? formatRelative(updatedAt) : null;
                const creRel  = createdAt ? formatRelative(createdAt) : null;
                const isDragging = draggingId === article.id;
                const isSelected = selectedIds.has(article.id);

                return (
                  <tr
                    key={article.id}
                    className={`transition-all duration-200 group ${isDragging ? 'opacity-60 scale-[0.995] rotate-[0.2deg] shadow-inner' : 'hover:bg-slate-50/50'}`}
                    draggable
                    onDragStart={(e)=> onDragStartRow(e, article)}
                    onDragEnd={onDragEndRow}
                  >
                    {visibleCols.select && (
                      <td className="px-3 py-4">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" className="accent-blue-600" checked={isSelected} onChange={()=>toggleSelect(article.id)} />
                        </label>
                      </td>
                    )}

                    {visibleCols.image && (
                      <td className="px-3 py-4 cursor-grab active:cursor-grabbing">
                        <Thumb src={article.featured_image_url || article.featured_image || null} alt={article.featured_image_alt || article.title} className="w-12 h-12" />
                      </td>
                    )}

                    {visibleCols.title && (
                      <td className="px-3 py-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link to={publicTo} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors duration-200 block truncate" title={article.title} target="_blank" rel="noopener noreferrer">
                              {article.title || <span className="text-gray-400 italic">Sans titre</span>}
                            </Link>
                            <a href={publicTo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" title="Ouvrir l'article"><FaExternalLinkAlt size={12} /></a>
                          </div>
                          {article.excerpt && <div className="text-xs text-slate-500 truncate max-w-[420px] mt-1">{article.excerpt}</div>}
                          <div className="flex gap-1 mt-2">
                            {article.is_featured && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">⭐ À la une</span>)}
                            {article.is_sticky && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">📌 Épinglé</span>)}
                            {article.visibility && article.visibility !== 'public' && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">🔒 {article.visibility}</span>)}
                          </div>
                        </div>
                      </td>
                    )}

                    {visibleCols.author && (
                      <td className="px-3 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"><FaUser className="text-slate-500" size={12} /></div>
                          <div>
                            <div className="font-medium text-slate-900">{article.author_name || `Auteur #${article.author_id || '—'}`}</div>
                            {article.author_id && (<div className="text-xs text-slate-500">ID: {article.author_id}</div>)}
                          </div>
                        </div>
                      </td>
                    )}

                    {visibleCols.category && (
                      <td className="px-3 py-4 text-sm">
                        <span className="inline-flex items-center px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition-colors duration-200">
                          <FaTag className="mr-1" size={10} />{getCategoryFromTitle(article.title)}
                        </span>
                      </td>
                    )}

                    {visibleCols.published_at && (
                      <td className="px-3 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="text-slate-400" size={12} />
                          <div>
                            <div className="font-medium text-slate-900">{pubDate}</div>
                            <div className="text-xs text-slate-500">{publishedAt ? `${pubTime} • ${pubRel}` : '—'}</div>
                          </div>
                        </div>
                      </td>
                    )}

                    {visibleCols.views && (
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
                    )}

                    {visibleCols.rating && (
                      <td className="px-3 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><FaThumbsUp className="text-amber-600" size={12} /></div>
                          <div>
                            <div className="font-bold text-amber-700">{formattedRating}/5</div>
                            <div className="text-xs text-slate-500">{article.rating_count || 0} avis</div>
                          </div>
                        </div>
                      </td>
                    )}

                    {visibleCols.status && (
                      <td className="px-3 py-4 text-sm">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeClass(article.status)}`}>{article.status || 'draft'}</span>
                          <div className="text-xs text-slate-500 space-y-0.5">
                            {createdAt && (<div>Créé {creRel} • {formatDate(createdAt)} {formatTime(createdAt)}</div>)}
                            {updatedAt && (<div>Maj {updRel} • {formatDate(updatedAt)} {formatTime(updatedAt)}</div>)}
                          </div>
                        </div>
                      </td>
                    )}

                    {visibleCols.actions && (
                      <td className="px-3 py-4 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Link to={publicTo} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:scale-105 transition-all duration-200" title="Voir l'article"><FaEye size={14} /></Link>
                          <button className="p-2 rounded-lg border text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:scale-105 transition-all duration-200" onClick={()=>navigate(`/articles/${article.id}/edit`, { state: { article } })} title="Éditer"><FaEdit size={14} /></button>
                          <button className="p-2 rounded-lg border text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:scale-105 transition-all duration-200" onClick={()=>openConfirm('soft', article)} title="Envoyer à la corbeille"><FaTrashAlt size={14} /></button>
                          <button className="p-2 rounded-lg border text-red-600 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:scale-105 transition-all duration-200" onClick={()=>openConfirm('hard', article)} title="Supprimer définitivement"><FaTrash size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {(!loading && (data.items || []).length === 0) && (
                <tr>
                  <td className="p-10 text-center text-slate-500" colSpan={10}>
                    <div className="inline-flex flex-col items-center gap-2">
                      <div className="text-6xl mb-2">📝</div>
                      <p className="text-lg">Aucun article</p>
                      <button onClick={()=>{ setPage(1); load(); }} className="text-blue-600 hover:text-blue-800 text-sm">Actualiser</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* === VUE GRID === */}
      {viewMode === 'grid' && (
        <div className="p-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(data.items || []).map((article) => {
              const publicTo = buildPublicPath(article);
              const formattedViewCount = Number(article.view_count || 0) > 1000 ? `${(Number(article.view_count) / 1000).toFixed(1)}k` : `${article.view_count ?? 0}`;
              const formattedRating = article.rating_average ? parseFloat(article.rating_average).toFixed(1) : '0.0';
              const publishedAt = toDate(article.published_at);
              const pubDate = publishedAt ? formatDate(publishedAt) : '—';
              const pubRel  = publishedAt ? formatRelative(publishedAt) : '';
              const isSelected = selectedIds.has(article.id);
              const isDragging = draggingId === article.id;

              return (
                <div
                  key={article.id}
                  className={`relative rounded-xl border bg-white p-3 shadow-sm transition-all duration-200
                    ${isSelected ? 'ring-2 ring-blue-300 border-blue-300' : 'border-slate-200'}
                    ${isDragging ? 'opacity-60 scale-[0.99] rotate-[0.2deg]' : 'hover:shadow-md'}
                  `}
                  draggable
                  onDragStart={(e)=> onDragStartRow(e, article)}
                  onDragEnd={onDragEndRow}
                  title="Glisser vers le dock (corbeille / supprimer)"
                >
                  {/* Sélection */}
                  <label className="absolute top-2 left-2 inline-flex items-center gap-2 cursor-pointer select-none z-10">
                    <input type="checkbox" className="accent-blue-600 w-4 h-4" checked={isSelected} onChange={()=>toggleSelect(article.id)} />
                  </label>

                  {/* Image */}
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-lg mb-3 cursor-grab active:cursor-grabbing">
                    <Thumb src={article.featured_image_url || article.featured_image || null} alt={article.featured_image_alt || article.title} className="w-full h-full" />
                  </div>

                  {/* Titre */}
                  <div className="mb-2">
                    <Link to={publicTo} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 hover:text-blue-600 line-clamp-2">
                      {article.title || <span className="text-gray-400 italic">Sans titre</span>}
                    </Link>
                  </div>

                  {/* Meta */}
                  <div className="text-xs text-slate-600 flex items-center gap-2 mb-2">
                    <FaCalendarAlt className="text-slate-400" />
                    <span>{pubDate} • {pubRel}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="inline-flex items-center gap-1"><FaEye /> {formattedViewCount}</span>
                    <span className="inline-flex items-center gap-1"><FaThumbsUp className="text-amber-600" /> {formattedRating}/5</span>
                    <span className={`px-2 py-0.5 rounded-full border ${badgeClass(article.status)}`}>{article.status || 'draft'}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Link to={publicTo} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition">
                      <FaEye size={14} />
                    </Link>
                    <button className="p-2 rounded-lg border text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 transition" onClick={()=>navigate(`/articles/${article.id}/edit`, { state: { article } })}>
                      <FaEdit size={14} />
                    </button>
                    <button className="p-2 rounded-lg border text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 transition" onClick={()=>openConfirm('soft', article)}>
                      <FaTrashAlt size={14} />
                    </button>
                    <button className="p-2 rounded-lg border text-red-600 bg-rose-50 border-rose-200 hover:bg-rose-100 transition" onClick={()=>openConfirm('hard', article)}>
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {(!loading && (data.items || []).length === 0) && (
              <div className="col-span-full py-16 text-center text-slate-500">
                <div className="text-6xl mb-2">📝</div>
                <p className="text-lg">Aucun article</p>
                <button onClick={()=>{ setPage(1); load(); }} className="text-blue-600 hover:text-blue-800 text-sm mt-2">Actualiser</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t">
        <div className="text-sm text-slate-600">
          Total : <b>{data.meta.total || 0}</b> • Page <b>{data.meta.current_page || 1}</b> / <b>{data.meta.last_page || 1}</b>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Préc.</button>
          <button className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50" disabled={page>= (data.meta.last_page || 1)} onClick={()=>setPage(p=>p+1)}>Suiv.</button>
        </div>
      </div>

      {/* MODAL CONFIRM */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onMouseDown={(e)=> { if (e.target === e.currentTarget) closeConfirm(); }} role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button onClick={closeConfirm} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Fermer"><FaTimes /></button>

            <div className={`text-center ${String(confirmDelete.mode).startsWith('hard') ? 'bg-rose-50' : 'bg-amber-50'} p-6 rounded-md`}>
              {String(confirmDelete.mode).startsWith('hard') ? (
                <FaTrash className={`text-rose-600 text-5xl mb-4 mx-auto ${isDeleting ? 'animate-pulse' : ''}`} />
              ) : (
                <FaTrashAlt className={`text-amber-600 text-5xl mb-4 mx-auto ${isDeleting ? 'animate-pulse' : ''}`} />
              )}
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {String(confirmDelete.mode).startsWith('hard') ? 'Supprimer définitivement' : 'Envoyer à la corbeille'}
              </h3>
              <div className="text-gray-700 text-sm">
                {confirmDelete.id && (<div className="truncate">{confirmDelete.title || `#${confirmDelete.id}`}</div>)}
                {confirmDelete.ids && (<div className="font-medium">{confirmDelete.ids.length} élément(s)</div>)}
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <button onClick={closeConfirm} disabled={isDeleting} className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-60">Annuler</button>
              <button onClick={handleConfirmDelete} disabled={isDeleting} className={`px-5 py-2 text-white rounded-lg flex items-center disabled:opacity-70 ${String(confirmDelete.mode).startsWith('hard') ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                {isDeleting && <FaSpinner className="animate-spin mr-2" />} <FaCheck className="mr-2" /> Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCK DnD */}
      <div className="fixed right-4 bottom-4 z-[55] flex flex-col gap-3 select-none">
        <div
          onDragOver={allowDrop}
          onDragEnter={(e)=>{e.preventDefault(); setOverSoft(true);}}
          onDragLeave={()=>setOverSoft(false)}
          onDrop={onDropSoft}
          className={`w-52 rounded-xl border p-3 bg-white shadow transition-all
            ${overSoft ? 'border-amber-400 ring-2 ring-amber-200 scale-[1.03]' : 'border-slate-200'}
            ${pulseSoft ? 'animate-pulse' : ''}`}
          title="Glisser ici pour corbeille"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${overSoft ? 'bg-amber-100' : 'bg-amber-50'}`}>
              <FaTrashAlt className={`${overSoft ? 'animate-bounce' : ''} text-amber-600`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-800">Corbeille</div>
              <div className="text-xs text-slate-500">Soft delete</div>
            </div>
          </div>
        </div>

        <div
          onDragOver={allowDrop}
          onDragEnter={(e)=>{e.preventDefault(); setOverHard(true);}}
          onDragLeave={()=>setOverHard(false)}
          onDrop={onDropHard}
          className={`w-52 rounded-xl border p-3 bg-white shadow transition-all
            ${overHard ? 'border-rose-400 ring-2 ring-rose-200 scale-[1.03]' : 'border-slate-200'}
            ${shakeHard ? 'animate-[wiggle_0.5s_ease-in-out_1]' : ''}`}
          title="Glisser ici pour supprimer définitivement (avec confirmation)"
          style={{ animationName: shakeHard ? 'wiggle' : undefined }}
        >
          <style>{`@keyframes wiggle{0%{transform:rotate(0)}15%{transform:rotate(-2deg) scale(1.02)}30%{transform:rotate(2deg) scale(1.02)}45%{transform:rotate(-1.5deg)}60%{transform:rotate(1.5deg)}75%{transform:rotate(-1deg)}100%{transform:rotate(0)}}`}</style>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${overHard ? 'bg-rose-100' : 'bg-rose-50'}`}>
              <FaTrash className={`${overHard ? 'animate-bounce' : ''} text-rose-600`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-800">Supprimer</div>
              <div className="text-xs text-slate-500">Hard delete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Snackbar Undo */}
      {lastSoftDeletedIds.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[65]">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
            <span>{lastSoftDeletedIds.length} envoyé(s) à la corbeille.</span>
            <button onClick={handleUndo} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 inline-flex items-center gap-2" title="Annuler"><FaUndo /> Annuler</button>
            <button onClick={()=> setLastSoftDeletedIds([])} className="ml-2 text-white/70 hover:text-white" aria-label="Fermer"><FaTimes /></button>
          </div>
        </div>
      )}

      {/* Modale Vues enregistrées */}
      {viewsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4" onMouseDown={(e)=>{ if(e.target===e.currentTarget) setViewsModal(false); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={()=>setViewsModal(false)}><FaTimes/></button>
            <h3 className="text-lg font-semibold mb-4">Vues enregistrées</h3>

            <div className="mb-4 flex gap-2">
              <input
                value={newViewName}
                onChange={(e)=>setNewViewName(e.target.value)}
                placeholder="Nom de la vue"
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200"
              />
              <button onClick={saveCurrentView} className="px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Enregistrer</button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {views.length === 0 && <div className="text-slate-500 text-sm">Aucune vue enregistrée.</div>}
              {views.map((v, idx) => (
                <div key={`${v.createdAt}-${idx}`} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>applyView(v)} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-sm">Appliquer</button>
                    <button onClick={()=>deleteView(idx)} className="px-3 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticlesIndex;
