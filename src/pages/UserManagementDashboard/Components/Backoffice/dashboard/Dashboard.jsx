// src/pages/dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
  FiRefreshCw, FiFileText, FiCheckCircle, FiUsers,
  FiMessageCircle, FiShare2, FiDownload, FiThumbsUp, FiList, FiEdit3,
  FiActivity, FiUserPlus, FiEye
} from 'react-icons/fi';
import { FaThLarge, FaTable } from 'react-icons/fa';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';

/* === Configuration Axios === */
axios.defaults.baseURL = axios.defaults.baseURL || '/api';
axios.defaults.withCredentials = true;

let __csrfReady = true;
const rootHTTP = axios.create({ baseURL: '/', withCredentials: true });

async function ensureCsrf() {
  const rootHTTP = axios.create({
  baseURL: 'http://12.0.0.1:8000', // << backend Laravel
  withCredentials: true,           // indispensable pour le cookie XSRF
  // xsrfCookieName: 'XSRF-TOKEN',  // (optionnel) valeurs par défaut d’Axios conviennent déjà
  // xsrfHeaderName: 'X-XSRF-TOKEN'
});
  if (__csrfReady) return;
  try {
    await rootHTTP.get('/sanctum/csrf-cookie');
    __csrfReady = true;
  } catch (err) {
    console.warn('CSRF token fetch failed:', err);
  }
}

/* === Utilitaires === */
const RE_SQL = /^\d{4}-\d{2}-\d{2}(?:[ T])\d{2}:\d{2}:\d{2}$/;
const toDate = (v) => v ? new Date(RE_SQL.test(v) ? v.replace(' ', 'T') : v) : null;
const fmtDay = (d) => d.toISOString().slice(0, 10);
const nf = (n) => new Intl.NumberFormat('fr-FR').format(Number(n || 0));
const kfmt = (n) => (
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` :
  String(n)
);

function normalizeList(payload, fallbackPerPage = 24) {
  const p0 = payload || {};
  const p = (p0.data && !Array.isArray(p0.data) && (Array.isArray(p0.data.data) || p0.data.current_page !== undefined))
    ? p0.data
    : p0;

  const items =
    (Array.isArray(p?.data) ? p.data : null) ??
    (Array.isArray(p?.items) ? p.items : null) ??
    (Array.isArray(p0) ? p0 : []);

  const rawMeta = (p?.meta && typeof p.meta === 'object') ? p.meta : p || {};
  const perPage = Number(rawMeta.per_page ?? p.per_page ?? fallbackPerPage) || fallbackPerPage;
  const currentPage = Number(rawMeta.current_page ?? p.current_page ?? p.page ?? 1) || 1;

  let total = rawMeta.total ?? p.total;
  if (typeof total !== 'number' && Array.isArray(items) && !(
    p?.next_page_url || rawMeta?.next_page_url ||
    p?.prev_page_url || rawMeta?.prev_page_url
  )) {
    total = items.length;
  }

  const lastPage = total && perPage ? Math.max(1, Math.ceil(total / perPage)) : (p?.last_page || rawMeta?.last_page || 1);
  const hasNext = !!(p?.next_page_url ?? rawMeta?.next_page_url);

  return {
    items,
    meta: {
      total: Number(total) || 0,
      per_page: perPage,
      current_page: currentPage,
      last_page: Number(lastPage) || 1,
      has_next: hasNext
    }
  };
}

/* === Constantes === */
const COLORS = {
  primary: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#e11d48',
  cyan: '#06b6d4',
  slate: '#64748b'
};

/* === Composants UI === */
const Overline = ({ children }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400" />
    <span className="text-xs tracking-wide uppercase text-slate-500 font-medium">{children}</span>
  </div>
);

const TinyButton = ({ children, ...props }) => (
  <button
    {...props}
    className={`px-3 py-1.5 rounded-md border border-slate-300/80 bg-white hover:bg-slate-50 text-sm inline-flex items-center gap-2 transition ${props.className || ''}`}
  >
    {children}
  </button>
);

const StatCard = ({ title, value, icon, tone = 'blue', hint }) => {
  const toneClasses = {
    blue: 'from-blue-50 to-cyan-50 text-blue-700 ring-blue-100',
    green: 'from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-100',
    yellow: 'from-amber-50 to-yellow-50 text-amber-700 ring-amber-100',
    rose: 'from-rose-50 to-pink-50 text-rose-700 ring-rose-100',
    slate: 'from-slate-50 to-slate-50 text-slate-700 ring-slate-100',
    cyan: 'from-cyan-50 to-sky-50 text-cyan-700 ring-cyan-100',
    purple: 'from-indigo-50 to-purple-50 text-indigo-700 ring-indigo-100',
  };

  const cls = toneClasses[tone] || toneClasses.blue;

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white ring-1 ring-slate-100 shadow-sm hover:shadow-md transition duration-200">
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-slate-50 to-white" />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-slate-500 text-xs">{title}</p>
            <h3 className="text-xl font-semibold mt-1 truncate">{nf(value)}</h3>
            {hint && <p className="text-[11px] text-slate-400 mt-1 truncate">{hint}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cls} ring-1 flex items-center justify-center`}>
            <div className="text-sm opacity-90">{icon}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, icon: Icon, right, children }) => (
  <div className="rounded-xl bg-white ring-1 ring-slate-100 shadow-sm">
    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="text-slate-500 text-sm" />}
        <h3 className="font-medium text-slate-800 text-sm">{title}</h3>
      </div>
      {right && <div className="text-xs text-slate-500">{right}</div>}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const EmptyState = ({ emoji = '📭', title = 'Aucune donnée', hint }) => (
  <div className="text-center text-slate-500 py-6">
    <div className="text-5xl mb-1">{emoji}</div>
    <div className="text-sm font-medium">{title}</div>
    {hint && <div className="text-xs mt-1 opacity-80">{hint}</div>}
  </div>
);

/* === Dashboard Principal === */
export default function Dashboard() {
  const { setTitle } = useOutletContext();
  useEffect(() => {
    setTitle?.('Tableau de bord');
  }, [setTitle]);

  // Auth check
  const token = typeof window !== 'undefined' ? localStorage.getItem('tokenGuard') : null;
  if (!token) {
    window.location.href = '/auth';
    return null;
  }

  // === États ===
  // Contenus
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalDbArticles, setTotalDbArticles] = useState(null);
  const [publishedCount, setPublishedCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [pendingArticlesCount, setPendingArticlesCount] = useState(0);

  // Utilisateurs
  const [totalUsersDb, setTotalUsersDb] = useState(null);
  const [newUsers30d, setNewUsers30d] = useState(0);
  const [activeUsers7d, setActiveUsers7d] = useState(0);
  const [fallbackUserCount, setFallbackUserCount] = useState(0);

  // Modération
  const [pendingCommentsCount, setPendingCommentsCount] = useState(0);

  // Audience
  const [viewsSeries, setViewsSeries] = useState([]);
  const [commentsSeries, setCommentsSeries] = useState([]);
  const [sharesSeries, setSharesSeries] = useState([]);

  // Fichiers
  const [downloadsTotal, setDownloadsTotal] = useState(0);
  const [filesList, setFilesList] = useState([]);

  // Derniers articles
  const [recentArticles, setRecentArticles] = useState([]);
  const [isGridMode, setIsGridMode] = useState(true);

  // === Agrégations ===
  const makeBuckets = (days) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1));
    const map = new Map();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      map.set(fmtDay(d), 0);
    }
    return map;
  };

  const seriesFrom = (items, field, days) => {
    const buckets = makeBuckets(days);
    (items || []).forEach((item) => {
      const date = toDate(item.published_at) || toDate(item.created_at);
      if (!date) return;
      const key = fmtDay(date);
      if (buckets.has(key)) {
        const value = Number(item[field] || 0);
        if (Number.isFinite(value)) {
          buckets.set(key, (buckets.get(key) || 0) + value);
        }
      }
    });
    return Array.from(buckets.entries()).map(([day, count]) => ({ day, count }));
  };

  // === API Helpers ===
  const fetchArticleCount = async (params = {}) => {
    const { data } = await axios.get('/articles', { params: { per_page: 1, ...params } });
    const { meta } = normalizeList(data, 1);
    return meta.total || 0;
  };

  const fetchArticlesTotalHard = async () => {
    const endpoints = [
      // () => axios.get('/articles/count'),
      () => axios.get('/stats/articles-count'),
      () => fetchArticleCount({})
    ];

    for (const fn of endpoints) {
      try {
        const { data } = await fn();
        return Number(
          typeof data === 'number'
            ? data
            : data?.count ?? data?.total ?? 0
        ) || 0;
      } catch {}
    }
    return 0;
  };

  const fetchRecentArticles = async () => {
    const { items } = await axios.get('/articles', {
      params: { per_page: 9, sort_by: 'published_at', sort_direction: 'desc' }
    }).then(res => normalizeList(res.data, 9));
    return items;
  };

  const fetchBulkArticles = async (max = 200) => {
    const page1 = await axios.get('/articles', {
      params: { per_page: 100, sort_by: 'published_at', sort_direction: 'desc' }
    }).then(res => normalizeList(res.data, 100));

    let items = [...(page1.items || [])];
    if (items.length < max && page1.meta.has_next) {
      try {
        const page2 = await axios.get('/articles', {
          params: { per_page: 100, page: 2, sort_by: 'published_at', sort_direction: 'desc' }
        }).then(res => normalizeList(res.data, 100));
        items = [...items, ...(page2.items || [])];
      } catch {}
    }
    return items.slice(0, max);
  };

  const fetchUsersTotalHard = async () => {
    const endpoints = [
      () => axios.get('/users/count'),
      () => axios.get('/stats/users-count'),
      () => axios.get('/users', { params: { per_page: 1 } }).then(res => {
        const { meta } = normalizeList(res.data, 1);
        return meta.total || 0;
      })
    ];

    for (const fn of endpoints) {
      try {
        const result = await fn();
        return Number(
          typeof result === 'number'
            ? result
            : result?.data?.count ?? result?.data?.total ?? result ?? 0
        ) || 0;
      } catch {}
    }
    return 0;
  };

  const fetchNewUsers30d = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString().slice(0, 10);

    const endpoints = [
      () => axios.get('/stats/users-new', { params: { days: 30 } }),
      () => axios.get('/users', { params: { per_page: 1, created_from: sinceIso } }).then(res => {
        const { meta } = normalizeList(res.data, 1);
        return meta.total || 0;
      })
    ];

    for (const fn of endpoints) {
      try {
        const { data } = await fn();
        return Number(data?.count ?? data?.total ?? data ?? 0) || 0;
      } catch {}
    }
    return 0;
  };

  const fetchActiveUsers7d = async () => {
    const endpoints = [
      () => axios.get('/stats/active-users', { params: { days: 7 } }),
      () => axios.get('/users/active', { params: { days: 7 } })
    ];

    for (const fn of endpoints) {
      try {
        const { data } = await fn();
        return Number(data?.count ?? data?.total ?? data ?? 0) || 0;
      } catch {}
    }
    return 0;
  };

  const fetchAllFiles = async (cap = 1000) => {
    try {
      let page = 1;
      let all = [];
      let hasNext = true;

      while (hasNext && all.length < cap) {
        const { data } = await axios.get('/article-media', { params: { per_page: 100, page } });
        const { items, meta } = normalizeList(data, 100);
        all = [...all, ...(items || [])];
        hasNext = !!meta.has_next;
        page += 1;
      }

      const mapped = all.map(f => ({
        id: f.id,
        name: f.name || f.title || f.filename || `Fichier #${f.id}`,
        download_count: Number(f.download_count || f.downloads || 0)
      })).sort((a, b) => b.download_count - a.download_count);

      const total = mapped.reduce((sum, f) => sum + f.download_count, 0);
      return { list: mapped, total };
    } catch {
      return { list: [], total: 0 };
    }
  };

  const fetchPendingComments = async () => {
    const endpoints = [
      () => axios.get('/moderation/pending-count'),
      () => axios.get('/moderation/pending').then(res => {
        const { items } = normalizeList(res.data, 100);
        return items.length;
      })
    ];

    for (const fn of endpoints) {
      try {
        const { data } = await fn();
        const count = typeof data === 'number'
          ? data
          : data?.pending ?? data?.count ?? 0;
        return Number(count) || 0;
      } catch {}
    }
    return 0;
  };

  // === Chargement des données ===
  const loadData = useCallback(async () => {
    await ensureCsrf();

    // Articles
    const [dbTotal, pub, drft, pendArt] = await Promise.all([
      fetchArticlesTotalHard(),
      fetchArticleCount({ status: 'published' }),
      fetchArticleCount({ status: 'draft' }),
      fetchArticleCount({ status: 'pending' })
    ]);
    setTotalDbArticles(dbTotal);
    setTotalArticles(dbTotal); // fallback to db total
    setPublishedCount(pub);
    setDraftCount(drft);
    setPendingArticlesCount(pendArt);

    // Users
    const [uTotalDb, uNew30, uActive7] = await Promise.all([
      fetchUsersTotalHard(),
      fetchNewUsers30d(),
      fetchActiveUsers7d()
    ]);
    setTotalUsersDb(uTotalDb);
    setNewUsers30d(uNew30);
    setActiveUsers7d(uActive7);
    setFallbackUserCount(uTotalDb);

    // Comments
    const pendingComments = await fetchPendingComments();
    setPendingCommentsCount(pendingComments);

    // Bulk data for charts & recent
    const [bulkArticles, recent] = await Promise.all([
      fetchBulkArticles(200),
      fetchRecentArticles()
    ]);
    setRecentArticles(recent);

    setViewsSeries(seriesFrom(bulkArticles, 'view_count', 30).map(r => ({ day: r.day, vues: r.count })));
    setCommentsSeries(seriesFrom(bulkArticles, 'comment_count', 30).map(r => ({ day: r.day, comments: r.count })));
    setSharesSeries(seriesFrom(bulkArticles, 'share_count', 30).map(r => ({ day: r.day, shares: r.count })));

    // Files
    const { list, total } = await fetchAllFiles();
    setFilesList(list);
    setDownloadsTotal(total);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // === Agrégats calculés ===
  const totalViews30d = useMemo(() => viewsSeries.reduce((sum, r) => sum + (r.vues || 0), 0), [viewsSeries]);
  const totalComments30d = useMemo(() => commentsSeries.reduce((sum, r) => sum + (r.comments || 0), 0), [commentsSeries]);
  const totalShares30d = useMemo(() => sharesSeries.reduce((sum, r) => sum + (r.shares || 0), 0), [sharesSeries]);

  // === Rendu ===
  return (
    <div className="space-y-8 bg-slate-50/60 -m-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
              Tableau de bord
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Aperçu global du contenu, des utilisateurs et de l’audience</p>
        </div>
        <TinyButton onClick={loadData}>
          <FiRefreshCw className="text-sm" /> Actualiser
        </TinyButton>
      </div>

      {/* Contenus */}
      <div>
        <Overline>Contenus</Overline>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Articles (Total)" value={totalDbArticles ?? totalArticles} icon={<FiFileText />} tone="blue" />
          <StatCard title="Publiés" value={publishedCount} icon={<FiCheckCircle />} tone="green" />
          <StatCard title="Brouillons" value={draftCount} icon={<FiEdit3 />} tone="yellow" />
        </div>
      </div>

      {/* Modération */}
      <div>
        <Overline>Modération</Overline>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard title="Articles à modérer" value={pendingArticlesCount} icon={<FiActivity />} tone="slate" />
          <StatCard title="Commentaires à modérer" value={pendingCommentsCount} icon={<FiMessageCircle />} tone="rose" />
        </div>
      </div>

      {/* Utilisateurs */}
      <div>
        <Overline>Utilisateurs</Overline>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Utilisateurs (Total)" value={totalUsersDb ?? fallbackUserCount} icon={<FiUsers />} tone="blue" />
          <StatCard title="Nouveaux (30j)" value={newUsers30d} icon={<FiUserPlus />} tone="green" />
          <StatCard title="Actifs (7j)" value={activeUsers7d} icon={<FiActivity />} tone="purple" />
        </div>
      </div>

      {/* Audience Charts */}
      <div>
        <Overline>Audience (30 derniers jours)</Overline>
        <div className="grid gap-4 lg:grid-cols-3">
          <Section
            title="Vues"
            icon={FiEye}
            right={<span className="text-xs">{nf(totalViews30d)} au total</span>}
          >
            {viewsSeries.length === 0 ? (
              <EmptyState emoji="📉" title="Pas assez de données" />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={viewsSeries}>
                    <defs>
                      <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.45} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#eef2f7" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="vues" name="Vues" stroke={COLORS.primary} fill="url(#gradViews)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          <Section
            title="Commentaires"
            icon={FiMessageCircle}
            right={<span className="text-xs">{nf(totalComments30d)} au total</span>}
          >
            {commentsSeries.length === 0 ? (
              <EmptyState emoji="💬" title="Aucun commentaire" />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commentsSeries}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#eef2f7" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="comments" name="Commentaires" fill={COLORS.cyan} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          <Section
            title="Partages"
            icon={FiShare2}
            right={<span className="text-xs">{nf(totalShares30d)} au total</span>}
          >
            {sharesSeries.length === 0 ? (
              <EmptyState emoji="🔗" title="Aucun partage" />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sharesSeries}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#eef2f7" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="shares" name="Partages" fill={COLORS.amber} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Derniers articles */}
      <div>
        <Overline>Derniers articles</Overline>
        <Section
          title="Flux récent"
          icon={FiList}
          right={
            <div className="flex bg-slate-100 rounded-md p-0.5">
              <button
                className={`flex items-center px-2.5 py-1 rounded-md text-xs ${isGridMode ? 'bg-blue-600 text-white' : 'text-slate-700'}`}
                onClick={() => setIsGridMode(true)}
              >
                <FaThLarge className="mr-1" /> Grille
              </button>
              <button
                className={`flex items-center px-2.5 py-1 rounded-md text-xs ${!isGridMode ? 'bg-blue-600 text-white' : 'text-slate-700'}`}
                onClick={() => setIsGridMode(false)}
              >
                <FaTable className="mr-1" /> Liste
              </button>
            </div>
          }
        >
          {recentArticles.length === 0 ? (
            <EmptyState emoji="📝" title="Aucun article récent" />
          ) : isGridMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentArticles.map((article) => (
                <div key={article.id} className="rounded-xl ring-1 ring-slate-100 bg-white shadow-sm hover:shadow-md transition p-3">
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-md bg-slate-100 mb-2">
                    {article.featured_image_url || article.featured_image ? (
                      <img
                        src={article.featured_image_url || article.featured_image}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📰</div>
                    )}
                  </div>
                  <Link
                    to={`/articles/${article.slug || article.id}`}
                    target="_blank"
                    className="font-medium text-sm line-clamp-2 hover:text-blue-600"
                  >
                    {article.title || <i className="text-slate-400">Sans titre</i>}
                  </Link>
                  <div className="text-[11px] text-slate-600 mt-1 flex gap-3">
                    <span>👁️ {kfmt(article.view_count || 0)}</span>
                    <span>👍 {article.rating_average ? Number(article.rating_average).toFixed(1) : '—'}/5</span>
                    <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                      {article.status || 'draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentArticles.map((article) => (
                <li key={article.id} className="py-2.5 flex items-center justify-between gap-3">
                  <Link to={`/articles/${article.slug || article.id}`} className="truncate hover:underline text-sm">
                    {article.title || `#${article.id}`}
                  </Link>
                  <div className="text-[11px] text-slate-600 flex gap-3">
                    <span>👁️ {kfmt(article.view_count || 0)}</span>
                    <span>👍 {article.rating_average ? Number(article.rating_average).toFixed(1) : '—'}/5</span>
                    <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                      {article.status || 'draft'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Téléchargements */}
      <div>
        <Overline>Téléchargements</Overline>
        <Section
          title="Fichiers les plus téléchargés"
          icon={FiDownload}
          right={<span className="text-xs">{nf(downloadsTotal)} téléchargements cumulés</span>}
        >
          {filesList.length === 0 ? (
            <EmptyState emoji="📁" title="Aucun fichier trouvé" hint="Assurez-vous que vos fichiers exposent `download_count`." />
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {filesList.map((file) => (
                <li key={file.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">{file.name}</div>
                  <div className="text-sm text-slate-900 font-semibold">{nf(file.download_count)}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}