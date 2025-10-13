// src/pages/articles/TrashedPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Toast from '../../../../../component/toast/Toaster';
import { FaSync, FaTrashRestore, FaTrash, FaChevronLeft } from 'react-icons/fa';

/* ========= Axios local (pas d'import articles.js) ========= */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
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

// Endpoints **locaux**
const listTrashed = (params = {}) =>
  api.get('/corbeille', { params }).then((r) => r.data);

const restoreArticle = (id) =>
  api.post(`/articles/${id}/restore`).then((r) => r.data);

const destroyArticleHard = async (id) => {
  try {
    return await api.delete(`/articles/${id}/hard-delete`).then((r) => r.data);
  } catch (e) {
    // compat: certains contrôleurs utilisent DELETE /articles/{id}?force=1
    if (e?.response?.status === 404) {
      return api.delete(`/articles/${id}`, { params: { force: 1 } }).then((r) => r.data);
    }
    throw e;
  }
};

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

/* ========= Helpers Dates (FR + relatif) ========= */
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
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(12);

  // Réponse attendue du backend : { message, data: <paginator> }
  const [data, setData] = useState({
    data: [],
    meta: { current_page: 1, last_page: 1, total: 0, per_page: 12 },
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // sélection multiple
  const [selected, setSelected] = useState(new Set());

  // Toujours garantir un tableau pour éviter “rows.some is not a function”
  const rows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);

  const allChecked  = rows.length > 0 && rows.every((a) => selected.has(a.id));
  const someChecked = rows.some ? rows.some((a) => selected.has(a.id)) : false;

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
      const res = await listTrashed({ page, per_page: per });
      const pg = res?.data;
      setData(
        pg || { data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: per } }
      );
      setSelected(new Set());
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, per]);

  // actions unitaires
  const doRestore = async (id) => {
    try {
      await restoreArticle(id);
      setToast({ type: 'success', message: 'Article restauré' });
      load();
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur' });
    }
  };

  const doDestroy = async (id) => {
    if (!window.confirm('Suppression définitive ?')) return;
    try {
      await destroyArticleHard(id);
      setToast({ type: 'success', message: 'Supprimé définitivement' });
      load();
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Erreur' });
    }
  };

  // actions groupées
  const doRestoreSelected = async () => {
    if (selected.size === 0) return;
    try {
      await Promise.all(Array.from(selected).map((id) => restoreArticle(id)));
      setToast({ type: 'success', message: `Restauré ${selected.size} élément(s)` });
      load();
    } catch (e) {
      setToast({
        type: 'error',
        message: e?.response?.data?.message || 'Erreur durant la restauration',
      });
    }
  };

  const doDestroySelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Supprimer définitivement ${selected.size} élément(s) ?`)) return;
    try {
      await Promise.all(Array.from(selected).map((id) => destroyArticleHard(id)));
      setToast({ type: 'success', message: `Supprimé ${selected.size} élément(s)` });
      load();
    } catch (e) {
      setToast({
        type: 'error',
        message: e?.response?.data?.message || 'Erreur durant la suppression',
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="p-5 border-b bg-gradient-to-r from-slate-600 to-slate-700 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/articles"
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
              onChange={(e) => {
                setPer(Number(e.target.value));
                setPage(1);
              }}
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
              ref={(el) => {
                if (el) el.indeterminate = !allChecked && someChecked;
              }}
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
                  ref={(el) => {
                    if (el) el.indeterminate = !allChecked && someChecked;
                  }}
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
                  <td className="px-3 py-4">
                    <div className="h-4 w-4 bg-slate-100 rounded" />
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-12 w-12 bg-slate-100 rounded-lg" />
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-4 w-64 bg-slate-100 rounded" />
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-4 w-40 bg-slate-100 rounded" />
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-4 w-40 bg-slate-100 rounded" />
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="h-8 w-32 bg-slate-100 rounded" />
                  </td>
                </tr>
              ))}

            {!loading &&
              rows.map((a) => {
                const del = toDate(a.deleted_at);
                const delDate = del ? `${formatDate(del)} • ${formatTime(del)}` : '—';
                const delRel = del ? formatRelative(del) : '';

                const thumb = a.featured_image_url || a.featured_image || null;
                const authorName =
                  a?.author?.name || a?.author_name || (a?.author_id ? `Auteur #${a.author_id}` : '—');

                const cats = Array.isArray(a.categories) ? a.categories.slice(0, 3) : [];
                const tags = Array.isArray(a.tags) ? a.tags.slice(0, 4) : [];

                return (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors duration-200 group">
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
          Total : <b>{data?.meta?.total || 0}</b> • Page <b>{data?.meta?.current_page || 1}</b> /{' '}
          <b>{data?.meta?.last_page || 1}</b>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={per}
            onChange={(e) => {
              setPer(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1"
            title="Éléments par page"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
          <button
            className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50"
            disabled={(data?.meta?.current_page || 1) <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Préc.
          </button>
          <button
            className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-50"
            disabled={(data?.meta?.current_page || 1) >= (data?.meta?.last_page || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Suiv.
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrashedPage;
