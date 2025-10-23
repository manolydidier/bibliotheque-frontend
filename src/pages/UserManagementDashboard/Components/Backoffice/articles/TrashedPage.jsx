// src/pages/articles/TrashedPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Toast from '../../../../../component/toast/Toaster';
import { FaSync, FaTrashRestore, FaTrash, FaChevronLeft } from 'react-icons/fa';

/* ========= Axios local ========= */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // ex: "/api"
  withCredentials: false, // pas de Sanctum ici
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tokenGuard');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// Endpoints
const listTrashed = (params = {}) => api.get('/corbeille', { params }).then((r) => r.data);
const restoreArticle = (id) => api.post(`/articles/${id}/restore`).then((r) => r.data);
const destroyArticleHard = async (id) => {
  try {
    return await api.delete(`/articles/${id}/hard-delete`).then((r) => r.data);
  } catch (e) {
    if (e?.response?.status === 404) {
      return api.delete(`/articles/${id}`, { params: { force: 1 } }).then((r) => r.data);
    }
    throw e;
  }
};

/* ========= Normalisation (paginate/simplePaginate/wrapper) ========= */
function normalizeTrashedResponse(raw, fallbackPer = 12) {
  const p0 = raw || {};
  const p = (p0 && p0.data && !Array.isArray(p0.data)) ? p0.data : p0;

  const items =
    (Array.isArray(p?.data)  && p.data)  ||
    (Array.isArray(p?.items) && p.items) ||
    (Array.isArray(p0)       && p0)      || [];

  const flat = p || {};
  const metaSrc = (p?.meta && typeof p.meta === 'object') ? p.meta : flat;

  const per_page     = Number(metaSrc.per_page ?? fallbackPer) || fallbackPer;
  const current_page = Number(metaSrc.current_page ?? metaSrc.page ?? 1) || 1;

  let total = metaSrc.total;
  if (typeof total !== 'number') {
    total = (Array.isArray(items) && items.length && !metaSrc.next_page_url && !metaSrc.prev_page_url)
      ? items.length
      : 0;
  }
  total = Number(total) || 0;

  let last_page = metaSrc.last_page;
  if (typeof last_page !== 'number') {
    if (total && per_page) {
      last_page = Math.max(1, Math.ceil(total / per_page));
    } else {
      last_page = flat.next_page_url ? (current_page + 1) : current_page;
    }
  }
  last_page = Number(last_page) || 1;

  return { data: items, meta: { current_page, last_page, total, per_page } };
}

/* ========= Helpers UI ========= */
const Thumb = ({ src, alt }) =>
  src ? (
    <img
      src={src}
      alt={alt || 'thumb'}
      className="w-12 h-12 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
    />
  ) : (
    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
      🗞️
    </div>
  );

/* ========= Dates FR ========= */
const RE_SQL = /^\d{4}-\d{2}-\d{2}(?:[ T])\d{2}:\d{2}:\d{2}$/;
function toDate(val) {
  if (!val) return null;
  if (typeof val === 'string' && RE_SQL.test(val)) return new Date(val.replace(' ', 'T'));
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

/* ========= Page ========= */
const TrashedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fromDock = Boolean(location.state?.fromIndex);

  // origine du “dock” (bas-droit) — ajuste si besoin
  const dockVars = fromDock ? { '--dock-x': '24px', '--dock-y': '112px' } : {};

  const [page, setPage] = useState(1);
  const [per, setPer] = useState(12);

  const [data, setData] = useState({
    data: [],
    meta: { current_page: 1, last_page: 1, total: 0, per_page: 12 },
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(new Set());

  // lignes en “sortie” (restauration/suppression) → classe d’anim
  const [leaving, setLeaving] = useState({}); // { [id]: 'row-untrash' | 'row-destroy' }

  const rows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);
  const allChecked  = rows.length > 0 && rows.every((a) => selected.has(a.id));
  const someChecked = rows.some((a) => selected.has(a.id));

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((a) => a.id)));
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const raw = await listTrashed({ page, per_page: per });
      const normalized = normalizeTrashedResponse(raw, per);
      setData(normalized);
      setSelected(new Set());
      setLeaving({});
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, per]);

  // actions unitaires
  const doRestore = async (id) => {
    // anim de sortie (vers la droite) puis navigation
    setLeaving((prev) => ({ ...prev, [id]: 'row-untrash' }));
    try {
      await restoreArticle(id);
      setToast({ type: 'success', message: 'Article restauré' });
      // laisse l’anim se jouer, puis retour avec l’ID restauré pour pulser dans l’index
      setTimeout(() => {
        navigate('/articlescontroler', { state: { restoredIds: [id] } });
      }, 320);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur' });
      // rollback classe si besoin
      setLeaving((prev) => { const n={...prev}; delete n[id]; return n; });
    }
  };

  const doDestroy = async (id) => {
    if (!window.confirm('Suppression définitive ?')) return;
    setLeaving((prev) => ({ ...prev, [id]: 'row-destroy' }));
    try {
      await destroyArticleHard(id);
      setToast({ type: 'success', message: 'Supprimé définitivement' });
      // retirer la ligne après anim
      setTimeout(() => {
        setData((prev) => ({ ...prev, data: prev.data.filter((r) => r.id !== id) }));
      }, 420);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur' });
      setLeaving((prev) => { const n={...prev}; delete n[id]; return n; });
    }
  };

  // actions groupées
  const doRestoreSelected = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setLeaving((prev) => {
      const n = { ...prev };
      ids.forEach((id) => (n[id] = 'row-untrash'));
      return n;
    });
    try {
      await Promise.all(ids.map((id) => restoreArticle(id)));
      setToast({ type: 'success', message: `Restauré ${ids.length} élément(s)` });
      setTimeout(() => {
        navigate('/articlescontroler', { state: { restoredIds: ids } });
      }, 320);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur durant la restauration' });
      setLeaving((prev) => {
        const n = { ...prev };
        ids.forEach((id) => delete n[id]);
        return n;
      });
    }
  };

  const doDestroySelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Supprimer définitivement ${selected.size} élément(s) ?`)) return;
    const ids = Array.from(selected);
    setLeaving((prev) => {
      const n = { ...prev };
      ids.forEach((id) => (n[id] = 'row-destroy'));
      return n;
    });
    try {
      await Promise.all(ids.map((id) => destroyArticleHard(id)));
      setToast({ type: 'success', message: `Supprimé ${ids.length} élément(s)` });
      setTimeout(() => { load(); }, 420);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur durant la suppression' });
      setLeaving((prev) => {
        const n = { ...prev };
        ids.forEach((id) => delete n[id]);
        return n;
      });
    }
  };

  const { total, current_page, last_page } = data.meta || {};

  return (
    <div className="relative">
      {/* Styles & animations */}
      <style>{`
        :root {
          --dock-x: 24px;
          --dock-y: 112px;
          --dock-overshoot-scale: 1.045;
          --dock-start-scale: .92;
          --dock-start-rot: -2.2deg;
          --dock-mid-rot: .6deg;
          --win-duration: 560ms;
          --row-duration: 320ms;
        }
        @media (prefers-reduced-motion: reduce) {
          :root { --win-duration: 1ms; --row-duration: 1ms; }
        }
        @keyframes windowFromDockSmooth {
          0% {
            opacity: 0;
            transform-origin: 90% 100%;
            transform:
              translate3d(var(--dock-x), var(--dock-y), 0)
              scale(var(--dock-start-scale))
              rotate(var(--dock-start-rot));
            filter: saturate(.95) blur(.4px);
          }
          55% {
            opacity: 1;
            transform:
              translate3d(-6px, -6px, 0)
              scale(var(--dock-overshoot-scale))
              rotate(var(--dock-mid-rot));
            filter: none;
          }
          75% { transform: translate3d(2px, 2px, 0) scale(.997) rotate(-.15deg); }
          100% { transform: translate3d(0,0,0) scale(1) rotate(0); }
        }
        @keyframes dockHalo {
          0%   { opacity: 0; transform: translate(28px, 120px) scale(.78); }
          10%  { opacity: .35; }
          100% { opacity: 0; transform: translate(-8px, -10px) scale(1.28); }
        }
        @keyframes rowAppear { 0%{opacity:0; transform:translateY(6px);} 100%{opacity:1; transform:translateY(0);} }
        tr.row-appear { animation: rowAppear var(--row-duration) ease-out both; will-change: transform, opacity; }

        @keyframes untrashRow {
          0% { background:#ecfdf5; transform:translateX(0); opacity:1; }
          60%{ background:#ecfdf5; transform:translateX(6px); opacity:.9; }
          100%{ background:transparent; transform:translateX(16px); opacity:0; }
        }
        tr.row-untrash { animation: untrashRow 420ms ease-in-out forwards; will-change: transform, opacity; }

        @keyframes hardRemoveRow {
          0% { background:#fff1f2; transform:scale(1); opacity:1; }
          40%{ background:#fff1f2; transform:scale(.995) translateY(-1px); opacity:.9; }
          100%{ background:transparent; transform:scale(.985); opacity:0; }
        }
        tr.row-destroy { animation: hardRemoveRow 420ms ease-in-out forwards; will-change: transform, opacity; }

        tr.row-untrash > td, tr.row-destroy > td { border-color: transparent !important; }
      `}</style>

      {/* Halo (uniquement à l'ouverture depuis le dock) */}
      {fromDock && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <div
            className="absolute right-2 bottom-2 w-40 h-40 rounded-full bg-blue-400/20 blur-3xl"
            style={{ animation: 'dockHalo 820ms ease-out both' }}
          />
        </div>
      )}

      {/* Fenêtre principale */}
      <div
        className={`relative bg-white rounded-2xl shadow-lg ring-1 ring-slate-200/80 overflow-hidden ${fromDock ? 'will-change-transform' : ''}`}
        style={fromDock ? { animation: 'windowFromDockSmooth var(--win-duration) cubic-bezier(.2,.75,.25,1) both', ...dockVars } : undefined}
      >
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-slate-600 to-slate-700 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/articlescontroler"
                className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 rounded hover:bg-white/20"
              >
                <FaChevronLeft /> Retour
              </Link>
              <div>
                <h2 className="text-xl font-semibold">Corbeille des articles</h2>
                <p className="text-sm opacity-90">Restaurez ou supprimez définitivement vos articles.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded inline-flex items-center gap-2"
                title="Actualiser"
              >
                <FaSync /> Actualiser
              </button>
              <select
                value={per}
                onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }}
                className="px-3 py-2 bg-white text-slate-800 rounded"
                title="Éléments par page"
              >
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
                <option value={48}>48 / page</option>
                <option value={96}>96 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Toolbar sélection groupée */}
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                onChange={toggleAll}
              />
              Sélectionner la page
            </label>
            {selected.size > 0 && (
              <span className="text-sm text-slate-600">{selected.size} élément(s) sélectionné(s)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
              onClick={doRestoreSelected}
              disabled={selected.size === 0 || loading}
              title="Restaurer la sélection"
            >
              <span className="inline-flex items-center gap-2">
                <FaTrashRestore /> Restaurer
              </span>
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50"
              onClick={doDestroySelected}
              disabled={selected.size === 0 || loading}
              title="Supprimer définitivement la sélection"
            >
              <span className="inline-flex items-center gap-2">
                <FaTrash /> Suppr. déf.
              </span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-3 py-3 text-xs font-medium text-slate-600">Image</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Titre</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Auteur</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Catégories</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Tags</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">Supprimé le</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-slate-600">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {/* Skeleton */}
              {loading &&
                Array.from({ length: Math.min(per, 6) }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td className="px-3 py-4"><div className="h-4 w-4 bg-slate-100 rounded" /></td>
                    <td className="px-3 py-4"><div className="h-12 w-12 bg-slate-100 rounded-lg" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-64 bg-slate-100 rounded" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-40 bg-slate-100 rounded" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-40 bg-slate-100 rounded" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                    <td className="px-3 py-4 text-right"><div className="h-8 w-32 bg-slate-100 rounded" /></td>
                  </tr>
                ))}

              {!loading &&
                rows.map((a, i) => {
                  const del = toDate(a.deleted_at);
                  const delDate = del ? `${formatDate(del)} • ${formatTime(del)}` : '—';
                  const delRel = del ? formatRelative(del) : '';
                  const thumb = a.featured_image_url || a.featured_image || null;
                  const authorName =
                    a?.author?.name || a?.author_name || (a?.author_id ? `Auteur #${a.author_id}` : '—');
                  const cats = Array.isArray(a.categories) ? a.categories.slice(0, 3) : [];
                  const tags = Array.isArray(a.tags) ? a.tags.slice(0, 4) : [];

                  const lineClass = leaving[a.id] || 'row-appear';
                  const delay = `${Math.min(i, 12) * 40}ms`;

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-slate-50/50 transition-colors duration-200 group ${lineClass}`}
                      style={lineClass === 'row-appear' ? { animationDelay: delay } : undefined}
                    >
                      <td className="px-3 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggleOne(a.id)}
                        />
                      </td>

                      <td className="px-3 py-4 align-top">
                        <Thumb src={thumb} alt={a.featured_image_alt || a.title} />
                      </td>

                      <td className="px-3 py-4 align-top">
                        <div className="font-semibold text-slate-900 line-clamp-1" title={a.title || ''}>
                          {a.title || <span className="text-slate-400 italic">Sans titre</span>}
                        </div>
                        {a.slug && <div className="text-xs text-slate-500 mt-0.5">/{a.slug}</div>}
                        {a.excerpt && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2 max-w-xl">{a.excerpt}</div>
                        )}
                      </td>

                      <td className="px-3 py-4 align-top text-sm">{authorName}</td>

                      <td className="px-3 py-4 align-top">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {cats.length ? (
                            cats.map((c) => (
                              <span
                                key={`c-${a.id}-${c.id || c.name}`}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                              >
                                {c.name || c.title || `#${c.id}`}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-4 align-top">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {tags.length ? (
                            tags.map((t) => (
                              <span
                                key={`t-${a.id}-${t.id || t.name}`}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                              >
                                #{t.name || t.title || t.id}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-4 align-top text-sm">
                        <div className="font-medium text-slate-900">{delDate}</div>
                        <div className="text-xs text-slate-500">{delRel}</div>
                      </td>

                      <td className="px-3 py-4 text-right align-top">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className="px-2.5 py-1.5 rounded-lg border text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 transition"
                            onClick={() => doRestore(a.id)}
                            title="Restaurer"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <FaTrashRestore /> Restaurer
                            </span>
                          </button>
                          <button
                            className="px-2.5 py-1.5 rounded-lg border text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100 transition"
                            onClick={() => doDestroy(a.id)}
                            title="Supprimer définitivement"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <FaTrash /> Suppr.
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td className="p-10 text-center text-slate-500" colSpan={8}>
                    <div className="inline-flex flex-col items-center gap-2">
                      <div className="text-6xl mb-2">🗑️</div>
                      <p className="text-lg">Corbeille vide</p>
                      <button onClick={load} className="text-blue-600 hover:text-blue-800 text-sm">
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
            Total : <b>{total || 0}</b> • Page <b>{current_page || 1}</b> / <b>{last_page || 1}</b>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50"
              disabled={(current_page || 1) <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Préc.
            </button>
            <button
              className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50"
              disabled={(current_page || 1) >= (last_page || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Suiv.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrashedPage;
