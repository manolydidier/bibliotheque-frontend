// components/permissions/MyLibraryPermissionsDisplay.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle, faTimesCircle, faUser, faSpinner, faStar,
  faCode, faDatabase, faEdit, faTrash, faEye, faPlus,
  faSearch, faDownload
} from '@fortawesome/free-solid-svg-icons';

const DEFAULT_ACTIONS = ['create','read','update','delete'];

const ACTION_ICONS = {
  create: faPlus,
  read:   faEye,
  update: faEdit,
  delete: faTrash,
  code:   faCode,
  database: faDatabase,
};

// Niveaux d'accès : dégradés bleus
const LEVEL_COLORS = {
  full:     { badge: 'from-blue-700 to-blue-800', bar: 'from-blue-600 to-blue-700' },   // ≥90%
  advanced: { badge: 'from-blue-600 to-blue-700', bar: 'from-blue-500 to-blue-600' },   // ≥70%
  partial:  { badge: 'from-blue-500 to-blue-600', bar: 'from-blue-400 to-blue-500' },   // ≥40%
  limited:  { badge: 'from-blue-300 to-blue-400', bar: 'from-blue-300 to-blue-400' },   // >0%
  none:     { badge: 'from-gray-200 to-gray-300', bar: 'from-gray-200 to-gray-300' },   // 0
};

// Libellés courts pour actions
const shortActionLabel = (t, key) => ({
  create: t('create_short','Créer'),
  read:   t('read_short','Lire'),
  update: t('update_short','Éditer'),
  delete: t('delete_short','Suppr.'),
  code:   t('code_short','Code'),
  database: t('database_short','DB'),
}[key] || t(key, key));

export default function MyLibraryPermissionsDisplay({
  userId,
  actions = DEFAULT_ACTIONS,
  title,
  apiBase = '',
  tokenKey = 'tokenGuard',
}) {
  const { t } = useTranslation();

  const [state, setState] = useState({
    loading: true,
    error: '',
    roles: [],
    resources: [],
    actions,
    grants: {},   // { [resource]: { [action]: boolean } }
  });
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'grid'

  // Recherche compacte (debounce)
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const endpoint = userId ? `/users/${userId}/effective-permissions` : `/me/effective-permissions`;

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem(tokenKey) || localStorage.getItem('auth_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await axios.get(endpoint, {
        baseURL: apiBase || axios.defaults.baseURL || '',
        headers,
        timeout: 20000,
      });

      setState({
        loading: false,
        error: '',
        roles: data?.roles ?? [],
        resources: data?.resources ?? [],
        actions: Array.isArray(data?.actions) && data.actions.length ? data.actions : actions,
        grants: data?.grants ?? {},
      });
    } catch (e) {
      setState(s => ({
        ...s,
        loading: false,
        error: e?.response?.data?.message || e?.message || t('error_generic', 'Une erreur est survenue.'),
      }));
    }
  }, [apiBase, endpoint, tokenKey, actions, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calcul niveau d'accès par ressource
  const allResources = useMemo(() => {
    const act = state.actions?.length ? state.actions : actions;
    return (state.resources || []).map(resource => {
      const resGrants = state.grants?.[resource] || {};
      const granted = act.reduce((acc, a) => acc + (resGrants[a] ? 1 : 0), 0);
      const total = act.length || 0;
      const percentage = total > 0 ? (granted / total) * 100 : 0;

      let level = 'none';
      if (percentage >= 90) level = 'full';
      else if (percentage >= 70) level = 'advanced';
      else if (percentage >= 40) level = 'partial';
      else if (percentage > 0)  level = 'limited';

      return { resource, grants: resGrants, percentage, level };
    });
  }, [state.resources, state.grants, state.actions, actions]);

  // Filtrage
  const dataView = useMemo(() => {
    if (!debouncedQuery) return allResources;
    return allResources.filter(s => s.resource.toLowerCase().includes(debouncedQuery));
  }, [allResources, debouncedQuery]);

  const rolesLabel = useMemo(() => {
    if (!state.roles?.length) return t('no_roles_short', '—');
    return state.roles.map(r => r.name).join(', ');
  }, [state.roles, t]);

  const levelLabel = (lvl) => ({
    full:     t('full_access_short', 'Complet'),
    advanced: t('advanced_access_short', 'Avancé'),
    partial:  t('partial_access_short', 'Partiel'),
    limited:  t('limited_access_short', 'Limité'),
    none:     t('no_access_short', 'Aucun'),
  }[lvl] || lvl);

  // Export CSV (données filtrées)
  const exportCSV = () => {
    const cols = ['resource', 'level', 'coverage', ...state.actions];
    const esc = (v) => `"${String(v ?? '').replaceAll('"','""')}"`;
    const rows = dataView.map(s => {
      const actionCols = state.actions.map(a => (s.grants?.[a] ? 'allowed' : 'denied'));
      return [s.resource, levelLabel(s.level), `${Math.round(s.percentage)}%`, ...actionCols].map(esc).join(',');
    });
    const csv = [cols.map(esc).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'library_permissions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Carte par ressource (compact)
  const ResourceCard = ({ item }) => {
    const colors = LEVEL_COLORS[item.level];
    return (
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100">
        <div className={`h-1.5 bg-gradient-to-r ${colors.bar}`} />
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-800 leading-6 truncate" title={item.resource}>
              {t(item.resource, item.resource)}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r ${colors.badge} text-white tracking-wide`}>
                {levelLabel(item.level)}
              </span>
              {(item.level === 'full' || item.level === 'advanced' || item.level === 'partial') && (
                <FontAwesomeIcon icon={faStar} className="text-blue-400 text-xs" />
              )}
            </div>
          </div>

          {/* Couverture */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] text-slate-500">{t('coverage_short', 'Couv.')}</span>
              <span className="text-[11px] font-semibold text-slate-700">{Math.round(item.percentage)}%</span>
            </div>
            <div className="w-full bg-slate-200/70 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full bg-gradient-to-r ${colors.bar} transition-[width] duration-500`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>

          {/* Détail des permissions */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-gray-700">{t('perms_short', 'Détails')}</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {state.actions.map((action) => {
                const allowed = !!item.grants[action];
                return (
                  <div
                    key={action}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md text-[12px] ${
                      allowed ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-400'
                    }`}
                    title={t(action, action)}
                  >
                    <FontAwesomeIcon icon={ACTION_ICONS[action] || faCheckCircle} className={allowed ? 'text-blue-500' : 'text-slate-300'} />
                    <span className="font-medium truncate">{shortActionLabel(t, action)}</span>
                    <span className="ml-auto">
                      <FontAwesomeIcon icon={allowed ? faCheckCircle : faTimesCircle} className={allowed ? 'text-blue-500' : 'text-slate-300'} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Vue tableau (entêtes courtes)
  const GridView = () => (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full">
        <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-[12px] font-semibold">
              {t('resource_short', 'Ressource')}
            </th>
            <th className="px-4 py-3 text-center text-[12px] font-semibold">
              {t('level_short', 'Niv.')}
            </th>
            <th className="px-4 py-3 text-center text-[12px] font-semibold">
              {t('coverage_short', 'Couv.')}
            </th>
            {state.actions.map((action) => (
              <th key={action} className="px-3 py-3 text-center text-[11px] font-semibold">
                <div className="flex flex-col items-center gap-0.5">
                  <FontAwesomeIcon icon={ACTION_ICONS[action] || faCheckCircle} className="text-sm" />
                  <span className="text-[10px] leading-3">{shortActionLabel(t, action)}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {dataView.map(item => {
            const colors = LEVEL_COLORS[item.level];
            return (
              <tr key={item.resource} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{t(item.resource, item.resource)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r ${colors.badge} text-white`}>
                    {levelLabel(item.level)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200/70 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full bg-gradient-to-r ${colors.bar}`} style={{ width: `${item.percentage}%` }} />
                    </div>
                    <span className="text-[11px] font-medium text-slate-700">{Math.round(item.percentage)}%</span>
                  </div>
                </td>
                {state.actions.map((action) => {
                  const allowed = !!item.grants[action];
                  return (
                    <td key={`${item.resource}-${action}`} className="px-3 py-3 text-center">
                      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                        allowed ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <FontAwesomeIcon icon={allowed ? faCheckCircle : faTimesCircle} className="text-xs" />
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const avg = useMemo(() => {
    if (!dataView.length) return 0;
    return Math.round(dataView.reduce((a, s) => a + s.percentage, 0) / dataView.length);
  }, [dataView]);

  return (
    <div className="mt-8">
      {/* Header compact */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-t-xl p-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/15 p-2.5 rounded-full">
              <FontAwesomeIcon icon={faUser} className="text-base" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">
                {title || t('my_library_permissions_short', 'Mes permissions')}
              </h2>
              <p className="text-white/90 text-[12px] mt-0.5 truncate">
                {t('roles_short', 'Rôles')}: {rolesLabel}
              </p>
            </div>
          </div>

          {/* Outils compacts */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-white/80 text-xs" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search_resource_short', 'Rech…')}
                className="pl-7 pr-6 py-1.5 rounded-md bg-white/10 text-white placeholder-white/80 border border-white/20 focus:ring-2 focus:ring-white/50 focus:border-white/50 text-sm w-56"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 text-white/80 hover:text-white text-sm"
                  aria-label={t('clear_search','Effacer')}
                >
                  ×
                </button>
              )}
            </div>

            {/* Export */}
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 transition flex items-center gap-1.5 text-sm"
              title={t('export','Exporter')}
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>{t('export_short','CSV')}</span>
            </button>

            {/* Switch de vue */}
            <div className="flex gap-1 bg-white/10 rounded-md p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded text-sm ${
                  viewMode === 'cards' ? 'bg-white text-blue-700 font-semibold' : 'text-white hover:bg-white/10'
                }`}
                aria-pressed={viewMode === 'cards'}
                title={t('cards','Cartes')}
              >
                {t('cards_short','Cartes')}
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded text-sm ${
                  viewMode === 'grid' ? 'bg-white text-blue-700 font-semibold' : 'text-white hover:bg-white/10'
                }`}
                aria-pressed={viewMode === 'grid'}
                title={t('table','Tableau')}
              >
                {t('table_short','Tableau')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="bg-slate-50 rounded-b-xl">
        {state.loading && (
          <div className="p-10 text-center">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-600 mb-2" />
            <p className="text-slate-600 text-sm">{t('loading','Chargement')}…</p>
          </div>
        )}

        {state.error && !state.loading && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <FontAwesomeIcon icon={faTimesCircle} />
              <span className="font-medium">{state.error}</span>
            </div>
          </div>
        )}

        {!state.loading && !state.error && (
          <div className="p-4">
            {/* KPIs compacts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-100">
                <div className="text-lg font-bold text-blue-700">{dataView.length}</div>
                <div className="text-[11px] text-slate-600">{t('resources_short', 'Ressources')}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-100">
                <div className="text-lg font-bold text-blue-700">
                  {dataView.filter(s => s.level === 'full' || s.level === 'advanced').length}
                </div>
                <div className="text-[11px] text-slate-600">{t('high_access_short', 'Accès élevés')}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-100">
                <div className="text-lg font-bold text-blue-700">
                  {dataView.filter(s => s.level === 'partial').length}
                </div>
                <div className="text-[11px] text-slate-600">{t('partial_access_short', 'Accès partiels')}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-100">
                <div className="text-lg font-bold text-blue-700">
                  {dataView.length ? avg : 0}%
                </div>
                <div className="text-[11px] text-slate-600">{t('avg_coverage_short', 'Couv. moy.')}</div>
              </div>
            </div>

            {/* Vue principale */}
            {dataView.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-5xl text-slate-300 mb-2">🔐</div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">
                  {t('no_permissions_to_show_short', 'Aucune permission')}
                </h3>
                <p className="text-slate-500 text-sm">
                  {t('no_permissions_hint_short', 'Ajustez votre recherche.')}
                </p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataView.map(item => <ResourceCard key={item.resource} item={item} />)}
              </div>
            ) : (
              <GridView />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
