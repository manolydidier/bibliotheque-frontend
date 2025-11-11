// src/pages/activity/ActivityLog.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserEdit, faKey, faEllipsisV, faClock, faDownload, faSearch,
  faFilter, faTriangleExclamation, faChevronLeft, faChevronRight,
  faArrowsRotate, faNewspaper, faUserShield, faUser, faCommentDots,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

/* ---------------------------------------------------------------------------------- */
/* Icons & styles per type                                                            */
/* ---------------------------------------------------------------------------------- */
const TYPE_MAP = {
  permission_changed: { icon: faKey,        colorWrap: 'bg-indigo-100',  colorIcon: 'text-indigo-600',  label: 'Permission' },
  role_assigned:      { icon: faUserShield, colorWrap: 'bg-emerald-100', colorIcon: 'text-emerald-700', label: 'Rôle' },
  article_created:    { icon: faNewspaper,  colorWrap: 'bg-blue-100',    colorIcon: 'text-blue-600',    label: 'Article' },
  comment_approved:   { icon: faUserEdit,   colorWrap: 'bg-purple-100',  colorIcon: 'text-purple-600',  label: 'Commentaire' },
  comment_rejected:   { icon: faCommentDots,colorWrap: 'bg-amber-100',   colorIcon: 'text-amber-700',   label: 'Commentaire' },
  default:            { icon: faClock,      colorWrap: 'bg-gray-100',    colorIcon: 'text-gray-600',    label: 'Activité' },
};

/* ---------------------------------------------------------------------------------- */
/* Links helpers                                                                      */
/* ---------------------------------------------------------------------------------- */
const isAbs = (u) => /^https?:\/\//i.test(String(u || ''));
const withQuery = (href, params = {}) => {
  if (!href) return null;
  const m = String(href).match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  const base = m?.[1] ?? href;
  const qs0  = (m?.[2] ?? '').replace(/^\?/, '');
  const hash = m?.[3] ?? '';
  const search = new URLSearchParams(qs0);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const qs = search.toString();
  return `${base}${qs ? `?${qs}` : ''}${hash}`;
};

const toFrontPath = (href) => {
  if (!href) return null;
  if (href.startsWith('/')) return href;
  try { const u = new URL(href); return `${u.pathname}${u.search}${u.hash}`; }
  catch { return href; }
};

/** Construit le lien idéal en fonction du type + ajoute les params de modération si besoin */
const buildActivityLink = (a) => {
  // priorité aux liens fournis par l’API
  const direct = a.url || a.link;
  if (direct) return direct;

  const articleSlug =
    a.article_slug || a.slug || a.article?.slug || a.target_article_slug || null;

  switch (a.type) {
    case 'article_created':
      return articleSlug ? `/articles/${articleSlug}` : null;

    case 'comment_approved':
    case 'comment_rejected': {
      if (!articleSlug) return null;
      const commentId =
        a.comment_id || a.comment?.id ||
        (typeof a.id === 'string' && a.id.startsWith('comment-approve-')
          ? a.id.replace('comment-approve-', '')
          : null);
      const base = commentId
        ? `/articles/${articleSlug}#comment-${commentId}`
        : `/articles/${articleSlug}`;
      // Ajoute le contexte "moderate" pour auto-focus dans Comments.jsx si dispo
      return withQuery(base, {
        moderate: 1,
        comment_id: commentId || undefined,
        status: a.type === 'comment_approved' ? 'approved'
              : a.type === 'comment_rejected' ? 'rejected'
              : undefined,
      });
    }

    case 'role_assigned':
    case 'permission_changed':
      return '/settings';

    default:
      return null;
  }
};

const AnchorOrLink = ({ to, className, children, onClick }) => {
  if (!to) return <span className={className}>{children}</span>;
  const rel = toFrontPath(to);
  return isAbs(to) ? (
    <a href={to} className={className} target="_blank" rel="noopener noreferrer" onClick={onClick}>{children}</a>
  ) : (
    <Link to={rel} className={className} onClick={onClick}>{children}</Link>
  );
};

/* ---------------------------------------------------------------------------------- */
/* Read/unread (local)                                                                */
/* ---------------------------------------------------------------------------------- */
const SEEN_KEY = (uid) => `act_seen_ts:${uid}`;
const getSeen = (uid) => { try { return localStorage.getItem(SEEN_KEY(uid)); } catch { return null; } };
const setSeenNow = (uid) => { try { localStorage.setItem(SEEN_KEY(uid), new Date().toISOString()); } catch {} };

const OPEN_KEY = (type, id) => `opened:${type}:${id}`;
const getOpenedAt = (type, id) => { try { return localStorage.getItem(OPEN_KEY(type, id)); } catch { return null; } };
const setOpenedNow = (type, id) => { try { localStorage.setItem(OPEN_KEY(type, id), new Date().toISOString()); } catch {} };

const isAfter = (isoA, isoB) => {
  if (!isoA || !isoB) return false;
  const a = Date.parse(isoA), b = Date.parse(isoB);
  return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
};

/** Non-lu ssi jamais ouvert et créé après la dernière “seen ts” */
const isUnread = (item, userId) => {
  const id = item?.id;
  if (!id) return false;
  const opened = getOpenedAt(item.type || 'activity', id);
  if (opened) return false;
  const lastSeen = userId ? getSeen(userId) : null;
  const created = item?.created_at || item?.createdAt;
  return lastSeen ? isAfter(created, lastSeen) : false;
};

/* ---------------------------------------------------------------------------------- */
/* Safe field readers (tolère payloads variés)                                        */
/* ---------------------------------------------------------------------------------- */
const pickText = (...vals) => vals.find(v => typeof v === 'string' && v.trim()) || null;
const pickObj = (...vals) => vals.find(v => v && typeof v === 'object') || null;

/** Construit un bloc “détails” human-friendly en fonction du type */
const buildDetails = (a, t) => {
  const articleTitle = pickText(
    a.article_title, a.article?.title, a.target_article_title, a.title2
  );

  const commentText = pickText(
    a.comment_excerpt, a.comment?.excerpt, a.comment?.content, a.comment_snippet
  );

  const actor = pickObj(a.actor, a.user, a.by_user);
  const actorName = pickText(
    actor?.username, actor?.name, `${actor?.first_name || ''} ${actor?.last_name || ''}`.trim()
  );

  const targetUser = pickObj(a.target_user, a.grantee, a.affected_user);
  const targetUserName = pickText(
    targetUser?.username, targetUser?.name, `${targetUser?.first_name || ''} ${targetUser?.last_name || ''}`.trim()
  );

  const roleName = pickText(a.role_name, a.role?.name, a.role);
  const permName = pickText(a.permission_name, a.permission?.name, a.permission);

  switch (a.type) {
    case 'article_created':
      return articleTitle
        ? t('details_article_created', 'Article: {{x}}', { x: articleTitle })
        : t('details_article_created_no_title', 'Article créé');

    case 'comment_approved':
    case 'comment_rejected':
      return [
        commentText ? t('details_comment', 'Commentaire: {{x}}', { x: commentText }) : null,
        articleTitle ? t('details_on_article', 'Sur: {{x}}', { x: articleTitle }) : null,
        targetUserName ? t('details_by_user', 'Auteur: {{x}}', { x: targetUserName }) : null,
      ].filter(Boolean).join(' • ');

    case 'role_assigned':
      return [
        roleName ? t('details_role', 'Rôle: {{x}}', { x: roleName }) : null,
        targetUserName ? t('details_to_user', 'À: {{x}}', { x: targetUserName }) : null,
      ].filter(Boolean).join(' • ');

    case 'permission_changed':
      return [
        permName ? t('details_permission', 'Permission: {{x}}', { x: permName }) : null,
        targetUserName ? t('details_to_user', 'À: {{x}}', { x: targetUserName }) : null,
      ].filter(Boolean).join(' • ');

    default:
      return [
        articleTitle || null,
        targetUserName ? t('details_user', 'Utilisateur: {{x}}', { x: targetUserName }) : null,
      ].filter(Boolean).join(' • ');
  }
};

/* ---------------------------------------------------------------------------------- */
/* Main component                                                                     */
/* ---------------------------------------------------------------------------------- */
const ActivityLog = () => {
  const { t } = useTranslation();
  const user = useSelector((s) => s?.library?.auth?.user);
  const userId = user?.id;

  const [filters, setFilters] = useState({
    q: '',
    type: '',
    from: '',
    to: '',
    page: 1,
    perPage: 10,
    asActor: true,   // Nouvel interrupteur : activités faites par moi
    asTarget: false, // Celles qui me concernent
  });
  const [showFilters, setShowFilters] = useState(false);

  const [data, setData] = useState({
    items: [],
    meta: { current_page: 1, last_page: 1, total: 0, per_page: 10 },
    loading: false,
    error: null
  });

  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q.trim()), 400);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : value }));
  };

  const clearFilters = () => {
    setFilters(prev => ({
      q: '',
      type: '',
      from: '',
      to: '',
      page: 1,
      perPage: prev.perPage,
      asActor: true,
      asTarget: false,
    }));
  };

  const hasActiveFilters = useMemo(
    () => !!(filters.q || filters.type || filters.from || filters.to || filters.asActor || filters.asTarget),
    [filters]
  );

  const formatDate = useCallback((iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date)) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === new Date(now - 86400000).toDateString();
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `${t('today', "Aujourd'hui")} ${t('at', 'à')} ${time}`;
    if (isYesterday) return `${t('yesterday', 'Hier')} ${t('at', 'à')} ${time}`;
    return `${date.toLocaleDateString('fr-FR')} ${t('at', 'à')} ${time}`;
  }, [t]);

  const fetchActivities = useCallback(async () => {
    if (!userId) return;
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('tokenGuard');
      const params = {
        per_page: filters.perPage,
        page: filters.page,
        ...(debouncedQ && { q: debouncedQ }),
        ...(filters.type && { type: filters.type }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        // Deux portées : as_actor et as_target. L'API peut n'en accepter qu'une ; on envoie les deux pour être explicite.
        ...(filters.asActor ? { as_actor: 1 } : { as_actor: 0 }),
        ...(filters.asTarget ? { as_target: 1 } : { as_target: 0 }),
      };
      const { data: response } = await axios.get(`/users/${userId}/activities`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      setData(prev => ({
        ...prev,
        items: Array.isArray(response?.data) ? response.data : [],
        meta: {
          current_page: response?.meta?.current_page || 1,
          last_page: response?.meta?.last_page || 1,
          total: response?.meta?.total || 0,
          per_page: response?.meta?.per_page || filters.perPage
        },
        loading: false
      }));

      if (response?.meta?.current_page && response.meta.current_page !== filters.page) {
        setFilters(prev => ({ ...prev, page: response.meta.current_page }));
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: {
          status: error?.response?.status,
          message: error?.response?.data?.message || error?.message || t('error_generic', 'Une erreur est survenue.')
        },
        items: [],
        loading: false
      }));
    }
  }, [userId, filters.page, filters.perPage, debouncedQ, filters.type, filters.from, filters.to, filters.asActor, filters.asTarget, t]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // Marquer tous comme "vus" quand on ouvre la page — optionnel ; sinon commente la ligne ci-dessous
  useEffect(() => { if (userId) setSeenNow(userId); }, [userId]);

  const handlePagination = (direction) => {
    const newPage = direction === 'prev'
      ? Math.max(1, filters.page - 1)
      : Math.min(data.meta.last_page || 1, filters.page + 1);
    if (newPage !== filters.page) updateFilter('page', newPage);
  };

  const exportCSV = () => {
    const headers = ['id', 'type', 'title', 'details', 'created_at', 'link'];
    const rows = data.items.map(item => {
      const link = buildActivityLink(item) || '';
      const details = buildDetails(item, t) || '';
      return [item.id || '', item.type || '', item.title || '', details, item.created_at || '', link]
        .map(field => `"${String(field).replaceAll('"','""')}"`);
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `activities_p${filters.page}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('activity_log', "Journal d'Activité")}</h2>
          <p className="text-gray-500 text-sm">
            {t('user_actions_history', 'Historique des actions utilisateur')} — {user?.username || user?.name || t('me','Moi')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filters.perPage}
            onChange={(e) => updateFilter('perPage', Number(e.target.value))}
            className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm"
            title={t('per_page', 'Par page')}
          >
            <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
              showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            title={t('filters','Filtres')}
          >
            <FontAwesomeIcon icon={faFilter} />
            {t('filter_short','Filtrer')}
            {hasActiveFilters && (
              <span className="ml-1 bg-indigo-100 text-indigo-800 text-[11px] px-1.5 py-0.5 rounded-full">
                {
                  [filters.q, filters.type, filters.from, filters.to, filters.asActor && '1', filters.asTarget && '1']
                    .filter(Boolean).length
                }
              </span>
            )}
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <FontAwesomeIcon icon={faDownload} />
            {t('export_short','CSV')}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 text-sm">{t('filters','Filtres')}</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700 underline">
                {t('clear_all_short','Effacer')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Recherche */}
            <div className="space-y-1 lg:col-span-2">
              <label className="block text-xs font-medium text-gray-700">{t('search_short','Rech.')}</label>
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => updateFilter('q', e.target.value)}
                  placeholder={t('search_placeholder_short','Texte…')}
                  className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">{t('type_short','Type')}</label>
              <select
                value={filters.type}
                onChange={(e) => updateFilter('type', e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">{t('all_short','Tous')}</option>
                <option value="permission_changed">{t('permission_changed_short','Perm.')}</option>
                <option value="role_assigned">{t('role_assigned_short','Rôles')}</option>
                <option value="article_created">{t('article_created_short','Articles')}</option>
                <option value="comment_approved">{t('comment_approved_short','Comms ✔')}</option>
                <option value="comment_rejected">{t('comment_rejected_short','Comms ✕')}</option>
              </select>
            </div>

            {/* Du / Au */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">{t('from_short','Du')}</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => updateFilter('from', e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">{t('to_short','Au')}</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => updateFilter('to', e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Portées */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">{t('scope','Portée')}</label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!filters.asActor}
                    onChange={(e) => updateFilter('asActor', e.target.checked)}
                  />
                  {t('as_actor','Par moi')}
                </label>
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!filters.asTarget}
                    onChange={(e) => updateFilter('asTarget', e.target.checked)}
                  />
                  {t('as_target','Me concernant')}
                </label>
              </div>
            </div>
          </div>

          {/* Badges actifs */}
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-1.5">
                {filters.q && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                    <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
                    {filters.q}
                    <button onClick={() => updateFilter('q', '')} className="ml-1 hover:text-blue-900">×</button>
                  </span>
                )}
                {filters.type && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {t(filters.type, filters.type.replace('_',' '))}
                    <button onClick={() => updateFilter('type', '')} className="ml-1 hover:text-purple-900">×</button>
                  </span>
                )}
                {filters.from && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                    {new Date(filters.from).toLocaleDateString('fr-FR')}
                    <button onClick={() => updateFilter('from', '')} className="ml-1 hover:text-green-900">×</button>
                  </span>
                )}
                {filters.to && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                    {new Date(filters.to).toLocaleDateString('fr-FR')}
                    <button onClick={() => updateFilter('to', '')} className="ml-1 hover:text-orange-900">×</button>
                  </span>
                )}
                {filters.asActor && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                    {t('as_actor','Par moi')}
                    <button onClick={() => updateFilter('asActor', false)} className="ml-1 hover:text-indigo-900">×</button>
                  </span>
                )}
                {filters.asTarget && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                    {t('as_target','Me concernant')}
                    <button onClick={() => updateFilter('asTarget', false)} className="ml-1 hover:text-indigo-900">×</button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 overflow-auto">
        {data.loading && (
          <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
            <FontAwesomeIcon icon={faArrowsRotate} className="animate-spin" />
            {t('loading', 'Chargement')}…
          </div>
        )}

        {data.error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border-t border-b border-red-200 flex items-start gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
            <div>
              <div className="font-medium">
                {t('activity_load_failed', "Échec du chargement des activités")}
                {data.error.status && ` (${data.error.status})`}
              </div>
              <div className="text-red-700/90">{data.error.message}</div>
              <button
                onClick={fetchActivities}
                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-100 transition"
              >
                <FontAwesomeIcon icon={faArrowsRotate} />
                {t('retry', 'Réessayer')}
              </button>
            </div>
          </div>
        )}

        {!data.loading && !data.error && data.items.length === 0 && (
          <div className="p-4 text-sm text-gray-500">{t('no_activity', 'Aucune activité')}</div>
        )}

        {data.items.length > 0 && (
          <div className="divide-y divide-gray-200">
            {data.items.map(a => {
              const typeConfig = TYPE_MAP[a.type] || TYPE_MAP.default;
              const link = buildActivityLink(a);
              const unread = isUnread(a, userId);
              const titleText =
                a.title ||
                (TYPE_MAP[a.type]?.label
                  ? `${TYPE_MAP[a.type].label} — ${a?.action || ''}`.trim()
                  : a.type || t('activity','Activité'));

              const details = buildDetails(a, t);

              const onOpen = () => {
                // Marquer l'activité comme “ouverte”
                if (a?.id) setOpenedNow(a.type || 'activity', a.id);
              };

              return (
                <div key={a.id || `${a.type}-${a.created_at}`} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 ${typeConfig.colorWrap} p-2 rounded-full mr-3 relative`}>
                      <FontAwesomeIcon icon={typeConfig.icon} className={typeConfig.colorIcon} />
                      {unread && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <AnchorOrLink
                        to={link}
                        onClick={onOpen}
                        className={`text-sm ${unread ? 'font-semibold' : 'font-medium'} ${
                          link ? 'text-indigo-700 hover:underline' : 'text-gray-900'
                        } truncate flex items-center gap-2`}
                      >
                        {titleText}
                        {/* Affiche l'utilisateur ciblé si pertinent */}
                        {a?.target_user && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <FontAwesomeIcon icon={faUser} />
                            {a.target_user?.username || a.target_user?.name}
                          </span>
                        )}
                      </AnchorOrLink>

                      {details && (
                        <p className={`text-[13px] mt-1 ${unread ? 'text-gray-700' : 'text-gray-500'}`}>
                          {details}
                        </p>
                      )}

                      {a.created_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          <FontAwesomeIcon icon={faClock} className="mr-1" />
                          {formatDate(a.created_at)}
                        </p>
                      )}
                    </div>

                    <button className="text-gray-400 hover:text-gray-600 ml-2">
                      <FontAwesomeIcon icon={faEllipsisV} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          onClick={() => handlePagination('prev')}
          disabled={data.loading || filters.page <= 1}
          className={`px-3 py-1.5 rounded border text-sm ${
            filters.page <= 1 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <span className="text-sm text-gray-600">
          {t('page', 'Page')} {filters.page} / {data.meta.last_page}
        </span>
        <button
          onClick={() => handlePagination('next')}
          disabled={data.loading || filters.page >= data.meta.last_page}
          className={`px-3 py-1.5 rounded border text-sm ${
            filters.page >= data.meta.last_page ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  );
};

export default ActivityLog;
