import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserEdit, faKey, faEllipsisV, faClock, faDownload, faSearch,
  faFilter, faTriangleExclamation, faChevronLeft, faChevronRight,
  faArrowsRotate, faNewspaper, faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const TYPE_MAP = {
  permission_changed: { icon: faKey,        colorWrap: 'bg-indigo-100',  colorIcon: 'text-indigo-600' },
  role_assigned:      { icon: faUserShield, colorWrap: 'bg-emerald-100', colorIcon: 'text-emerald-700' },
  article_created:    { icon: faNewspaper,  colorWrap: 'bg-blue-100',    colorIcon: 'text-blue-600' },
  comment_approved:   { icon: faUserEdit,   colorWrap: 'bg-purple-100',  colorIcon: 'text-purple-600' },
  default:            { icon: faClock,      colorWrap: 'bg-gray-100',    colorIcon: 'text-gray-600' },
};

// Rend <a> si URL absolue, sinon <Link>
const AnchorOrLink = ({ to, className, children }) => {
  if (!to) return <span className={className}>{children}</span>;
  const isAbsolute = /^https?:\/\//i.test(to);
  return isAbsolute ? (
    <a href={to} className={className} target="_blank" rel="noopener noreferrer">{children}</a>
  ) : (
    <Link to={to} className={className}>{children}</Link>
  );
};

// Lien basé exclusivement sur les slugs d'article
const buildActivityLink = (a) => {
  // Si l’API fournit une URL directe, on l’utilise
  const direct = a.url || a.link;
  if (direct) return direct;

  const articleSlug = a.article_slug || a.slug; // l’API envoie 'article_slug' (ou fallback 'slug')

  switch (a.type) {
    case 'article_created':
      return articleSlug ? `/articles/${articleSlug}` : null;

    case 'comment_approved': {
      if (!articleSlug) return null;
      const commentId =
        a.comment_id ||
        (typeof a.id === 'string' && a.id.startsWith('comment-approve-')
          ? a.id.replace('comment-approve-', '')
          : null);
      return commentId ? `/articles/${articleSlug}#comment-${commentId}` : `/articles/${articleSlug}`;
    }

    case 'role_assigned':
    case 'permission_changed':
      return '/settings';

    default:
      return null;
  }
};

const ActivityLog = () => {
  const { t } = useTranslation();
  const userId = useSelector(state => state?.library?.auth?.user?.id);

  const [filters, setFilters] = useState({
    q: '',
    type: '',
    from: '',
    to: '',
    page: 1,
    perPage: 10,
    asTarget: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  const [data, setData] = useState({
    items: [],
    meta: { current_page: 1, last_page: 1, total: 0, per_page: 10 },
    loading: false,
    error: null
  });

  // Debounce recherche texte
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q.trim()), 400);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : value }));
  };

  const clearFilters = () => {
    setFilters({
      q: '',
      type: '',
      from: '',
      to: '',
      page: 1,
      perPage: 10,
      asTarget: false,
    });
  };

  const hasActiveFilters = filters.q || filters.type || filters.from || filters.to || filters.asTarget;

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
      const token = localStorage.getItem('auth_token');
      const params = {
        per_page: filters.perPage,
        page: filters.page,
        ...(debouncedQ && { q: debouncedQ }),
        ...(filters.type && { type: filters.type }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.asTarget ? { as_target: 1 } : { as_target: 0 }),
      };

      const { data: response } = await axios.get(`/users/${userId}/activities`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      setData(prev => ({
        ...prev,
        items: response?.data || [],
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
  }, [userId, filters.page, filters.perPage, debouncedQ, filters.type, filters.from, filters.to, filters.asTarget, t]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const handlePagination = (direction) => {
    const newPage = direction === 'prev'
      ? Math.max(1, filters.page - 1)
      : Math.min(data.meta.last_page || 1, filters.page + 1);
    if (newPage !== filters.page) updateFilter('page', newPage);
  };

  const exportCSV = () => {
    const headers = ['id', 'type', 'title', 'subtitle', 'created_at', 'link'];
    const rows = data.items.map(item => {
      const link = buildActivityLink(item) || '';
      return [item.id || '', item.type || '', item.title || '', item.subtitle || '', item.created_at || '', link]
        .map(field => `"${String(field).replaceAll('"','""')}"`);
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activities_p${filters.page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('activity_log', "Journal d'Activité")}</h2>
          <p className="text-gray-500 text-sm">{t('user_actions_history', 'Historique des actions utilisateur')}</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filters.perPage}
            onChange={(e) => updateFilter('perPage', Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            title={t('per_page', 'Par page')}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FontAwesomeIcon icon={faFilter} />
            {t('filters', 'Filtres')}
            {(filters.q || filters.type || filters.from || filters.to || filters.asTarget) && (
              <span className="ml-1 bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full">
                {[filters.q, filters.type, filters.from, filters.to, filters.asTarget && 'asTarget'].filter(Boolean).length}
              </span>
            )}
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FontAwesomeIcon icon={faDownload} />
            {t('export', 'Exporter')}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">{t('filter_activities', 'Filtrer les activités')}</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 underline">
                {t('clear_all', 'Tout effacer')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t('search', 'Rechercher')}</label>
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => updateFilter('q', e.target.value)}
                  placeholder={t('search_placeholder', 'Rechercher dans les activités...')}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t('activity_type', "Type d'activité")}</label>
              <select
                value={filters.type}
                onChange={(e) => updateFilter('type', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">{t('all_types', 'Tous les types')}</option>
                <option value="permission_changed">{t('permission_changed', 'Permissions modifiées')}</option>
                <option value="role_assigned">{t('role_assigned', 'Rôle attribué')}</option>
                <option value="article_created">{t('article_created', 'Article créé')}</option>
                <option value="comment_approved">{t('comment_approved', 'Commentaire approuvé')}</option>
              </select>
            </div>

            {/* From */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t('from_date', 'Date de début')}</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => updateFilter('from', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* To */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t('to_date', 'Date de fin')}</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => updateFilter('to', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* asTarget toggle */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('as_target_label', 'Rôles où je suis la cible')}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateFilter('asTarget', !filters.asTarget)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition
                    ${filters.asTarget ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  aria-pressed={filters.asTarget}
                  aria-label={t('as_target_label', 'Rôles où je suis la cible')}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition
                      ${filters.asTarget ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {filters.asTarget
                    ? t('as_target_on', 'Afficher les rôles qui me sont attribués')
                    : t('as_target_off', 'Afficher les rôles que j’attribue')}
                </span>
              </div>
            </div>
          </div>

          {/* Badges actifs */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {filters.q && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    <FontAwesomeIcon icon={faSearch} className="text-xs" />
                    "{filters.q}"
                    <button onClick={() => updateFilter('q', '')} className="ml-1 hover:text-blue-900">×</button>
                  </span>
                )}
                {filters.type && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                    {t(filters.type, filters.type.replace('_', ' '))}
                    <button onClick={() => updateFilter('type', '')} className="ml-1 hover:text-purple-900">×</button>
                  </span>
                )}
                {filters.from && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    {t('from', 'Du')} {new Date(filters.from).toLocaleDateString('fr-FR')}
                    <button onClick={() => updateFilter('from', '')} className="ml-1 hover:text-green-900">×</button>
                  </span>
                )}
                {filters.to && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                    {t('to', 'Au')} {new Date(filters.to).toLocaleDateString('fr-FR')}
                    <button onClick={() => updateFilter('to', '')} className="ml-1 hover:text-orange-900">×</button>
                  </span>
                )}
                {filters.asTarget && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                    {t('as_target_badge', 'Rôles reçus')}
                    <button onClick={() => updateFilter('asTarget', false)} className="ml-1 hover:text-indigo-900">×</button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200  h-96 overflow-auto">
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
            {data.items.map(activity => {
              const typeConfig = TYPE_MAP[activity.type] || TYPE_MAP.default;
              const link = buildActivityLink(activity);
              return (
                <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 ${typeConfig.colorWrap} p-2 rounded-full mr-3`}>
                      <FontAwesomeIcon icon={typeConfig.icon} className={typeConfig.colorIcon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <AnchorOrLink
                        to={link}
                        className={`text-sm font-medium ${link ? 'text-indigo-700 hover:underline' : 'text-gray-900'} truncate`}
                      >
                        {activity.title || t('user_updated_permissions', 'Permissions mises à jour')}
                      </AnchorOrLink>

                      {activity.subtitle && (
                        <p className="text-sm text-gray-500 mt-1">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">{activity.subtitle}</span>
                        </p>
                      )}

                      {activity.created_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          <FontAwesomeIcon icon={faClock} className="mr-1" />
                          {formatDate(activity.created_at)}
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
