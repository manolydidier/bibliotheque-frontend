// src/pages/dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
  FiRefreshCw, FiFileText, FiCheckCircle, FiSlash, FiUsers,
  FiMessageCircle, FiShare2, FiDownload, FiThumbsUp, FiList, FiEdit3
} from 'react-icons/fi';
import { FaThLarge, FaTable } from 'react-icons/fa';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';

/* Axios / Sanctum */
axios.defaults.baseURL = axios.defaults.baseURL || '/api';
axios.defaults.withCredentials = true;

let __csrfReady = false;
const rootHTTP = axios.create({ baseURL: '/', withCredentials: true });
async function ensureCsrf() {
  if (__csrfReady) return;
  try { await rootHTTP.get('/sanctum/csrf-cookie'); __csrfReady = true; } catch {}
}

/* Utils */
const RE_SQL = /^\d{4}-\d{2}-\d{2}(?:[ T])\d{2}:\d{2}:\d{2}$/;
const toDate = (v) => v ? new Date(RE_SQL.test(v) ? v.replace(' ', 'T') : v) : null;
const fmtDay = (d) => d.toISOString().slice(0, 10);
const nf = (n) => new Intl.NumberFormat('fr-FR').format(Number(n || 0));
const kfmt = (n) => (n>=1_000_000? (n/1_000_000).toFixed(1)+'M' : n>=1_000? (n/1_000).toFixed(1)+'k' : String(n));

function normalizeList(payload, fallbackPerPage = 24) {
  const p0 = payload || {};
  const p = (p0 && p0.data && !Array.isArray(p0.data) && (Array.isArray(p0.data.data) || p0.data.current_page !== undefined)) ? p0.data : p0;
  const items =
    (Array.isArray(p?.data) ? p.data : null) ??
    (Array.isArray(p?.items) ? p.items : null) ??
    (Array.isArray(p0) ? p0 : []) ?? [];
  const rawMeta = (p?.meta && typeof p.meta === 'object') ? p.meta : p || {};
  const perPage = Number(rawMeta.per_page ?? p.per_page ?? fallbackPerPage) || fallbackPerPage;
  const currentPage = Number(rawMeta.current_page ?? p.current_page ?? p.page ?? 1) || 1;
  let total = rawMeta.total ?? p.total;
  if (typeof total !== 'number' && Array.isArray(items) && !(p?.next_page_url || rawMeta?.next_page_url || p?.prev_page_url || rawMeta?.prev_page_url)) {
    total = items.length;
  }
  const lastPage = (total && perPage) ? Math.max(1, Math.ceil(total / perPage)) : (p?.last_page || rawMeta?.last_page || 1);
  const hasNext = !!(p?.next_page_url ?? rawMeta?.next_page_url);
  return { items, meta: { total: Number(total)||0, per_page: perPage, current_page: currentPage, last_page: Number(lastPage)||1, has_next: hasNext } };
}

/* UI */
const COLORS = { primary:'#2563eb', success:'#16a34a', amber:'#f59e0b', rose:'#e11d48', cyan:'#06b6d4' };

const StatCard = ({ title, value, icon, color='indigo' }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <h3 className="text-2xl font-bold mt-1">{nf(value)}</h3>
      </div>
      <div className={`w-12 h-12 rounded-full bg-${color}-100 flex items-center justify-center`}>
        {icon}
      </div>
    </div>
  </div>
);

const Section = ({ title, icon:Icon, right, children }) => (
  <div className="bg-white rounded-xl shadow-sm">
    <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">{Icon && <Icon className="text-slate-600" />}<h3 className="font-semibold text-slate-800">{title}</h3></div>
      <div>{right}</div>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const EmptyState = ({ emoji='📭', title='Aucune donnée', hint }) => (
  <div className="text-center text-slate-500 py-8">
    <div className="text-6xl mb-2">{emoji}</div>
    <div className="text-lg">{title}</div>
    {hint && <div className="text-sm mt-1">{hint}</div>}
  </div>
);

/* Dashboard */
export default function Dashboard() {
  const { setTitle } = useOutletContext();
  useEffect(() => { setTitle?.('Tableau de bord'); }, [setTitle]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('tokenGuard') : null;
  if (!token) window.location.href = '/auth';

  // KPIs contenus
  const [total, setTotal] = useState(0);
  const [published, setPublished] = useState(0);
  const [draft, setDraft] = useState(0);

  // KPIs “autres”
  const nonPublished = Math.max(0, total - published);
  const [usersCount, setUsersCount] = useState(0);
  const [pendingComments, setPendingComments] = useState(0);

  // Audience (30j)
  const [seriesViews, setSeriesViews] = useState([]);
  const [seriesComments, setSeriesComments] = useState([]);
  const [seriesShares, setSeriesShares] = useState([]);
  const visits30d   = seriesViews.reduce((s,r)=> s + (r.vues||0), 0);
  const comments30d = seriesComments.reduce((s,r)=> s + (r.comments||0), 0);
  const shares30d   = seriesShares.reduce((s,r)=> s + (r.shares||0), 0);

  // Notes
  const [topRated, setTopRated] = useState([]);
  const [lowRated, setLowRated] = useState([]);

  // Fichiers
  const [downloadsTotal, setDownloadsTotal] = useState(0);
  const [filesAll, setFilesAll] = useState([]);

  // Derniers + toggle local au card
  const [recent, setRecent] = useState([]);
  const [isGridRecent, setIsGridRecent] = useState(true);

  /* API helpers */
  const fetchCount = async (params) => {
    const { data } = await axios.get('/articles', { params: { per_page: 1, ...params }});
    const { meta } = normalizeList(data, 1);
    return meta.total || 0;
  };
  const fetchPage = async (params) => {
    const { data } = await axios.get('/articles', { params });
    return normalizeList(data, params.per_page || 100);
  };
  const fetchBulkArticles = async (max = 200) => {
    const p1 = await fetchPage({ per_page: 100, sort_by:'published_at', sort_direction:'desc' });
    let items = p1.items || [];
    if (items.length < max && p1.meta.has_next) {
      try {
        const p2 = await fetchPage({ per_page: 100, page: (p1.meta.current_page + 1), sort_by:'published_at', sort_direction:'desc' });
        items = items.concat(p2.items || []);
      } catch {}
    }
    return items.slice(0, max);
  };
  const fetchRecent = async () => {
    const { items } = await fetchPage({ per_page: 9, sort_by: 'published_at', sort_direction: 'desc' });
    return items;
  };
  const fetchAllFiles = async (cap = 1000) => {
    try {
      let page = 1, all = [], hasNext = true;
      while (hasNext && all.length < cap) {
        const { data } = await axios.get('/article-media', { params: { per_page: 100, page }});
        const { items, meta } = normalizeList(data, 100);
        all = all.concat(items || []);
        hasNext = !!meta.has_next;
        page += 1;
      }
      const mapped = all.map(f => ({
        id: f.id,
        name: f.name || f.title || f.filename || `Fichier #${f.id}`,
        download_count: Number(f.download_count || f.downloads || 0),
      })).sort((a,b)=> b.download_count - a.download_count);
      const totalDl = mapped.reduce((s,f)=> s + f.download_count, 0);
      return { list: mapped, total: totalDl };
    } catch { return { list: [], total: 0 }; }
  };

  /* Aggregations */
  const makeBuckets = (days) => {
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - (days-1));
    const map = new Map();
    for (let i=0;i<days;i++){ const d = new Date(start); d.setDate(start.getDate()+i); map.set(fmtDay(d), 0); }
    return map;
  };
  const seriesFrom = (items, field, days) => {
    const buckets = makeBuckets(days);
    (items||[]).forEach(a => {
      const d = toDate(a.published_at) || toDate(a.created_at);
      if (!d) return;
      const k = fmtDay(d);
      if (buckets.has(k)) {
        const v = Number(a[field] || 0);
        buckets.set(k, (buckets.get(k) || 0) + (Number.isFinite(v)?v:0));
      }
    });
    return Array.from(buckets.entries()).map(([day, count]) => ({ day, count }));
  };

  /* Load all */
  const load = useCallback(async () => {
    await ensureCsrf();

    // Compteurs clés (contenus)
    const [t, p, d] = await Promise.all([
      fetchCount({}),
      fetchCount({ status:'published' }),
      fetchCount({ status:'draft' }),
    ]);
    setTotal(t); setPublished(p); setDraft(d);

    // Utilisateurs (meta.total si dispo)
    try {
      const { data } = await axios.get('/users', { params: { per_page: 1 }});
      const { meta, items } = normalizeList(data, 1);
      setUsersCount(meta.total || (items?.length || 0));
    } catch { setUsersCount(0); }

    // Commentaires à modérer
    try {
      const { data } = await axios.get('/moderation/pending-count');
      // support: {pending: N} OU {count: N} OU N brut
      const n = (typeof data === 'number') ? data : (data?.pending ?? data?.count ?? 0);
      setPendingComments(Number(n)||0);
    } catch {
      // fallback: fetch list length
      try {
        const { data } = await axios.get('/moderation/pending');
        const { items } = normalizeList(data, 100);
        setPendingComments(items.length || 0);
      } catch { setPendingComments(0); }
    }

    // Articles (pour séries/notes) + récents
    const [bulk, rec] = await Promise.all([ fetchBulkArticles(200), fetchRecent() ]);
    setRecent(rec);

    const sViews = seriesFrom(bulk, 'view_count', 30).map(r => ({ day:r.day, vues:r.count }));
    const sComm  = seriesFrom(bulk, 'comment_count', 30).map(r => ({ day:r.day, comments:r.count }));
    const sShare = seriesFrom(bulk, 'share_count', 30).map(r => ({ day:r.day, shares:r.count }));
    setSeriesViews(sViews); setSeriesComments(sComm); setSeriesShares(sShare);

    // Notes
    const withRatings = [...bulk];
    const top = withRatings.filter(a => a.rating_count > 0)
      .sort((a,b)=> (Number(b.rating_average||0) - Number(a.rating_average||0)) || (Number(b.rating_count||0) - Number(a.rating_count||0)))
      .slice(0,5);
    const low = withRatings.filter(a => a.rating_count > 0)
      .sort((a,b)=> (Number(a.rating_average||0) - Number(b.rating_average||0)) || (Number(a.rating_count||0) - Number(b.rating_count||0)))
      .slice(0,5);
    setTopRated(top); setLowRated(low);

    // Fichiers
    const files = await fetchAllFiles();
    setFilesAll(files.list);
    setDownloadsTotal(files.total);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tableau de bord</h2>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-2">
          <FiRefreshCw /> Actualiser
        </button>
      </div>

      {/* KPIs essentiels (inclut brouillons, modération, utilisateurs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <StatCard title="Articles (Total)" value={total}        icon={<FiFileText className="text-indigo-600" />} color="indigo" />
        <StatCard title="Publiés"           value={published}    icon={<FiCheckCircle className="text-green-600" />} color="green" />
        <StatCard title="Brouillons"        value={draft}        icon={<FiEdit3 className="text-amber-600" />} color="yellow" />
        <StatCard title="Non publiés"       value={nonPublished} icon={<FiSlash className="text-slate-600" />} color="slate" />
        <StatCard title="À modérer"         value={pendingComments} icon={<FiMessageCircle className="text-rose-600" />} color="rose" />
        <StatCard title="Utilisateurs"      value={usersCount}   icon={<FiUsers className="text-blue-600" />} color="blue" />
      </div>

      {/* Audience */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Visiteurs ≈ Vues (30 jours)" icon={FiUsers} right={<span className="text-xs text-slate-500">{nf(visits30d)} au total</span>}>
          {seriesViews.length === 0 ? <EmptyState emoji="📉" title="Pas assez de données" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seriesViews}>
                  <defs>
                    <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLORS.primary} stopOpacity={0.6}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="vues" name="Vues" stroke={COLORS.primary} fill="url(#gradViews)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Commentaires (30 jours)" icon={FiMessageCircle} right={<span className="text-xs text-slate-500">{nf(comments30d)} au total</span>}>
          {seriesComments.length === 0 ? <EmptyState emoji="💬" title="Aucun commentaire agrégé" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seriesComments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="comments" name="Commentaires" fill={COLORS.cyan} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Partages (30 jours)" icon={FiShare2} right={<span className="text-xs text-slate-500">{nf(shares30d)} au total</span>}>
          {seriesShares.length === 0 ? <EmptyState emoji="🔗" title="Aucun partage agrégé" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seriesShares}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="shares" name="Partages" fill={COLORS.amber} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>

      {/* Notes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Meilleures notes" icon={FiThumbsUp}>
          {topRated.length === 0 ? <EmptyState emoji="🏆" title="Aucune note" /> : (
            <ul className="divide-y divide-slate-200">
              {topRated.map(a => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="truncate">{a.title || `#${a.id}`}</div>
                  <div className="text-sm font-semibold text-green-700">{Number(a.rating_average||0).toFixed(1)}/5</div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Notes à améliorer" icon={FiThumbsUp}>
          {lowRated.length === 0 ? <EmptyState emoji="🧪" title="Aucune note" /> : (
            <ul className="divide-y divide-slate-200">
              {lowRated.map(a => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="truncate">{a.title || `#${a.id}`}</div>
                  <div className="text-sm font-semibold text-rose-700">{Number(a.rating_average||0).toFixed(1)}/5</div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Derniers articles — toggle directement DANS la carte */}
      <Section
        title="Derniers articles"
        icon={FiList}
        right={
          <div className="flex bg-gray-100 rounded-md p-1">
            <button className={`flex items-center px-3 py-1 rounded-md text-sm ${isGridRecent ? 'bg-blue-600 text-white' : ''}`} onClick={() => setIsGridRecent(true)}>
              <FaThLarge className="mr-1" /> Grille
            </button>
            <button className={`flex items-center px-3 py-1 rounded-md text-sm ${!isGridRecent ? 'bg-blue-600 text-white' : ''}`} onClick={() => setIsGridRecent(false)}>
              <FaTable className="mr-1" /> Liste
            </button>
          </div>
        }
      >
        {recent.length === 0 ? <EmptyState emoji="📝" title="Aucun article récent" /> : (
          isGridRecent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {recent.map(a => (
                <div key={a.id} className="border rounded-xl p-3 bg-white">
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-slate-100 mb-2">
                    {(a.featured_image_url || a.featured_image)
                      ? <img src={a.featured_image_url || a.featured_image} alt={a.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">📰</div>}
                  </div>
                  <Link to={`/articles/${a.slug || a.id}`} target="_blank" className="font-medium line-clamp-2 hover:text-blue-600">
                    {a.title || <i className="text-slate-400">Sans titre</i>}
                  </Link>
                  <div className="text-xs text-slate-600 mt-1 flex gap-3">
                    <span>👁️ {kfmt(a.view_count||0)}</span>
                    <span>👍 {a.rating_average ? Number(a.rating_average).toFixed(1) : '—'}/5</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{a.status || 'draft'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {recent.map(a => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                  <Link to={`/articles/${a.slug || a.id}`} className="truncate hover:underline">{a.title || `#${a.id}`}</Link>
                  <div className="text-xs text-slate-600 flex gap-3">
                    <span>👁️ {kfmt(a.view_count||0)}</span>
                    <span>👍 {a.rating_average ? Number(a.rating_average).toFixed(1) : '—'}/5</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{a.status || 'draft'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </Section>

      {/* Tous les fichiers + téléchargements */}
      <Section title="Téléchargements par fichier (tous)" icon={FiDownload} right={<span className="text-xs text-slate-500">{nf(downloadsTotal)} téléchargements cumulés</span>}>
        {filesAll.length === 0 ? <EmptyState emoji="📁" title="Aucun fichier" hint="GET /api/article-media — utiliser download_count." /> : (
          <ul className="divide-y divide-slate-200">
            {filesAll.map(f => (
              <li key={f.id} className="py-2 flex items-center justify-between gap-2">
                <div className="truncate">{f.name}</div>
                <div className="text-sm font-medium text-slate-900">{nf(f.download_count)}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
