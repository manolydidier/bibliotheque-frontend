// src/pages/articles/ArticlesIndex.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Toast from '../../../../../component/toast/Toaster';
import {
  FaEye, FaCalendarAlt, FaTag, FaUser, FaEdit, FaTrashAlt, FaTrash,
  FaExternalLinkAlt, FaThumbsUp, FaFilter, FaUndo, FaCheckSquare, FaSquare,
  FaSort, FaSortUp, FaSortDown, FaTimes, FaSpinner, FaCheck, FaColumns,
} from 'react-icons/fa';
import {
  FiRefreshCw, FiPlus, FiTrash2, FiFilter as FiFilterIcon,
  FiChevronDown as FiChevronDownFi, FiChevronUp as FiChevronUpFi,
  FiGrid as FiGridIcon, FiList as FiListIcon, FiSave, FiTrash as FiTrashFeather
} from 'react-icons/fi';

import FiltersBar from './FiltersBar';

/* ===== NEW: FontAwesome pour icônes de catégories ===== */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar as faFaStar, faBook, faLeaf, faHeart as faFaHeart, faCoffee, faCamera,
  faGlobe, faMusic, faPen, faFilm, faFolder, faCode, faChartPie,
  faBriefcase, faCar, faLaptop, faGamepad, faShoppingCart,
  faBicycle, faPlane, faTree, faUserFriends, faHandshake,
  faBell, faFlag, faTools, faLightbulb, faMicrochip, faCloud, faGift
} from "@fortawesome/free-solid-svg-icons";

/* =========================
   Axios de base
========================= */
axios.defaults.baseURL = axios.defaults.baseURL || '/api';
const API = '/articles-index'; // <<< endpoint d’index

/* =========================
   CSRF (optionnel)
========================= */
const USE_SANCTUM = false;
let csrfReady = false;
const rootHTTP = axios.create({ baseURL: undefined, withCredentials: true });
async function ensureCsrf() {
  if (!USE_SANCTUM) return;
  if (csrfReady) return;
  try { await rootHTTP.get('/sanctum/csrf-cookie'); csrfReady = true; } catch {}
}

/* =========================
   Helpers API & mapping
========================= */
function normalizeList(payload, fallbackPerPage = 24) {
  const p0 = payload || {};
  const p = (
    p0 && p0.data && !Array.isArray(p0.data) &&
    (Array.isArray(p0.data.data) || p0.data.current_page !== undefined)
  ) ? p0.data : p0;

  const items =
    (Array.isArray(p?.data) ? p.data : null) ??
    (Array.isArray(p?.items) ? p.items : null) ??
    (Array.isArray(p0) ? p0 : []) ?? [];

  const rawMeta = (p?.meta && typeof p.meta === 'object') ? p.meta : p || {};

  const perPage = Number(rawMeta.per_page ?? p.per_page ?? fallbackPerPage) || fallbackPerPage;
  const currentPage = Number(rawMeta.current_page ?? p.current_page ?? p.page ?? 1) || 1;

  let total = rawMeta.total ?? p.total;
  if (typeof total !== 'number') {
    if (
      Array.isArray(items) &&
      (p.next_page_url ?? rawMeta.next_page_url ?? null) == null &&
      (p.prev_page_url ?? rawMeta.prev_page_url ?? null) == null
    ) {
      total = items.length;
    }
  }
  total = Number(total) || 0;

  let lastPage = rawMeta.last_page ?? p.last_page;
  if (typeof lastPage !== 'number') {
    if (total && perPage) {
      lastPage = Math.max(1, Math.ceil(total / perPage));
    } else {
      const hasNextHint = !!(p.next_page_url ?? rawMeta.next_page_url ?? false);
      lastPage = hasNextHint ? (currentPage + 1) : currentPage;
    }
  }
  lastPage = Number(lastPage) || 1;

  const hasNext = !!(p.next_page_url ?? rawMeta.next_page_url ?? null);
  const hasPrev = !!(p.prev_page_url ?? rawMeta.prev_page_url ?? null);

  return {
    items,
    meta: {
      current_page: currentPage,
      last_page: lastPage,
      total,
      per_page: perPage,
      facets: rawMeta.facets ?? null,
      has_next: hasNext,
      has_prev: hasPrev
    },
  };
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

  // ⚠️ status (published par défaut)
  if (filters?.status) q.status = filters.status;
  if (filters?.visibility) q.visibility = filters.visibility;

  return q;
}

async function apiList(args) {
  const params = buildQuery(args);
  const { data } = await axios.get(API, { params });
  return normalizeList(data, args.per_page);
}
async function apiSoftDelete(id) { await ensureCsrf(); return axios.post(`/articles/${id}/soft-delete`); }
async function apiForceDelete(id) {
  await ensureCsrf();
  try { return await axios.delete(`/articles/${id}/hard-delete`); }
  catch (e) {
    if (e?.response?.status === 404) return axios.delete(`/articles/${id}`, { params: { force: 1 } });
    throw e;
  }
}
async function apiRestore(id) { await ensureCsrf(); return axios.post(`/articles/${id}/restore`); }

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
      JSON.stringify(a.ui_status ?? a.status ?? ''),
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
   Collapse (accordéon stable via CSS Grid)
========================= */
function Collapse({ open, children, duration = 260 }) {
  return (
    <div
      className="grid transition-[grid-template-rows] ease-in-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr', transitionDuration: `${duration}ms` }}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/* =========================
   PORTAL (pour éviter le clipping)
========================= */
const Portal = ({ children }) => {
  const el = React.useMemo(() => document.createElement('div'), []);
  useEffect(() => {
    document.body.appendChild(el);
    return () => { document.body.removeChild(el); };
  }, [el]);
  return ReactDOM.createPortal(children, el);
};

/* =======================================================
   NEW: Couleurs & Icônes de catégories (discret, dominant)
======================================================= */
const ICON_MAP = {
  "fa-star": faFaStar, "fa-book": faBook, "fa-leaf": faLeaf, "fa-heart": faFaHeart,
  "fa-coffee": faCoffee, "fa-camera": faCamera, "fa-globe": faGlobe,
  "fa-music": faMusic, "fa-pen": faPen, "fa-film": faFilm, "fa-folder": faFolder,
  "fa-code": faCode, "fa-chart-pie": faChartPie, "fa-briefcase": faBriefcase,
  "fa-car": faCar, "fa-laptop": faLaptop, "fa-gamepad": faGamepad,
  "fa-shopping-cart": faShoppingCart, "fa-bicycle": faBicycle, "fa-plane": faPlane,
  "fa-tree": faTree, "fa-user-friends": faUserFriends, "fa-handshake": faHandshake,
  "fa-bell": faBell, "fa-flag": faFlag, "fa-tools": faTools,
  "fa-lightbulb": faLightbulb, "fa-microchip": faMicrochip, "fa-cloud": faCloud,
  "fa-gift": faGift,
};

function hexToRgb(hex) {
  if (!hex) return { r: 100, g: 116, b: 139 }; // slate-500 fallback
  const m = hex.trim().replace('#','');
  const n = m.length === 3 ? m.split('').map(x => x + x).join('') : m.padEnd(6, '0').slice(0,6);
  const r = parseInt(n.slice(0,2), 16);
  const g = parseInt(n.slice(2,4), 16);
  const b = parseInt(n.slice(4,6), 16);
  return { r, g, b };
}
function rgba(hex, a = 1) {
  const { r, g, b } = hexToRgb(hex || '#64748b');
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function getPrimaryCategory(categories = []) {
  if (!Array.isArray(categories) || categories.length === 0) return null;
  return categories.find(c => c?.pivot?.is_primary === 1) || categories[0];
}
function deriveCategoryMeta(article) {
  const c = getPrimaryCategory(article?.categories);
  const name = c?.name || getCategoryFromTitle(article?.title);
  const color = c?.color || '#64748b';
  const iconKey = c?.icon || 'fa-folder';
  return { name, color, iconKey };
}

/* =========
   GLOBAL: toggle “couleur des cards” partagé avec FiltersBar / Grid / List
========== */
const COLOR_PREF_KEY = 'gridcard-color-enabled';

/* =========================
   Composant principal
========================= */
const ArticlesIndex = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [restoredIds, setRestoredIds] = useState(new Set());
  useEffect(() => {
    const ids = Array.isArray(location.state?.restoredIds) ? location.state.restoredIds : [];
    if (ids.length) {
      setRestoredIds(new Set(ids));
      navigate(location.pathname + location.search, { replace: true });
    }
  }, []); // mount only

  useEffect(() => {
    if (restoredIds.size === 0) return;
    const clear = () => setRestoredIds(new Set());
    const opts = { once: true, passive: true };
    window.addEventListener('pointerdown', clear, opts);
    window.addEventListener('keydown', clear, opts);
    window.addEventListener('wheel', clear, opts);
    return () => {
      window.removeEventListener('pointerdown', clear);
      window.removeEventListener('keydown', clear);
      window.removeEventListener('wheel', clear);
    };
  }, [restoredIds]);

  // Recherche & filtres (⚠️ status par défaut = 'published')
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    categories: [], tags: [], authors: [],
    featuredOnly: false, stickyOnly: false, unreadOnly: false,
    dateFrom: '', dateTo: '', ratingMin: 0, ratingMax: 5,
    status: 'published', visibility: undefined
  });

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
  const SortIcon = ({ col }) => (sortBy !== col ? <FaSort className="opacity-40" /> : (sortDir === 'asc' ? <FaSortUp /> : <FaSortDown />));

  // Données + facettes
  const [data, setData] = useState({ items: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 24, facets: { categories: [], tags: [], authors: [] }, has_next: false, has_prev: false } });

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Compteur corbeille
  const [trashCount, setTrashCount] = useState(0);

  // Modal suppression
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id|ids, mode, title }

  // Drag & Drop
  const [overSoft, setOverSoft] = useState(false);
  const [overHard, setOverHard] = useState(false);
  const [shakeHard, setShakeHard] = useState(false);

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState(new Set());
  const allSelectedOnPage = useMemo(() => {
    const ids = (data.items || []).map(a => a.id);
    return ids.length > 0 && ids.every(id => selectedIds.has(id));
  }, [selectedIds, data.items]);

  // Undo (restore)
  const [lastSoftDeletedIds, setLastSoftDeletedIds] = useState([]);

  /* ===== Accordéon Filtres — état persistant ===== */
  const [showFilters, setShowFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFlag = params.get('filters_open'); // '1' | '0' | null
    if (urlFlag === '1') return true;
    if (urlFlag === '0') return false;
    try { return localStorage.getItem('articles_filters_open') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('articles_filters_open', showFilters ? '1' : '0'); } catch {}
  }, [showFilters]);

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

  // === Compteur corbeille ===
  async function fetchTrashCount() {
    try {
      const { data } = await axios.get('/corbeille', { params: { per_page: 1 } });
      const { meta } = normalizeList(data, 1);
      setTrashCount(Number(meta?.total || 0));
    } catch (err1) {
      try {
        const { data } = await axios.get('/articles', { params: { trashed: 'only', per_page: 1 } });
        const { meta } = normalizeList(data, 1);
        setTrashCount(Number(meta?.total || 0));
      } catch {}
    }
  }
  useEffect(() => { fetchTrashCount(); }, []);

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
        await fetchTrashCount();
      }
      if (confirmDelete.mode === 'hard') {
        await apiForceDelete(confirmDelete.id);
        setToast({ type: 'success', message: 'Supprimé définitivement' });
        setShakeHard(true); setTimeout(()=> setShakeHard(false), 500);
        await fetchTrashCount();
      }
      if (confirmDelete.mode === 'soft-many') {
        const ids = confirmDelete.ids || [];
        const results = await Promise.allSettled(ids.map(id => apiSoftDelete(id)));
        const ok = results.filter(r => r.status === 'fulfilled').length;
        setLastSoftDeletedIds(ids);
        setToast({ type: 'success', message: `Corbeille : ${ok}/${ids.length} article(s)` });
        await fetchTrashCount();
      }
      if (confirmDelete.mode === 'hard-many') {
        const ids = confirmDelete.ids || [];
        const results = await Promise.allSettled(ids.map(id => apiForceDelete(id)));
        const ok = results.filter(r => r.status === 'fulfilled').length;
        setToast({ type: 'success', message: `Supprimé(s) : ${ok}/${ids.length} article(s)` });
        setShakeHard(true); setTimeout(()=> setShakeHard(false), 500);
        await fetchTrashCount();
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

  /* ===================
     Drag & Drop events
  =================== */
  const onDragStartRow = (e, article) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: article.id, title: article.title }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDropSoft = async (e) => {
    e.preventDefault(); setOverSoft(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (!payload?.id) return;
      await apiSoftDelete(payload.id);
      setLastSoftDeletedIds([payload.id]);
      setToast({ type: 'success', message: `Article "${payload.title || payload.id}" → corbeille` });
      await load(); await fetchTrashCount();
    } catch { setToast({ type: 'error', message: 'Erreur lors de l’envoi à la corbeille' }); }
  };
  const onDropHard = async (e) => {
    e.preventDefault(); setOverHard(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
      if (!payload?.id) return;
      openConfirm('hard', { id: payload.id, title: payload.title });
    } catch { setToast({ type: 'error', message: 'Erreur lors de la suppression' }); }
  };

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
    if (filters.status) params.set('status', String(filters.status));
    if (filters.visibility) params.set('visibility', String(filters.visibility));
    params.set('filters_open', showFilters ? '1' : '0');
    params.set('sort', sortBy);
    params.set('dir', sortDir);
    params.set('page', String(page));
    params.set('pp', String(perPage));
    params.set('view', viewMode);
    const url = `${location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }, [search, filters, sortBy, sortDir, page, perPage, viewMode, showFilters, location.pathname]);

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
      status: params.get('status') || 'published',
      visibility: params.get('visibility') || undefined,
    };
    setSearch(q);
    setFilters(next);
    setSortBy(params.get('sort') || 'published_at');
    setSortDir(params.get('dir') || 'desc');
    setPage(Number(params.get('page') ?? 1));
    setPerPage(Number(params.get('pp') ?? 24));
    setViewMode(params.get('view') === 'grid' ? 'grid' : 'table');
    const openFlag = params.get('filters_open');
    if (openFlag === '1') setShowFilters(true);
    else if (openFlag === '0') setShowFilters(false);
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
    const payload = { name: newViewName || `Vue ${new Date().toLocaleString()}`, search, filters, sortBy, sortDir, perPage, viewMode, createdAt: Date.now() };
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

  const colsBtnRef = useRef(null);
  const colsMenuRef = useRef(null);

  const [colsPos, setColsPos] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    if (!colsOpen || !colsBtnRef.current) return;
    const upd = () => {
      const r = colsBtnRef.current.getBoundingClientRect();
      setColsPos({ top: r.bottom + window.scrollY + 8, left: r.left + window.scrollX, width: r.width });
    };
    upd();
    window.addEventListener('scroll', upd, true);
    window.addEventListener('resize', upd);
    return () => {
      window.removeEventListener('scroll', upd, true);
      window.removeEventListener('resize', upd);
    };
  }, [colsOpen]);

  useEffect(() => {
    if (!colsOpen) return;
    const onDown = (e) => {
      const t = e.target;
      if (colsMenuRef.current?.contains(t)) return;
      if (colsBtnRef.current?.contains(t)) return;
      setColsOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setColsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [colsOpen]);

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  /* =========================
     Toggle global "couleur des cards" (synchro FiltersBar)
  ========================= */
  const [colorEnabled, setColorEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(COLOR_PREF_KEY);
      return raw == null ? true : JSON.parse(raw);
    } catch { return true; }
  });
  useEffect(() => {
    const handler = (e) => {
      const enabled = e?.detail?.enabled;
      if (typeof enabled === 'boolean') setColorEnabled(enabled);
    };
    window.addEventListener('gridcard:colorpref', handler);
    return () => window.removeEventListener('gridcard:colorpref', handler);
  }, []);

  /* ===================
     Rendu
  =================== */
  return (
    <div className="relative bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 flex flex-col">
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}

      {/* Styles anim */}
      <style>{`
        @keyframes restoredPulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.55);background:#ecfdf5}60%{box-shadow:0 0 0 6px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0);background:transparent}}
        @keyframes restoredIdle{0%{box-shadow:0 0 0 0 rgba(16,185,129,.25);background:#f0fdf4}50%{box-shadow:0 0 0 6px rgba(16,185,129,0);background:#fff}100%{box-shadow:0 0 0 0 rgba(16,185,129,0);background:#f0fdf4}}
        tr.row-restored-hold{animation:restoredPulse .9s ease-out 0s 1 both,restoredIdle 2.4s ease-in-out .9s infinite both}
        .card-restored-hold{animation:restoredPulse .9s ease-out 0s 1 both,restoredIdle 2.4s ease-in-out .9s infinite both;border-radius:12px}
        @media(prefers-reduced-motion:reduce){tr.row-restored-hold,.card-restored-hold{animation:none!important;outline:2px solid #34d399;background:#ecfdf5}}
        @keyframes wiggle{0%{transform:rotate(0)}15%{transform:rotate(-1.5deg) scale(1.01)}30%{transform:rotate(1.5deg) scale(1.01)}45%{transform:rotate(-1deg)}60%{transform:rotate(1deg)}75%{transform:rotate(-.5deg)}100%{transform:rotate(0)}}
      `}</style>

      {/* ===== Header ===== */}
      <div className="relative overflow-hidden p-5 border-b bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-cyan-300/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Articles</h2>
            <p className="text-sm text-white/90 mt-1">Gestion des articles du backoffice</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/articles/new" className="px-3 py-2 rounded-xl bg-white text-blue-700 hover:bg-white/95 border border-white/40 shadow-sm inline-flex items-center gap-2 transition" title="Créer un article">
              <FiPlus /> Créer
            </Link>

            {/* Colonnes */}
            <div className="relative z-50">
              <button
                ref={colsBtnRef}
                onClick={() => setColsOpen(v => !v)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition text-white"
                title="Colonnes visibles"
                type="button"
              >
                <FaColumns className="opacity-90" />
                <span>Colonnes</span>
              </button>

              {colsOpen && (
                <Portal>
                  <div
                    ref={colsMenuRef}
                    style={{ position: 'absolute', top: colsPos.top, left: colsPos.left, minWidth: Math.max(256, colsPos.width), zIndex: 9999 }}
                    className="rounded-xl border bg-white/95 backdrop-blur shadow-xl p-3 text-slate-800"
                    role="menu"
                    aria-label="Sélection des colonnes"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Colonnes visibles</span>
                      <div className="flex gap-2">
                        <button className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                          onClick={() => setVisibleCols(prev => Object.fromEntries(Object.keys(prev).map(k => [k, true])))} type="button">
                          Tout
                        </button>
                        <button className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                          onClick={() => setVisibleCols(prev => { const allOff = Object.fromEntries(Object.keys(prev).map(k => [k, false])); allOff.select = true; allOff.actions = true; return allOff; })}
                          type="button">
                          Aucun
                        </button>
                        <button className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50" onClick={() => setVisibleCols(defaultCols)} type="button" title="Réinitialiser">
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-sm">
                      {[
                        ['select','Sélection'],['image','Image'],['title','Titre'],['author','Auteur'],['category','Catégorie'],
                        ['published_at','Publié le'],['views','Vues'],['rating','Note'],['status','Statut'],['actions','Actions'],
                      ].map(([key, label]) => (
                        <label key={key} className="inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" className="accent-blue-600" checked={!!visibleCols[key]} onChange={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </Portal>
              )}
            </div>

            <button onClick={load} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition" title="Actualiser">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>

            <button onClick={() => setViewsModal(true)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition" title="Vues enregistrées">
              <FiSave /> Vues
            </button>

            <button
              onClick={() => setShowFilters(v => !v)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm inline-flex items-center gap-2 transition"
              title="Afficher/Masquer les filtres (Maj+F)"
            >
              <FiFilterIcon />
              <span>Filtres</span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 text-[11px] font-semibold rounded-full bg-white/20 px-1">{activeFiltersCount}</span>
              {showFilters ? <FiChevronUpFi /> : <FiChevronDownFi />}
            </button>

            {/* Filtre Statut */}
            <div className="ml-2">
              <label className="sr-only" htmlFor="statusFilter">Statut</label>
              <select
                id="statusFilter"
                value={filters.status || 'published'}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value || 'published' }))}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm"
                title="Filtrer par statut"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="ml-2 inline-flex rounded-xl bg-white/10 p-1 border border-white/20 backdrop-blur-sm">
              <button className={`px-3 py-2 rounded-lg flex items-center gap-2 transition ${viewMode === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/90 hover:bg-white/10'}`} onClick={() => setViewMode('table')} title="Vue table"><FiListIcon /> Table</button>
              <button className={`px-3 py-2 rounded-lg flex items-center gap-2 transition ${viewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/90 hover:bg-white/10'}`} onClick={() => setViewMode('grid')} title="Vue grid"><FiGridIcon /> Grid</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Accordéon Filtres ===== */}
      <div className="border-b bg-white">
        <button
          type="button"
          onClick={() => setShowFilters(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-slate-700 hover:bg-slate-50 transition"
          aria-expanded={showFilters}
          aria-controls="filters-panel"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <FaFilter className="text-slate-500" /> Filtres
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 px-1">{activeFiltersCount}</span>
          </span>
          <span className="text-slate-500">{showFilters ? <FiChevronUpFi /> : <FiChevronDownFi />}</span>
        </button>

        <Collapse open={showFilters}>
          <div id="filters-panel">
            <FiltersBar
              search={search} setSearch={setSearch}
              filters={filters} setFilters={setFilters}
              perPage={perPage} setPerPage={setPerPage}
              facets={data?.meta?.facets || {}}
              onExportClick={handleExport}
            />
          </div>
        </Collapse>
      </div>

      {/* ===== Zone scrollable ===== */}
      <div
        className="flex-1 overflow-y-auto pb-36"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
      >
        {loading && (
          <div className="bg-amber-50 border-y border-amber-200 text-amber-800 px-4 py-2">Chargement en cours…</div>
        )}

        {/* === VUE TABLE === */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {visibleCols.select && (
                    <th className="px-3 py-3 text-xs font-medium text-slate-600">
                      <button
                        className="inline-flex items-center gap-2 select-none"
                        onClick={()=>{
                          const ids = (data.items || []).map(a => a.id);
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (ids.length && ids.every(id => next.has(id))) ids.forEach(id => next.delete(id));
                            else ids.forEach(id => next.add(id));
                            return next;
                          });
                        }}
                      >
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
                  const { name: catName, color: catColorFromMeta, iconKey: catIconKey } = deriveCategoryMeta(article);
                  const CatIcon = ICON_MAP[catIconKey] || faFolder;

                  // ✅ respect du toggle global
                  const tone = colorEnabled ? catColorFromMeta : '#64748b';

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

                  const uiStatus = article.ui_status
                    ? String(article.ui_status).toLowerCase()
                    : (article.deleted_at ? 'archived' : String(article.status || 'draft').toLowerCase());
                  const isArchived = uiStatus === 'archived';

                  // Teinte dominante très légère pour la ligne (onHover un peu plus marqué)
                  const rowBgBase  = rgba(tone, 0.04);
                  const rowBgHover = rgba(tone, 0.08);

                  return (
                    <tr
                      key={article.id}
                      className={`transition-colors duration-200 group ${restoredIds.has(article.id) ? 'row-restored-hold' : ''}`}
                      draggable
                      onDragStart={(e)=> onDragStartRow(e, article)}
                      style={{ background: `linear-gradient(180deg, ${rowBgBase} 0%, rgba(255,255,255,0.96) 65%)` }}
                      onMouseEnter={(e)=>{ e.currentTarget.style.background = `linear-gradient(180deg, ${rowBgHover} 0%, rgba(255,255,255,0.98) 65%)`; }}
                      onMouseLeave={(e)=>{ e.currentTarget.style.background = `linear-gradient(180deg, ${rowBgBase} 0%, rgba(255,255,255,0.96) 65%)`; }}
                    >
                      {visibleCols.select && (
                        <td className="px-3 py-4">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="accent-blue-600"
                              checked={selectedIds.has(article.id)}
                              onChange={()=> setSelectedIds(prev => { const n=new Set(prev); n.has(article.id)?n.delete(article.id):n.add(article.id); return n; })}
                            />
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
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200"
                            title={catName}
                            style={{
                              backgroundColor: rgba(tone, 0.16),
                              border: `1px solid ${rgba(tone, 0.28)}`,
                              color: '#0f172a'
                            }}
                          >
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-md mr-1.5"
                              style={{ backgroundColor: rgba(tone, 0.18), border: `1px solid ${rgba(tone, 0.30)}` }}
                            >
                              <FontAwesomeIcon icon={CatIcon} className="text-[11px]" style={{ color: tone }} />
                            </span>
                            {catName}
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
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeClass(uiStatus)}`}>{uiStatus}</span>
                            <div className="text-xs text-slate-500 space-y-0.5">
                              {creRel && (<div>Créé {creRel} • {formatDate(toDate(article.created_at))} {formatTime(toDate(article.created_at))}</div>)}
                              {updRel && (<div>Maj {updRel} • {formatDate(toDate(article.updated_at))} {formatTime(toDate(article.updated_at))}</div>)}
                            </div>
                          </div>
                        </td>
                      )}

                      {visibleCols.actions && (
                        <td className="px-3 py-4 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Link to={publicTo} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition" title="Voir l'article"><FaEye size={14} /></Link>

                            <button
                              className={`p-2 rounded-lg border transition ${isArchived ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed' : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
                              onClick={()=>{ if (!isArchived) navigate(`/articles/${article.id}/edit`, { state: { article } }); }}
                              title={isArchived ? 'Édition interdite (archived)' : 'Éditer'}
                              disabled={isArchived}
                            >
                              <FaEdit size={14} />
                            </button>

                            <button className="p-2 rounded-lg border text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 transition" onClick={()=>openConfirm('soft', article)} title="Envoyer à la corbeille"><FaTrashAlt size={14} /></button>
                            <button className="p-2 rounded-lg border text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100 transition" onClick={()=>openConfirm('hard', article)} title="Supprimer définitivement"><FaTrash size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {(!loading && (data.items || []).length === 0) && (
                  <tr>
                    <td className="p-10 text-center text-slate-500" colSpan={visibleColCount}>
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
                const { name: catName, color: catColorFromMeta, iconKey: catIconKey } = deriveCategoryMeta(article);
                const CatIcon = ICON_MAP[catIconKey] || faFolder;

                // ✅ respect du toggle global
                const tone = colorEnabled ? catColorFromMeta : '#64748b';

                const formattedViewCount = Number(article.view_count || 0) > 1000 ? `${(Number(article.view_count) / 1000).toFixed(1)}k` : `${article.view_count ?? 0}`;
                const formattedRating = article.rating_average ? parseFloat(article.rating_average).toFixed(1) : '0.0';
                const publishedAt = toDate(article.published_at);
                const pubDate = publishedAt ? formatDate(publishedAt) : '—';
                const pubRel  = publishedAt ? formatRelative(publishedAt) : '';

                const uiStatus = article.ui_status
                  ? String(article.ui_status).toLowerCase()
                  : (article.deleted_at ? 'archived' : String(article.status || 'draft').toLowerCase());
                const isArchived = uiStatus === 'archived';

                return (
                  <div
                    key={article.id}
                    className={`relative rounded-xl border bg-white p-3 shadow-sm transition-all duration-200 border-slate-200 hover:shadow-md ${restoredIds.has(article.id) ? 'card-restored-hold' : ''}`}
                    draggable
                    title="Glisser vers le dock (corbeille / supprimer)"
                    style={{
                      background: `linear-gradient(180deg, ${rgba(tone, 0.06)} 0%, rgba(255,255,255,0.98) 80%)`,
                      borderColor: rgba(tone, 0.30)
                    }}
                  >
                    {/* Badge Catégorie en haut à gauche */}
                    <div className="absolute top-2 left-2 z-10">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: rgba(tone, 0.18), border: `1px solid ${rgba(tone, 0.32)}`, color: '#0f172a' }}
                        title={catName}
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md mr-1"
                              style={{ backgroundColor: rgba(tone, 0.20), border: `1px solid ${rgba(tone, 0.32)}` }}>
                          <FontAwesomeIcon icon={CatIcon} className="text-[11px]" style={{ color: tone }} />
                        </span>
                        {catName}
                      </span>
                    </div>

                    <label className="absolute top-2 right-2 inline-flex items-center gap-2 cursor-pointer select-none z-10">
                      <input
                        type="checkbox"
                        className="accent-blue-600 w-4 h-4"
                        checked={selectedIds.has(article.id)}
                        onChange={()=> setSelectedIds(prev => { const n=new Set(prev); n.has(article.id)?n.delete(article.id):n.add(article.id); return n; })}
                      />
                    </label>

                    <div className="aspect-[16/9] w-full overflow-hidden rounded-lg mb-3">
                      <Thumb src={article.featured_image_url || article.featured_image || null} alt={article.featured_image_alt || article.title} className="w-full h-full" />
                    </div>

                    <div className="mb-2">
                      <Link to={publicTo} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 hover:text-blue-600 line-clamp-2">
                        {article.title || <span className="text-gray-400 italic">Sans titre</span>}
                      </Link>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-2 mb-2">
                      <FaCalendarAlt className="text-slate-400" />
                      <span>{pubDate} • {pubRel}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="inline-flex items-center gap-1"><FaEye /> {formattedViewCount}</span>
                      <span className="inline-flex items-center gap-1"><FaThumbsUp className="text-amber-600" /> {formattedRating}/5</span>
                      <span className={`px-2 py-0.5 rounded-full border ${badgeClass(uiStatus)}`}>{uiStatus}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Link to={publicTo} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition">
                        <FaEye size={14} />
                      </Link>

                      <button
                        className={`p-2 rounded-lg border transition ${isArchived ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed' : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
                        onClick={()=>{ if (!isArchived) navigate(`/articles/${article.id}/edit`, { state: { article } }); }}
                        title={isArchived ? 'Édition interdite (archived)' : 'Éditer'}
                        disabled={isArchived}
                      >
                        <FaEdit size={14} />
                      </button>

                      <button className="p-2 rounded-lg border text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 transition" onClick={()=>openConfirm('soft', article)}>
                        <FaTrashAlt size={14} />
                      </button>
                      <button className="p-2 rounded-lg border text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100 transition" onClick={()=>openConfirm('hard', article)}>
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
      </div>

      {/* Pagination sticky */}
      <div className="absolute w-full bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/95 backdrop-blur border-t rounded-b-xl shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
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

      {/* DOCK DnD — Corbeille & Supprimer */}
      <div className="fixed right-60 bottom-8 z-[75] flex flex-wrap gap-2 sm:gap-3 select-none">
        <div
          onDragOver={(e)=>{e.preventDefault();}}
          onDragEnter={(e)=>{e.preventDefault(); setOverSoft(true);}}
          onDragLeave={()=>setOverSoft(false)}
          onDrop={onDropSoft}
          onClick={() => navigate('/articles/trashed', { state: { fromIndex: true } })}
          className={`
            group relative inline-flex items-center gap-3
            rounded-full px-4 py-2 text-sm
            bg-blue-600 text-white cursor-pointer
            ring-1 ring-blue-300/40 shadow-sm
            transition-[transform,box-shadow,background-color] duration-200
            ${overSoft ? 'scale-[1.03] ring-blue-200 shadow-md' : 'hover:scale-[1.01] hover:shadow-md'}
          `}
          title="Glisser ici pour corbeille (clic pour ouvrir)"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 ring-1 ring-white/10">
            <FiTrash2 className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight flex items-center gap-2">
              <span>Corbeille</span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold bg-white/20">{trashCount}</span>
            </div>
            <div className="text-[10px] text-white/80">Soft delete</div>
          </div>
        </div>

        <div
          onDragOver={(e)=>{e.preventDefault();}}
          onDragEnter={(e)=>{e.preventDefault(); setOverHard(true);}}
          onDragLeave={()=>setOverHard(false)}
          onDrop={onDropHard}
          className={`
            group relative inline-flex items-center gap-3
            rounded-full px-4 py-2 text-sm
            bg-blue-600 text-white
            ring-1 ring-blue-300/40 shadow-sm
            transition-[transform,box-shadow,background-color] duration-200
            ${overHard ? 'scale-[1.03] ring-blue-200 shadow-md' : 'hover:scale-[1.01] hover:shadow-md'}
            ${shakeHard ? 'animate-[wiggle_0.5s_ease-in-out_1]' : ''}
          `}
          title="Glisser ici pour supprimer définitivement (avec confirmation)"
          style={{ animationName: shakeHard ? 'wiggle' : undefined }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 ring-1 ring-white/10">
            <FiTrashFeather className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Supprimer</div>
            <div className="text-[10px] text-white/80">Hard delete</div>
          </div>
        </div>
      </div>

      {/* Snackbar Undo */}
      {lastSoftDeletedIds.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[65]">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
            <span>{lastSoftDeletedIds.length} envoyé(s) à la corbeille.</span>
            <button onClick={async () => {
              const ids = [...lastSoftDeletedIds];
              try {
                await Promise.all(ids.map((id) => apiRestore(id)));
                setRestoredIds(new Set(ids));
                setToast({ type: 'success', message: `Restauration : ${ids.length}/${ids.length}` });
                setLastSoftDeletedIds([]);
                await load(); await fetchTrashCount();
              } catch (e) { setToast({ type: 'error', message: 'Erreur lors de la restauration' }); }
            }} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 inline-flex items-center gap-2" title="Annuler"><FaUndo /> Annuler</button>
            <button onClick={()=> setLastSoftDeletedIds([])} className="ml-2 text-white/70 hover:text-white" aria-label="Fermer"><FaTimes /></button>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================
   Helpers UI
========================= */
const badgeClass = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'published': return 'bg-green-100 text-green-700 border-green-200';
    case 'archived':  return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'draft':
    case 'pending':
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
    <img src={src} alt={alt || 'thumb'} className={`object-cover rounded-lg shadow-sm overflow-hidden ${className}`} />
  ) : (
    <div className={`rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ${className}`}>📝</div>
  )
);

export default ArticlesIndex;
