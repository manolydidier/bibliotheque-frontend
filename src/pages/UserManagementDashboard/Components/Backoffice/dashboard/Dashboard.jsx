// src/pages/dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
  FiRefreshCw, FiFileText, FiCheckCircle, FiUsers,
  FiMessageCircle, FiShare2, FiDownload, FiUserPlus, FiEye,
  FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiExternalLink, FiLock
} from 'react-icons/fi';
import { FaThLarge, FaTable } from 'react-icons/fa';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line
} from 'recharts';
import { FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';
/* =========================
   Axios & constantes
========================= */
axios.defaults.baseURL = axios.defaults.baseURL || '/api';
axios.defaults.withCredentials = true;

// 🔐 Auth + anti-cache
axios.interceptors.request.use((config) => {
  const t = (typeof window !== 'undefined') ? localStorage.getItem('tokenGuard') : null;
  if (t && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  config.headers = { ...(config.headers || {}), 'Cache-Control': 'no-cache' };
  return config;
});

// Intercepteur réponses (401, 429)
let retrying = false;
axios.interceptors.response.use(
  (r) => r,
  async (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      window.location.href = '/auth';
      return Promise.reject(err);
    }
    if (status === 429 && !retrying) {
      retrying = true;
      await new Promise(res => setTimeout(res, 800));
      retrying = false;
      return axios.request(err.config);
    }
    return Promise.reject(err);
  }
);

const PAGE_SIZE = 100;
const nf = (n) => new Intl.NumberFormat('fr-FR').format(Number(n || 0));
const kfmt = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
  : String(n);

/* Palette minimaliste */
const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  grid: '#f1f5f9',
  text: '#1e293b'
};

const TABS = [
  { key: 'resume', label: 'Résumé', icon: <FiTrendingUp /> },
  { key: 'audience', label: 'Audience', icon: <FiEye /> },
  { key: 'contenu', label: 'Contenu', icon: <FiFileText /> },
  { key: 'moderation', label: 'Modération', icon: <FiMessageCircle /> },
  { key: 'fichiers', label: 'Fichiers', icon: <FiDownload /> },
];

/* =========================
   Micro UI
========================= */
const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;

const Toasts = React.memo(({ toasts, onHide }) => (
  <div className="fixed right-6 bottom-6 z-[60] space-y-3">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm border text-sm font-medium ${
          t.type === 'error' 
            ? 'bg-red-50/90 border-red-200 text-red-900' 
            : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
        }`}
        role="status"
      >
        <div className="flex items-center gap-3">
          <span>{t.message}</span>
          <button onClick={() => onHide(t.id)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      </div>
    ))}
  </div>
));

const ErrorBanner = ({ error, onRetry }) => {
  if (!error) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3 text-red-900">
        <FiAlertTriangle className="text-lg" />
        <span className="text-sm font-medium">{error}</span>
      </div>
      <button 
        onClick={onRetry} 
        className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 bg-white text-red-900 hover:bg-red-50 transition"
      >
        Réessayer
      </button>
    </div>
  );
};

const PageHeader = ({ title, subtitle, right, onRefresh }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-3">
      {right}
      <button
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
      >
        <FiRefreshCw className="text-base" />
        <span>Actualiser</span>
      </button>
    </div>
  </div>
);

const TabsBar = ({ active, onChange }) => (
  <div className="flex gap-2 border-b border-gray-200 pb-px overflow-x-auto">
    {TABS.map(t => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
          active === t.key
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
        }`}
      >
        <span className="text-base">{t.icon}</span>
        {t.label}
      </button>
    ))}
  </div>
);

const Section = ({ title, right, children, className = '' }) => (
  <section className={`rounded-xl bg-white border border-gray-200 ${className}`}>
    {title && (
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {right && <div className="text-sm text-gray-500">{right}</div>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </section>
);

const Delta = ({ value }) => {
  const sign = value >= 0 ? '+' : '';
  const abs = Math.abs(value);
  const colorClass = value >= 0 ? 'text-emerald-600' : 'text-red-600';
  const Icon = value >= 0 ? FiTrendingUp : FiTrendingDown;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${colorClass}`}>
      <Icon className="text-base" />
      <span>{sign}{abs.toFixed(1)}%</span>
    </span>
  );
};

/* KPI Cards */
const KpiCard = ({ icon, label, value, hint, delta, color = 'blue' }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    cyan: 'text-cyan-600 bg-cyan-50',
    rose: 'text-rose-600 bg-rose-50',
    gray: 'text-gray-600 bg-gray-50'
  };

  return (
    <div className="group rounded-xl bg-white border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {label}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-3">
            {nf(value)}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {typeof delta === 'number' && <Delta value={delta} />}
            {hint && <div className="text-xs text-gray-400">{hint}</div>}
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color] || colorMap.blue}`}>
          <div className="text-xl">{icon}</div>
        </div>
      </div>
    </div>
  );
};

const SparklineCard = ({ title, data, dataKey, color = COLORS.primary }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5">
    <div className="mb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</div>
    <div className="h-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="day" hide />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ 
              background: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

/* =========================
   Helpers Data
========================= */
const pctDelta = (curr, prev) => {
  if (!prev && !curr) return 0;
  if (!prev && curr) return 100;
  return ((curr - prev) / Math.max(prev, 1)) * 100;
};
const authorNameFrom = (a) => {
  const full = (...xs) => xs.filter(Boolean).join(' ').trim();
  return (
    a?.author_name ||
    a?.author?.name ||
    full(a?.author?.first_name, a?.author?.last_name) ||
    a?.createdBy?.name ||
    full(a?.created_by?.first_name, a?.created_by?.last_name) ||
    (a?.author_id ? `Auteur #${a.author_id}` : 'Inconnu')
  );
};

/* =========================
   Downloads: fallbacks
========================= */
const DOWNLOAD_METRIC_CANDIDATES = ['downloads','file_downloads','media_downloads','article_media_downloads'];
const DOWNLOAD_SERIES_ENDPOINTS = [    // ?metric=downloads
  { url: '/stats/downloads/time-series', param: null }, // endpoint dédié
  { url: '/article-media/stats/time-series', param: null },
];

const tryGet = async (fn) => {
  try { return await fn(); } catch (e) {
    if (![404, 422].includes(e?.response?.status)) console.warn('downloads series probe:', e);
    return null;
  }
};

/* =========================
   Export CSV
========================= */
function downloadCSV(filename, rows, headers) {
  const escape = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const head = headers?.length ? headers.join(',') : Object.keys(rows[0] || {}).join(',');
  const body = rows.map(r => (headers || Object.keys(r)).map(k => escape(r[k])).join(',')).join('\n');
  const csv = `${head}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* =========================
   Dashboard Component
========================= */
export default function Dashboard() {
  const { setTitle } = useOutletContext();
  useEffect(() => { setTitle?.('Tableau de bord'); }, [setTitle]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('tokenGuard') : null;
  if (!token) { window.location.href = '/auth'; return null; }

  // 🛡️ Sanctum CSRF cookie (si sessions)
  useEffect(() => {
    axios.get('/csrf').catch(() => {});
  }, []);

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('dash.tab') || 'audience');
  const changeTab = useCallback((key) => {
    setActiveTab(key);
    localStorage.setItem('dash.tab', key);
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type='success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), 3000);
  }, []);
  const hideToast = useCallback((id) => setToasts((t) => t.filter(x => x.id !== id)), []);

  const [rangeDays, setRangeDays] = useState(() => Number(localStorage.getItem('dash.range') || 30));
  const onChangeRange = (d) => {
    localStorage.setItem('dash.range', String(d));
    startTransition(() => setRangeDays(d));
  };

  const [totalArticles, setTotalArticles] = useState(0);
  const [totalDbArticles, setTotalDbArticles] = useState(null);
  const [publishedCount, setPublishedCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [pendingArticlesCount, setPendingArticlesCount] = useState(0);

  const [totalUsersDb, setTotalUsersDb] = useState(null);
  const [newUsers30d, setNewUsers30d] = useState(0);
  const [activeUsers7d, setActiveUsers7d] = useState(0);

  const [pendingCommentsCount, setPendingCommentsCount] = useState(0);
  const [pendingPreview, setPendingPreview] = useState([]);

  const [viewsSeries, setViewsSeries] = useState([]);
  const [commentsSeries, setCommentsSeries] = useState([]);
  const [sharesSeries, setSharesSeries] = useState([]);
  const [downloadsSeries, setDownloadsSeries] = useState([]);

  const [viewsDelta, setViewsDelta] = useState(0);
  const [commentsDelta, setCommentsDelta] = useState(0);
  const [sharesDelta, setSharesDelta] = useState(0);
  const [downloadsDelta, setDownloadsDelta] = useState(null);

  const [downloadsTotal, setDownloadsTotal] = useState(0);
  const [downloadsTotalProtected, setDownloadsTotalProtected] = useState(0);
  const [downloadsTotalPublic, setDownloadsTotalPublic] = useState(0);
  const [protectedFilesCount, setProtectedFilesCount] = useState(0);
  const [publicFilesCount, setPublicFilesCount] = useState(0);
  const [filesList, setFilesList] = useState([]);

  const [recentArticles, setRecentArticles] = useState([]);
  const [isGridMode, setIsGridMode] = useState(true);
  const [topAuthors, setTopAuthors] = useState([]);
  const [trending, setTrending] = useState([]);


 // ===== FICHIERS: recherche, filtre, tri =====
 const [filesQuery, setFilesQuery] = useState('');
 // key: 'download_count' | 'name' — dir: 'asc' | 'desc'
 const [filesSort, setFilesSort] = useState({ key: 'download_count', dir: 'desc' });
 // null = tous, true = protégés, false = publics
 const [filesOnlyProtected, setFilesOnlyProtected] = useState(null);

 const toggleSort = (key) => {
   setFilesSort((s) => {
     if (s.key !== key) return { key, dir: key === 'name' ? 'asc' : 'desc' };
     return { key, dir: s.dir === 'asc' ? 'desc' : 'asc' };
   });
 };

 const visibleFiles = useMemo(() => {
   let arr = Array.isArray(filesList) ? [...filesList] : [];
  if (filesQuery) {
     const q = filesQuery.toLowerCase();
     arr = arr.filter(f => (f.name || '').toLowerCase().includes(q));
   }
   if (filesOnlyProtected !== null) {
     arr = arr.filter(f => Boolean(f.protected) === filesOnlyProtected);
   }
   const { key, dir } = filesSort;
   arr.sort((a, b) => {
     if (key === 'name') {
       const av = (a.name || '').toLowerCase();
       const bv = (b.name || '').toLowerCase();
       if (av < bv) return dir === 'asc' ? -1 : 1;
       if (av > bv) return dir === 'asc' ? 1 : -1;
       return 0;
    } else {
  const av = Number(a[key] || 0);
       const bv = Number(b[key] || 0);
       return dir === 'asc' ? av - bv : bv - av;
     }
   });
   return arr;
 }, [filesList, filesQuery, filesOnlyProtected, filesSort]);

 const SortIcon = ({ active, dir }) => {
  if (!active) return <span className="inline-block w-3" />;
   return dir === 'asc' ? <FiChevronUp className="inline -mt-0.5" /> : <FiChevronDown className="inline -mt-0.5" />;
 };

  /* ================= fetchers ================= */
  const normalizeList = (payload, fallbackPerPage = 24) => {
    const p0 = payload || {};
    const p = (p0.data && !Array.isArray(p0.data) && (Array.isArray(p0.data.data) || p0.data.current_page !== undefined))
      ? p0.data : p0;

    const items =
      (Array.isArray(p?.data) ? p.data : null) ??
      (Array.isArray(p?.items) ? p.items : null) ??
      (Array.isArray(p0) ? p0 : []);

    const rawMeta = (p?.meta && typeof p.meta === 'object') ? p.meta : p || {};
    const perPage = Number(rawMeta.per_page ?? p.per_page ?? fallbackPerPage) || fallbackPerPage;
    const currentPage = Number(rawMeta.current_page ?? p.current_page ?? p.page ?? 1) || 1;
    const lastPage = Number(rawMeta.last_page ?? p.last_page ?? 1) || 1;

    let total = rawMeta.total ?? p.total;
    if (typeof total !== 'number' && Array.isArray(items) && !(p?.next_page_url || rawMeta?.next_page_url)) {
      total = items.length;
    }

    const links = (p?.links && typeof p.links === 'object') ? p.links : {};
    const hasNext = Boolean(links?.next) || (currentPage < lastPage);

    return { items, meta: { total: Number(total) || 0, per_page: perPage, current_page: currentPage, last_page: lastPage, has_next: hasNext } };
  };

  const fetchArticlesCount = async () => {
    const total = await axios.get('/stats/articles-count').then(r => Number(r?.data?.count || 0)).catch(() => 0);
    const statuses = ['published','draft','pending'];
    const res = await Promise.all(statuses.map(s =>
      axios.get('/articles', { params: { per_page: 1, status: s } })
        .then(r => normalizeList(r.data, 1).meta.total)
        .catch(() => 0)
    ));
    return { total, published: res[0], draft: res[1], pending: res[2] };
  };

  const fetchUsersKPIs = async () => {
    const [total, news, active] = await Promise.all([
      axios.get('/stats/users-count').then(r => Number(r?.data?.count || 0)).catch(() => 0),
      axios.get('/stats/users-new', { params: { days: 30 }}).then(r => Number(r?.data?.count || 0)).catch(() => 0),
      axios.get('/stats/active-users', { params: { days: 7 }}).then(r => Number(r?.data?.count || 0)).catch(() => 0),
    ]);
    return { total, news, active };
  };

  const fetchPendingCounts = async () => {
    const { data } = await axios.get('/moderation/pending-count').catch(() => ({ data: { pending: 0 } }));
    return Number(data?.pending || 0);
  };

  const fetchPendingPreview = async () => {
    try {
      const { data } = await axios.get('/moderation/pending', { params: { per_page: 8 } });
      return Array.isArray(data?.data) ? data.data : [];
    } catch {
      return [];
    }
  };

  const transformSeries = (rows, key) =>
    (rows || []).map(d => ({ day: d.day, [key]: Number(d.count || d[key] || 0) }));

  const fetchTimeSeries = async (metric, days, extraParams = {}) => {
    const { data } = await axios.get('/stats/time-series', { params: { metric, days, ...extraParams } });
    return Array.isArray(data?.series) ? data.series : [];
  };

  const fetchTimeSeries2x = async (metric, days, extraParams = {}) => {
    const rows = await fetchTimeSeries(metric, days * 2, extraParams);
    const first = rows.slice(0, days);
    const second = rows.slice(days);
    return { first, second, full: rows };
  };

  // === Series téléchargements (avec fallbacks & include_protected) ===
  const fetchDownloadsSeries = async (days) => {
    for (const ep of DOWNLOAD_SERIES_ENDPOINTS) {
      if (ep.param === 'metric') {
        for (const m of DOWNLOAD_METRIC_CANDIDATES) {
          const res = await tryGet(async () => {
            const { data } = await axios.get(ep.url, { params: { days, include_protected: 1, metric: m } });
            return Array.isArray(data?.series) ? data.series : null;
          });
          if (res) return res;
        }
      } else {
        const res = await tryGet(async () => {
          const { data } = await axios.get(ep.url, { params: { days, include_protected: 1 } });
          return Array.isArray(data?.series) ? data.series : null;
        });
        if (res) return res;
      }
    }
    return [];
  };

  const fetchDownloadsSeries2x = async (days) => {
    const rows = await fetchDownloadsSeries(days * 2);
    return { first: rows.slice(0, days), second: rows.slice(days) };
  };

  const mergeSeries = (a = [], b = []) =>
    a.map((r, i) => ({ day: r.day, count: Number(r.count || 0) + Number(b?.[i]?.count || 0) }));

  // Remplace TOUT le corps de fetchTrending par ceci
const fetchTrending = async (metric, days = 30, limit = 6) => {
  const { data } = await axios.get('/stats/trending', { params: { metric, days, limit } });
  const arr = Array.isArray(data?.data) ? data.data : [];
  // Pas d'appel /articles/{id} ici !
  return arr.map(it => ({
    id: it.article_id,
    title: it.title ?? `#${it.article_id}`,
    slug: it.slug ?? String(it.article_id),
    views: Number(it.count || 0),
  }));
};


  const fetchRecentArticles = async () => {
    const { items } = await axios.get('/articles', {
      params: { per_page: 9, sort_by: 'published_at', sort_direction: 'desc' }
    }).then(res => normalizeList(res.data, 9));
    return items;
  };

  const fetchArticlesWithinRange = async (cap = 400, days = 30) => {
    try {
      const since = new Date(); since.setDate(since.getDate() - (days - 1));
      const date_from = since.toISOString().slice(0, 10);
      let page = 1, all = [], hasNext = true;
      while (hasNext && all.length < cap) {
        const { data } = await axios.get('/articles', {
          params: { per_page: PAGE_SIZE, page, sort_by: 'published_at', sort_direction: 'desc', date_from }
        });
        const { items, meta } = normalizeList(data, PAGE_SIZE);
        all = [...all, ...(items || [])];
        hasNext = Boolean(meta?.has_next) && (page < (meta?.last_page || page));
        page += 1;
      }
      return all.slice(0, cap);
    } catch {
      return [];
    }
  };

  const fetchAllFiles = async (cap = 1000) => {
    try {
      let page = 1, all = [], hasNext = true;
      while (hasNext && all.length < cap) {
        const { data } = await axios.get('/article-media', { params: { per_page: PAGE_SIZE, page } });
        const { items, meta } = normalizeList(data, PAGE_SIZE);
        all = [...all, ...(items || [])];
        hasNext = Boolean(meta?.has_next) && (page < (meta?.last_page || page));
        page += 1;
      }
      const mapped = all.map(f => {
        const name = f.name || f.title || f.filename || `Fichier #${f.id}`;
        const downloads = Number(f.download_count || f.downloads || 0);

        // ——— Vérifs côté FICHIER ———
        const fileStatus = String(f.visibility ?? f.status ?? '').toLowerCase();
        const fileProtected =
          !!(f.is_protected ?? f.is_private ?? f.is_password_protected ?? f.protected ?? f.password ?? f.password_hash) ||
          fileStatus.includes('private') || fileStatus.includes('protect'); // couvre "password_protected"

        // ——— Vérifs côté ARTICLE parent ———
        const a = f.article || {};
        const artStatus = String(a.visibility ?? a.status ?? '').toLowerCase();
        const articleProtected =
          !!(a.is_protected ?? a.is_private ?? a.password) ||
          artStatus.includes('private') || artStatus.includes('protect'); // couvre "password_protected"

        const isProtected = fileProtected || articleProtected;

        return { id: f.id, name, download_count: downloads, protected: isProtected };
      }).sort((a, b) => b.download_count - a.download_count);

      const total = mapped.reduce((s, f) => s + f.download_count, 0);
      const protTotal = mapped.filter(x => x.protected).reduce((s, f) => s + f.download_count, 0);
      const pubTotal = total - protTotal;
      const protCount = mapped.filter(x => x.protected).length;
      const pubCount = mapped.length - protCount;

      return { list: mapped, total, protectedTotal: protTotal, publicTotal: pubTotal, protectedCount: protCount, publicCount: pubCount };
    } catch {
      return { list: [], total: 0, protectedTotal: 0, publicTotal: 0, protectedCount: 0, publicCount: 0 };
    }
  };

  /* ================= load ================= */
  const loadData = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      const [{ total, published, draft, pending }, users] = await Promise.all([
        fetchArticlesCount(),
        fetchUsersKPIs()
      ]);
      setTotalDbArticles(total);
      setTotalArticles(total);
      setPublishedCount(published);
      setDraftCount(draft);
      setPendingArticlesCount(pending);

      setTotalUsersDb(users.total);
      setNewUsers30d(users.news);
      setActiveUsers7d(users.active);

      const [pendingComments, pendingList] = await Promise.all([
        fetchPendingCounts(),
        fetchPendingPreview()
      ]);
      setPendingCommentsCount(pendingComments);
      setPendingPreview(pendingList);

      // === Séries ===
      const [views, commentsApproved, commentsPending, shares, downloadsRaw] = await Promise.all([
        fetchTimeSeries('views', rangeDays),
        fetchTimeSeries('comments', rangeDays, { status: 'approved' }),
        fetchTimeSeries('comments', rangeDays, { status: 'pending' }),
        fetchTimeSeries('shares', rangeDays),
        fetchDownloadsSeries(rangeDays)
      ]);
      const mergedComments = mergeSeries(commentsApproved, commentsPending);

      setViewsSeries(transformSeries(views, 'vues'));
      setCommentsSeries(transformSeries(mergedComments, 'comments'));
      setSharesSeries(transformSeries(shares, 'shares'));
      setDownloadsSeries(transformSeries(downloadsRaw, 'downloads'));

      // === Deltas (fenêtre x2) ===
      const v2 = await fetchTimeSeries2x('views', rangeDays);
      const ca2 = await fetchTimeSeries2x('comments', rangeDays, { status: 'approved' });
      const cp2 = await fetchTimeSeries2x('comments', rangeDays, { status: 'pending' });
      const s2 = await fetchTimeSeries2x('shares', rangeDays);

      const sv = (rows) => rows.reduce((acc, r) => acc + Number(r.count || 0), 0);
      const cFirst = mergeSeries(ca2.first, ca2.first && cp2.first ? cp2.first : []);
      const cSecond = mergeSeries(ca2.second, ca2.second && cp2.second ? cp2.second : []);

      setViewsDelta(pctDelta(sv(v2.second), sv(v2.first)));
      setCommentsDelta(pctDelta(sv(cSecond), sv(cFirst)));
      setSharesDelta(pctDelta(sv(s2.second), sv(s2.first)));

      // Delta téléchargements avec fallback (peut rester null si pas dispo côté API)
      try {
        const d2 = await fetchDownloadsSeries2x(rangeDays);
        const sum = (rows) => rows.reduce((acc, r) => acc + Number(r.count ?? r.downloads ?? 0), 0);
        if (d2.first.length && d2.second.length) {
          setDownloadsDelta(pctDelta(sum(d2.second), sum(d2.first)));
        } else {
          setDownloadsDelta(null);
        }
      } catch {
        setDownloadsDelta(null);
      }

      const [recent, withinRange] = await Promise.all([
        fetchRecentArticles(),
        fetchArticlesWithinRange(400, rangeDays)
      ]);
      setRecentArticles(recent);

      const byAuthor = new Map();
      withinRange.forEach(a => {
        const name = authorNameFrom(a);
        byAuthor.set(name, (byAuthor.get(name) || 0) + 1);
      });
      const topA = Array.from(byAuthor.entries()).map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);
      setTopAuthors(topA);

      const trendingNow = await fetchTrending('views', rangeDays, 6);
      setTrending(
        trendingNow.map(a => ({
          id: a.id,
          title: a.title || `#${a.id}`,
          views: a.count || 0,
          slug: a.slug || a.id
        }))
      );

      // Fichiers (+ protégés)
      const files = await fetchAllFiles();
      setFilesList(files.list);
      setDownloadsTotal(files.total);
      setDownloadsTotalProtected(files.protectedTotal);
      setDownloadsTotalPublic(files.publicTotal);
      setProtectedFilesCount(files.protectedCount);
      setPublicFilesCount(files.publicCount);

      pushToast('Données actualisées', 'success');
    } catch (e) {
      console.error(e);
      setError('Impossible de charger les données');
      pushToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [rangeDays, pushToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalViews = useMemo(() => viewsSeries.reduce((s, d) => s + (d.vues || 0), 0), [viewsSeries]);
  const totalComments = useMemo(() => commentsSeries.reduce((s, d) => s + (d.comments || 0), 0), [commentsSeries]);
  const totalShares = useMemo(() => sharesSeries.reduce((s, d) => s + (d.shares || 0), 0), [sharesSeries]);
  const totalDownloadsWindow = useMemo(() => downloadsSeries.reduce((s, d) => s + (d.downloads || d.count || 0), 0), [downloadsSeries]);

  const spark7 = (series, key) => series.slice(-7).map(d => ({ day: d.day, [key]: d[key] }));

  const exportAudienceCSV = () => {
    const rows = (viewsSeries || []).map((r, i) => ({
      day: r.day,
      vues: r.vues,
      comments: commentsSeries[i]?.comments ?? '',
      shares: sharesSeries[i]?.shares ?? '',
      downloads: downloadsSeries[i]?.downloads ?? ''
    }));
    downloadCSV(`audience_${rangeDays}j.csv`, rows, ['day', 'vues', 'comments', 'shares', 'downloads']);
  };
  
  const exportRecentCSV = () => {
    const rows = recentArticles.map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      views: a.view_count || 0,
      rating: a.rating_average || 0,
      status: a.status
    }));
    downloadCSV('articles_recents.csv', rows, ['id','title','slug','views','rating','status']);
  };

  const headerRight = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
        {[7, 30, 60, 90].map(d => (
          <button
            key={d}
            onClick={() => onChangeRange(d)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              rangeDays === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {d}j
          </button>
        ))}
      </div>
      {(activeTab === 'audience' || activeTab === 'resume') && (
        <button 
          onClick={exportAudienceCSV} 
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <FiDownload />
          <span>Export</span>
        </button>
      )}
      {activeTab === 'contenu' && (
        <button 
          onClick={exportRecentCSV} 
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <FiDownload />
          <span>Export</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 -m-4 p-6 space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble des performances"
        right={headerRight}
        onRefresh={loadData}
      />

      <TabsBar active={activeTab} onChange={changeTab} />

      <ErrorBanner error={error} onRetry={loadData} />

      {/* ============ ONGLET: RESUME ============ */}
      {activeTab === 'resume' && (
        <div className="space-y-6">
          {/* Audience */}
          <Section title="Audience" right={!loading && <span className="text-xs">vs période précédente</span>}>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <KpiCard 
                  label={`Vues (${rangeDays}j)`} 
                  value={totalViews} 
                  icon={<FiEye />} 
                  delta={viewsDelta} 
                  hint="évolution" 
                  color="blue" 
                />
                <KpiCard 
                  label={`Commentaires (${rangeDays}j)`} 
                  value={totalComments} 
                  icon={<FiMessageCircle />} 
                  delta={commentsDelta} 
                  hint="évolution" 
                  color="cyan" 
                />
                <KpiCard 
                  label={`Partages (${rangeDays}j)`} 
                  value={totalShares} 
                  icon={<FiShare2 />} 
                  delta={sharesDelta} 
                  hint="évolution" 
                  color="amber" 
                />
                <KpiCard 
                  label={`Téléchargements (${rangeDays}j)`} 
                  value={totalDownloadsWindow} 
                  icon={<FiDownload />} 
                  delta={typeof downloadsDelta === 'number' ? downloadsDelta : undefined} 
                  hint="évolution" 
                  color="purple" 
                />
              </div>
            )}
          </Section>

          {/* Contenu & Utilisateurs */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Contenu">
              {loading ? (
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <KpiCard 
                    label="Total" 
                    value={totalDbArticles ?? totalArticles} 
                    icon={<FiFileText />} 
                    hint="articles" 
                    color="purple" 
                  />
                  <KpiCard 
                    label="Publiés" 
                    value={publishedCount} 
                    icon={<FiCheckCircle />} 
                    hint="en ligne" 
                    color="emerald" 
                  />
                  <KpiCard 
                    label="Brouillons" 
                    value={draftCount} 
                    icon={<FiFileText />} 
                    hint="en cours" 
                    color="gray" 
                  />
                  <KpiCard 
                    label="En attente" 
                    value={pendingArticlesCount} 
                    icon={<FiMessageCircle />} 
                    hint="validation" 
                    color="rose" 
                  />
                </div>
              )}
            </Section>

            <Section title="Utilisateurs">
              {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <KpiCard 
                    label="Total" 
                    value={totalUsersDb ?? 0} 
                    icon={<FiUsers />} 
                    hint="comptes" 
                    color="purple" 
                  />
                  <KpiCard 
                    label="Nouveaux (30j)" 
                    value={newUsers30d} 
                    icon={<FiUserPlus />} 
                    hint="inscriptions" 
                    color="blue" 
                  />
                  <KpiCard 
                    label="Actifs (7j)" 
                    value={activeUsers7d} 
                    icon={<FiRefreshCw />} 
                    hint="connectés" 
                    color="emerald" 
                  />
                </div>
              )}
            </Section>
          </div>

          {/* Classements */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Articles tendance">
              {loading ? (
                <Skeleton className="h-64" />
              ) : trending.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">📊</div>
                  <div className="text-sm">Aucune tendance pour le moment</div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {trending.map((a, idx) => (
                    <li key={a.id} className="flex items-center justify-between py-4 gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <Link 
                          to={`/articles/${a.slug}`} 
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate transition"
                        >
                          {a.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-sm font-semibold text-gray-900">{kfmt(a.views)}</div>
                        <a 
                          href={`/articles/${a.slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 transition"
                        >
                          <FiExternalLink className="text-base" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Top auteurs">
              {loading ? (
                <Skeleton className="h-64" />
              ) : topAuthors.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">👤</div>
                  <div className="text-sm">Aucun auteur détecté</div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {topAuthors.map((a) => (
                    <li key={a.name} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-purple-700 font-semibold text-sm">
                          {a.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{a.name}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-500">
                        {a.count} {a.count > 1 ? 'articles' : 'article'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}

      {/* ============ ONGLET: AUDIENCE ============ */}
      {activeTab === 'audience' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {loading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              <>
                <KpiCard 
                  label={`Vues (${rangeDays}j)`} 
                  value={totalViews} 
                  icon={<FiEye />} 
                  delta={viewsDelta} 
                  hint="vs période précédente" 
                  color="blue" 
                />
                <KpiCard 
                  label={`Commentaires (${rangeDays}j)`} 
                  value={totalComments} 
                  icon={<FiMessageCircle />} 
                  delta={commentsDelta} 
                  hint="vs période précédente" 
                  color="cyan" 
                />
                <KpiCard 
                  label={`Partages (${rangeDays}j)`} 
                  value={totalShares} 
                  icon={<FiShare2 />} 
                  delta={sharesDelta} 
                  hint="vs période précédente" 
                  color="amber" 
                />
                <KpiCard 
                  label={`Téléchargements (${rangeDays}j)`} 
                  value={totalDownloadsWindow} 
                  icon={<FiDownload />} 
                  delta={typeof downloadsDelta === 'number' ? downloadsDelta : undefined} 
                  hint="vs période précédente" 
                  color="purple" 
                />
              </>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <Section 
              title="Vues" 
              right={!loading && <span className="text-sm font-semibold text-gray-900">{nf(totalViews)}</span>}
            >
              {loading ? (
                <Skeleton className="h-64" />
              ) : viewsSeries.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">📉</div>
                  <div className="text-sm">Pas de données</div>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={viewsSeries}>
                      <defs>
                        <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="vues" 
                        name="Vues" 
                        stroke={COLORS.primary} 
                        strokeWidth={2} 
                        fill="url(#gradViews)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>

            <Section 
              title="Commentaires" 
              right={!loading && <span className="text-sm font-semibold text-gray-900">{nf(totalComments)}</span>}
            >
              {loading ? (
                <Skeleton className="h-64" />
              ) : commentsSeries.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">💬</div>
                  <div className="text-sm">Pas de données</div>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={commentsSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="comments" 
                        name="Commentaires (approuvés + en attente)" 
                        fill={COLORS.info} 
                        radius={[8, 8, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>

            <Section 
              title="Partages" 
              right={!loading && <span className="text-sm font-semibold text-gray-900">{nf(totalShares)}</span>}
            >
              {loading ? (
                <Skeleton className="h-64" />
              ) : sharesSeries.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">🔗</div>
                  <div className="text-sm">Pas de données</div>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sharesSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="shares" 
                        name="Partages" 
                        fill={COLORS.warning} 
                        radius={[8, 8, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>

            <Section 
              title="Téléchargements" 
              right={!loading && <span className="text-sm font-semibold text-gray-900">{nf(totalDownloadsWindow)}</span>}
            >
              {loading ? (
                <Skeleton className="h-64" />
              ) : downloadsSeries.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">📥</div>
                  <div className="text-sm">Pas de données (l’API ne renvoie pas encore la série)</div>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={downloadsSeries}>
                      <defs>
                        <linearGradient id="gradDls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="downloads" 
                        name="Téléchargements" 
                        stroke={COLORS.secondary} 
                        strokeWidth={2} 
                        fill="url(#gradDls)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>
          </div>

          {/* Sparklines 7j */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {loading ? (
              <>
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </>
            ) : (
              <>
                <SparklineCard 
                  title="Tendance 7 jours — Vues" 
                  data={spark7(viewsSeries, 'vues')} 
                  dataKey="vues" 
                  color={COLORS.primary} 
                />
                <SparklineCard 
                  title="Tendance 7 jours — Commentaires" 
                  data={spark7(commentsSeries, 'comments')} 
                  dataKey="comments" 
                  color={COLORS.info} 
                />
                <SparklineCard 
                  title="Tendance 7 jours — Partages" 
                  data={spark7(sharesSeries, 'shares')} 
                  dataKey="shares" 
                  color={COLORS.warning} 
                />
                <SparklineCard 
                  title="Tendance 7 jours — Téléchargements" 
                  data={spark7(downloadsSeries, 'downloads')} 
                  dataKey="downloads" 
                  color={COLORS.secondary} 
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ ONGLET: CONTENU ============ */}
      {activeTab === 'contenu' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {loading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              <>
                <KpiCard 
                  label="Total" 
                  value={totalDbArticles ?? totalArticles} 
                  icon={<FiFileText />} 
                  hint="articles" 
                  color="purple" 
                />
                <KpiCard 
                  label="Publiés" 
                  value={publishedCount} 
                  icon={<FiCheckCircle />} 
                  hint="en ligne" 
                  color="emerald" 
                />
                <KpiCard 
                  label="Brouillons" 
                  value={draftCount} 
                  icon={<FiFileText />} 
                  hint="en cours" 
                  color="gray" 
                />
                <KpiCard 
                  label="En attente" 
                  value={pendingArticlesCount} 
                  icon={<FiMessageCircle />} 
                  hint="validation" 
                  color="rose" 
                />
              </>
            )}
          </div>

          <Section
            title="Derniers articles publiés"
            right={
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-gray-100 p-1">
                  <button 
                    onClick={() => setIsGridMode(true)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                      isGridMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <FaThLarge className="inline" />
                  </button>
                  <button 
                    onClick={() => setIsGridMode(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                      !isGridMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <FaTable className="inline" />
                  </button>
                </div>
              </div>
            }
          >
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Skeleton className="h-52" />
                <Skeleton className="h-52" />
                <Skeleton className="h-52" />
              </div>
            ) : recentArticles.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <div className="text-4xl mb-3">📝</div>
                <div className="text-sm">Aucun article récent</div>
              </div>
            ) : isGridMode ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {recentArticles.map((article) => (
                  <div 
                    key={article.id} 
                    className="group rounded-xl bg-white border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition"
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100">
                      {article.featured_image_url || article.featured_image ? (
                        <img 
                          src={article.featured_image_url || article.featured_image} 
                          alt={article.title} 
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-300" 
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
                          📰
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <Link 
                        to={`/articles/${article.slug || article.id}`} 
                        className="block line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition mb-3" 
                        title={article.title}
                      >
                        {article.title || <i className="text-gray-400">Sans titre</i>}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiEye className="text-sm" />
                          {kfmt(article.view_count || 0)}
                        </span>
                        <span>⭐ {article.rating_average ? Number(article.rating_average).toFixed(1) : '—'}</span>
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                          {article.status || 'draft'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentArticles.map((article) => (
                  <li key={article.id} className="flex items-center justify-between gap-4 py-4">
                    <Link 
                      to={`/articles/${article.slug || article.id}`} 
                      className="flex-1 truncate text-sm font-medium text-gray-900 hover:text-blue-600 transition" 
                      title={article.title}
                    >
                      {article.title || `#${article.id}`}
                    </Link>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiEye />
                        {kfmt(article.view_count || 0)}
                      </span>
                      <span>⭐ {article.rating_average ? Number(article.rating_average).toFixed(1) : '—'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                        {article.status || 'draft'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Articles tendance">
              {loading ? (
                <Skeleton className="h-64" />
              ) : trending.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">📊</div>
                  <div className="text-sm">Aucune tendance</div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {trending.map((a, idx) => (
                    <li key={a.id} className="flex items-center justify-between py-4 gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <Link 
                          to={`/articles/${a.slug}`} 
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate transition"
                        >
                          {a.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-sm font-semibold text-gray-900">{kfmt(a.views)}</div>
                        <a 
                          href={`/articles/${a.slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 transition"
                        >
                          <FiExternalLink className="text-base" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Top auteurs">
              {loading ? (
                <Skeleton className="h-64" />
              ) : topAuthors.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">👤</div>
                  <div className="text-sm">Aucun auteur</div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {topAuthors.map((a) => (
                    <li key={a.name} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-purple-700 font-semibold text-sm">
                          {a.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{a.name}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-500">
                        {a.count} {a.count > 1 ? 'articles' : 'article'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}

      {/* ============ ONGLET: MODÉRATION ============ */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {loading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              <>
                <KpiCard 
                  label="Commentaires en attente" 
                  value={pendingCommentsCount} 
                  icon={<FiMessageCircle />} 
                  hint="à traiter" 
                  color="rose" 
                />
                <KpiCard 
                  label="Articles en attente" 
                  value={pendingArticlesCount} 
                  icon={<FiFileText />} 
                  hint="validation" 
                  color="amber" 
                />
                <KpiCard 
                  label={`Commentaires (${rangeDays}j)`} 
                  value={totalComments} 
                  icon={<FiMessageCircle />} 
                  delta={commentsDelta} 
                  hint="activité" 
                  color="cyan" 
                />
              </>
            )}
          </div>

          <Section 
            title="Commentaires à modérer" 
            right={!loading && <span className="text-sm">{pendingPreview.length} éléments</span>}
          >
            {loading ? (
              <Skeleton className="h-64" />
            ) : pendingPreview.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <div className="text-4xl mb-3">✅</div>
                <div className="text-sm">Rien en attente</div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pendingPreview.map((c) => (
                  <li key={c.id} className="py-4">
                    <div className="text-sm font-semibold text-gray-900 mb-1">{c.title}</div>
                    <div className="text-xs text-gray-500 mb-2">{c.subtitle}</div>
                    {c.url && (
                      <a 
                        href={c.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
                      >
                        Ouvrir
                        <FiExternalLink />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}

      {/* ============ ONGLET: FICHIERS ============ */}
      {activeTab === 'fichiers' && (
        <div className="space-y-6">
          <Section 
              title="Fichiers les plus téléchargés" 
              right={
                !loading && (
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-900">
                    <span>{nf(downloadsTotal)} téléchargements</span>
                    <span className="text-gray-400">•</span>
                    <span title="Téléchargements sur fichiers protégés">
                      <FiLock className="inline mr-1 opacity-70" /> {nf(downloadsTotalProtected)}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span title="Téléchargements sur fichiers publics">{nf(downloadsTotalPublic)}</span>
                  </div>
                )
              }
            >
              {loading ? (
                <Skeleton className="h-96" />
              ) : filesList.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-4xl mb-3">📁</div>
                  <div className="text-sm">Aucun fichier trouvé</div>
                </div>
              ) : (
                <>
                  {/* Barre d'actions (recherche, filtre, tri) */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={filesQuery}
                        onChange={(e) => setFilesQuery(e.target.value)}
                        placeholder="Rechercher un fichier…"
                        className="pl-9 pr-3 py-2.5 w-72 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg bg-gray-100 p-1">
                        <button
                          onClick={() => setFilesOnlyProtected(null)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                            filesOnlyProtected === null ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                          }`}
                          title="Tous les fichiers"
                        >
                          Tous
                        </button>
                        <button
                          onClick={() => setFilesOnlyProtected(true)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                            filesOnlyProtected === true ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                          }`}
                          title="Protégés"
                        >
                          <FiLock className="inline -mt-0.5 mr-1" /> Protégés
                        </button>
                        <button
                          onClick={() => setFilesOnlyProtected(false)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                            filesOnlyProtected === false ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                          }`}
                          title="Publics"
                        >
                          Publics
                        </button>
                      </div>

                      <div className="hidden sm:flex items-center text-xs text-gray-500">
                        <span className="mr-2">Trier par :</span>
                        <div className="flex rounded-lg bg-gray-100 p-1">
                          <button
                            onClick={() => toggleSort('download_count')}
                            className={`px-3 py-1.5 font-medium rounded-md transition ${
                              filesSort.key === 'download_count' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                            }`}
                            title="Tri sur téléchargements"
                          >
                            Téléchargements <SortIcon active={filesSort.key === 'download_count'} dir={filesSort.dir} />
                          </button>
                          <button
                            onClick={() => toggleSort('name')}
                            className={`px-3 py-1.5 font-medium rounded-md transition ${
                              filesSort.key === 'name' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                            }`}
                            title="Tri alphabétique"
                          >
                            Nom <SortIcon active={filesSort.key === 'name'} dir={filesSort.dir} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tableau lisible + zébrage + header sticky + barre de progression */}
                  <div className="max-h-[32rem] overflow-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                        <tr className="text-left text-gray-500">
                          <th className="px-4 py-3 w-12">#</th>
                          <th className="px-4 py-3">
                            <button
                              onClick={() => toggleSort('name')}
                              className="inline-flex items-center gap-1 font-medium hover:text-gray-900"
                              title="Trier par nom"
                            >
                              Fichier <SortIcon active={filesSort.key === 'name'} dir={filesSort.dir} />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => toggleSort('download_count')}
                              className="inline-flex items-center gap-1 font-medium hover:text-gray-900"
                              title="Trier par téléchargements"
                            >
                              Téléchargements <SortIcon active={filesSort.key === 'download_count'} dir={filesSort.dir} />
                            </button>
                          </th>
                          <th className="px-4 py-3 w-64">Part du total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {visibleFiles.map((file, idx) => {
                          const share = downloadsTotal > 0 ? (file.download_count / downloadsTotal) * 100 : 0;
                          return (
                            <tr
                              key={file.id}
                              className={`odd:bg-gray-50/60 ${file.protected ? 'border-l-4 border-amber-400/60' : ''}`}
                            >
                              <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="truncate font-medium text-gray-900">{file.name}</div>
                                  {file.protected && (
                                    <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                                      <FiLock /> Protégé
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                {nf(file.download_count)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 rounded-full bg-gray-100">
                                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, share).toFixed(2)}%` }}
                    />
                                  </div>
                                  <div className="w-16 text-right tabular-nums text-gray-600">
                                    {share.toFixed(1)}%
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Légende */}
                  <div className="mt-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1 mr-4">
                      <span className="inline-block h-3 w-3 rounded bg-blue-500" /> Part relative des téléchargements
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded border-2 border-amber-400/60" /> Bande latérale = fichier protégé
                    </span>
                  </div>
                </>
              )}
          </Section>
        </div>
      )}

      <Toasts toasts={toasts} onHide={hideToast} />
    </div>
  );
}
