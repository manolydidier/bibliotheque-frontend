import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrashAlt, faSpinner, faCheckCircle, faExclamationCircle,
  faUserTag, faTimes, faCheck, faSearch, faAngleLeft, faAngleRight,
  faCogs, faFilter, faChevronDown, faRotateRight, faXmark
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useSelector } from 'react-redux';

// 🔽 Gestionnaire avancé
import UserRolesManager from './UserRoleForm'; // garde ton chemin

const UserRolesDisplay = () => {
  const { t, i18n } = useTranslation();
  const currentUserId = useSelector((state) => state?.library?.auth?.user?.id);

  // Données & UI
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Messages
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Recherche (debounce)
  const [search, setSearch] = useState('');
  const debounceRef = useRef(null);

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // Filtres appliqués
  const [filters, setFilters] = useState({
    roles: [],            // ['Admin','Editor']
    assignedFrom: '',     // 'YYYY-MM-DD'
    assignedTo: '',       // 'YYYY-MM-DD'
    mineOnly: false,      // true => user_id = currentUserId
    sortBy: 'assigned_at', // 'assigned_at' | 'role' | 'user'
    sortDir: 'desc',       // 'asc' | 'desc'
  });

  // Panneau filtres (état de saisie avant Apply)
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);

  // Suppression
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Abort controller
  const controllerRef = useRef(null);

  // axios instance locale + token
  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('tokenGuard');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const formatDate = useCallback((value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString(i18n.language || undefined);
    } catch {
      return value;
    }
  }, [i18n.language]);

  // Liste des rôles disponibles (dérivée des données renvoyées). Si tu as /roles, tu peux faire un fetch dédié.
  const availableRoles = useMemo(() => {
    const s = new Set();
    userRoles.forEach(ur => ur?.role?.name && s.add(ur.role.name));
    return Array.from(s);
  }, [userRoles]);

  // Nombre de filtres actifs
  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.roles.length) n++;
    if (filters.assignedFrom || filters.assignedTo) n++;
    if (filters.mineOnly) n++;
    if (!(filters.sortBy === 'assigned_at' && filters.sortDir === 'desc')) n++;
    return n;
  }, [filters]);

  // Fetch
  const fetchUserRoles = useCallback(async (page = 1, applied = filters, q = search) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    const params = {
      search: q || undefined,
      per_page: pagination.per_page,
      page,
      roles: applied.roles.length ? applied.roles.join(',') : undefined,
      assigned_from: applied.assignedFrom || undefined,
      assigned_to: applied.assignedTo || undefined,
      mine_only: applied.mineOnly ? 1 : undefined,
      sort_by: applied.sortBy || undefined,
      sort_dir: applied.sortDir || undefined,
    };

    try {
      const res = await axiosInstance.get('/userrole', { params, signal: controller.signal });
      const data = res.data?.data;

      if (data?.data) {
        setUserRoles(data.data);
        setPagination({
          current_page: data.current_page,
          last_page: data.last_page,
          per_page: data.per_page,
          total: data.total,
        });
      } else {
        setUserRoles([]);
        setPagination((p) => ({ ...p, current_page: 1, last_page: 1, total: 0 }));
      }
    } catch (err) {
      if (err?.code !== 'ERR_CANCELED') {
        console.error('Erreur chargement des rôles:', err);
        setError(err.response?.data?.message || t('error_load', 'Failed to load roles.'));
        setUserRoles([]);
        setPagination((p) => ({ ...p, current_page: 1, last_page: 1, total: 0 }));
      }
    } finally {
      setLoading(false);
    }
  }, [axiosInstance, pagination.per_page, t, filters, search]);

  // Initial + recherche (debounce)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUserRoles(1, filters, search);
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [search, filters, fetchUserRoles]);

  // Disparition auto messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Actions
  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    fetchUserRoles(page, filters, search);
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/userrole/${roleToDelete.id}`);
      setUserRoles((prev) => prev.filter((ur) => ur.id !== roleToDelete.id));
      setSuccessMessage(t('success_delete', { role: roleToDelete.role?.name }) || 'Supprimé.');
      setRoleToDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || t('error_delete', 'Failed to delete role.'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Panneau filtres
  const openFilters = () => {
    setDraftFilters(filters);
    setShowFilters(true);
  };
  const closeFilters = () => setShowFilters(false);
  const resetFilters = () => {
    const cleared = { roles: [], assignedFrom: '', assignedTo: '', mineOnly: false, sortBy: 'assigned_at', sortDir: 'desc' };
    setDraftFilters(cleared);
    setFilters(cleared);
    setShowFilters(false);
  };
  const applyFilters = () => {
    setFilters(draftFilters);
    setShowFilters(false);
  };

  // Chips remove
  const removeChip = (type, value) => {
    if (type === 'role') {
      setFilters((f) => ({ ...f, roles: f.roles.filter((r) => r !== value) }));
    } else if (type === 'dateFrom') {
      setFilters((f) => ({ ...f, assignedFrom: '' }));
    } else if (type === 'dateTo') {
      setFilters((f) => ({ ...f, assignedTo: '' }));
    } else if (type === 'mineOnly') {
      setFilters((f) => ({ ...f, mineOnly: false }));
    } else if (type === 'sort') {
      setFilters((f) => ({ ...f, sortBy: 'assigned_at', sortDir: 'desc' }));
    }
  };

  // Skeleton
  const SkeletonRow = () => (
    <tr>
      <td className="px-6 py-4"><div className="h-3 w-40 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-3 w-24 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-3 w-56 bg-gray-100 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-3 w-24 bg-gray-100 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-3 w-32 bg-gray-100 rounded animate-pulse" /></td>
      <td className="px-6 py-4 text-right">
        <div className="inline-flex space-x-2">
          <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </td>
    </tr>
  );

  // --------- RENDER ----------
  if (loading && userRoles.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-500 mr-3" />
        <span>{t('loading_roles') || 'Chargement des rôles...'}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faUserTag} className="text-blue-500 mr-2" />
          <h3 className="font-medium text-gray-800">{t('roles_management') || 'Gestion des rôles'}</h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={openFilters}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            aria-expanded={showFilters}
            aria-controls="filters-panel"
          >
            <FontAwesomeIcon icon={faFilter} className="mr-2" />
            {t('filters') || 'Filtres'}
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => fetchUserRoles(pagination.current_page, filters, search)}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            title={t('refresh') || 'Rafraîchir'}
          >
            <FontAwesomeIcon icon={faRotateRight} />
          </button>

          {/* Bouton "Gérer les rôles" */}
          <button
            onClick={() => setShowManagerModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm transition"
          >
            <FontAwesomeIcon icon={faCogs} />
            {t('manage_roles_advanced', 'Gérer les rôles')}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-green-50 text-green-600 flex items-center justify-between border-b">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
            aria-label={t('close') || 'Fermer'}
          >
            <FontAwesomeIcon icon={faTimes} size="sm" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-600 flex items-center justify-between border-b">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="p-4 border-b bg-gray-50">
        <div className="relative max-w-md">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('search_users_or_roles') || 'Rechercher un utilisateur ou un rôle'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={t('search_users_or_roles') || 'Recherche'}
          />
        </div>
      </div>

      {/* Chips filtres actifs */}
      {(filters.roles.length || filters.assignedFrom || filters.assignedTo || filters.mineOnly ||
        !(filters.sortBy === 'assigned_at' && filters.sortDir === 'desc')) && (
        <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2 border-b bg-white">
          {filters.roles.map((role) => (
            <span key={`role-${role}`} className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800">
              {t('role') || 'Rôle'}: {role}
              <button className="ml-2" onClick={() => removeChip('role', role)} aria-label="remove role">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </span>
          ))}

          {filters.assignedFrom && (
            <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-800">
              {t('from') || 'Du'}: {filters.assignedFrom}
              <button className="ml-2" onClick={() => removeChip('dateFrom')} aria-label="remove date from">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </span>
          )}

          {filters.assignedTo && (
            <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-800">
              {t('to') || 'Au'}: {filters.assignedTo}
              <button className="ml-2" onClick={() => removeChip('dateTo')} aria-label="remove date to">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </span>
          )}

          {filters.mineOnly && (
            <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
              {t('only_my_roles') || 'Mes rôles uniquement'}
              <button className="ml-2" onClick={() => removeChip('mineOnly')} aria-label="remove mineOnly">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </span>
          )}

          {!(filters.sortBy === 'assigned_at' && filters.sortDir === 'desc') && (
            <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-purple-100 text-purple-800">
              {t('sort') || 'Tri'}: {filters.sortBy} {filters.sortDir === 'asc' ? '↑' : '↓'}
              <button className="ml-2" onClick={() => removeChip('sort')} aria-label="remove sort">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Panneau Filtres */}
      {showFilters && (
        <div id="filters-panel" className="p-4 border-b bg-white" role="dialog" aria-modal="true">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Rôles (multi-select simple) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('role') || 'Rôle'}</label>
              <div className="relative">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 border rounded-lg hover:bg-gray-50 flex justify-between items-center"
                  onClick={(e) => {
                    const box = e.currentTarget.nextElementSibling;
                    if (box) box.classList.toggle('hidden');
                  }}
                >
                  <span>{draftFilters.roles.length ? draftFilters.roles.join(', ') : (t('select') || 'Sélectionner')}</span>
                  <FontAwesomeIcon icon={faChevronDown} />
                </button>
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow hidden">
                  <div className="max-h-56 overflow-auto py-2">
                    {availableRoles.length === 0 && (
                      <div className="px-3 py-1 text-sm text-gray-500">{t('no_data') || 'Aucun rôle disponible'}</div>
                    )}
                    {availableRoles.map((role) => {
                      const checked = draftFilters.roles.includes(role);
                      return (
                        <label key={role} className="flex items-center px-3 py-1 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={checked}
                            onChange={(e) => {
                              setDraftFilters((df) => ({
                                ...df,
                                roles: e.target.checked
                                  ? [...df.roles, role]
                                  : df.roles.filter((r) => r !== role),
                              }));
                            }}
                          />
                          <span className="text-sm">{role}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('from') || 'Du'} — {t('assigned_on') || 'Attribué le'}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={draftFilters.assignedFrom}
                onChange={(e) => setDraftFilters((df) => ({ ...df, assignedFrom: e.target.value }))}
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('to') || 'Au'} — {t('assigned_on') || 'Attribué le'}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={draftFilters.assignedTo}
                onChange={(e) => setDraftFilters((df) => ({ ...df, assignedTo: e.target.value }))}
              />
            </div>

            {/* Mes rôles uniquement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('scope') || 'Portée'}</label>
              <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg w-full">
                <input
                  type="checkbox"
                  checked={draftFilters.mineOnly}
                  onChange={(e) => setDraftFilters((df) => ({ ...df, mineOnly: e.target.checked }))}
                />
                <span className="text-sm">{t('only_my_roles') || 'Mes rôles uniquement'}</span>
              </label>
            </div>

            {/* Tri */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sort') || 'Tri'}</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border rounded-lg"
                  value={draftFilters.sortBy}
                  onChange={(e) => setDraftFilters((df) => ({ ...df, sortBy: e.target.value }))}
                >
                  <option value="assigned_at">{t('assigned_on') || 'Attribué le'}</option>
                  <option value="role">{t('role') || 'Rôle'}</option>
                  <option value="user">{t('user') || 'Utilisateur'}</option>
                </select>
                <select
                  className="w-32 px-3 py-2 border rounded-lg"
                  value={draftFilters.sortDir}
                  onChange={(e) => setDraftFilters((df) => ({ ...df, sortDir: e.target.value }))}
                >
                  <option value="asc">ASC</option>
                  <option value="desc">DESC</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button className="px-4 py-2 rounded-lg border hover:bg-gray-50" onClick={resetFilters}>
              {t('reset') || 'Réinitialiser'}
            </button>
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={applyFilters}>
              {t('apply') || 'Appliquer'}
            </button>
            <button className="px-4 py-2 rounded-lg" onClick={closeFilters}>
              {t('close') || 'Fermer'}
            </button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('user') || 'Utilisateur'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('role') || 'Rôle'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('description') || 'Description'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('assigned_on') || 'Attribué le'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('assigned_by') || 'Attribué par'}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && userRoles.length > 0 && (
              <>
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}

            {!loading && userRoles.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-6 text-center text-gray-500">
                  {t('no_roles_found') || 'Aucun rôle trouvé.'}
                </td>
              </tr>
            )}

            {userRoles.map((userRole) => {
              const isCurrentUser = Number(userRole.user_id) === Number(currentUserId);
              return (
                <tr
                  key={userRole.id}
                  className={isCurrentUser ? 'bg-blue-50 border-l-4 border-l-blue-400' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {userRole.user?.username || userRole.user?.email || `#${userRole.user_id}`}
                    </div>
                    {isCurrentUser && (
                      <span className="text-xs text-blue-600 font-semibold">{t('me_indicator') || 'Moi'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {userRole.role?.name || t('unknown', 'Unknown')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{userRole.role?.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(userRole.assigned_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {userRole.assigned_by?.username || userRole.assigned_by?.email || t('system', 'System')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => setRoleToDelete(userRole)}
                      className={`p-1 rounded-full ${
                        isCurrentUser ? 'text-red-700 hover:bg-red-200' : 'text-red-600 hover:bg-red-50'
                      }`}
                      title={t('delete') || 'Supprimer'}
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="flex items-center justify-between p-4 bg-gray-50">
          <div className="text-sm text-gray-600">
            {t('page_info', {
              current: pagination.current_page,
              total: pagination.last_page,
              count: pagination.total,
            }) || `Page ${pagination.current_page}/${pagination.last_page} — ${pagination.total} éléments`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
            {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === pagination.last_page ||
                  (page >= pagination.current_page - 1 && page <= pagination.current_page + 1)
              )
              .map((page, idx, filtered) => {
                const prevPage = filtered[idx - 1];
                if (prevPage && page - prevPage > 1) {
                  return (
                    <React.Fragment key={`ellipsis-${page}`}>
                      <span className="px-3 py-1 text-gray-500">...</span>
                      <button
                        onClick={() => handlePageChange(page)}
                        className="px-3 py-1 border rounded hover:bg-gray-200"
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 border rounded ${
                      page === pagination.current_page ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl w-auto p-8 relative max-w-md">
            <button
              onClick={() => setRoleToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label={t('close') || 'Fermer'}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <div className="text-center bg-red-50 p-6 rounded-md">
              <FontAwesomeIcon icon={faTrashAlt} className="text-red-500 text-5xl mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('confirm_delete') || 'Confirmer la suppression'}</h3>
              <p className="text-gray-600">
                {t('delete_confirmation', {
                  role: roleToDelete.role?.name,
                  user: roleToDelete.user?.username || roleToDelete.user?.email,
                }) || `Supprimer le rôle ${roleToDelete.role?.name} de ${roleToDelete.user?.username || roleToDelete.user?.email} ?`}
              </p>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => setRoleToDelete(null)}
                className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                {t('cancel') || 'Annuler'}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 text-white rounded-lg flex items-center disabled:opacity-70"
              >
                {isDeleting && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
                <FontAwesomeIcon icon={faCheck} className="mr-2" />
                {t('confirm') || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestion avancée */}
      {showManagerModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 pt-10 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="text-lg font-medium text-gray-800">{t('advanced_role_management') || 'Gestion avancée des rôles'}</h3>
              <button
                onClick={() => setShowManagerModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label={t('close') || 'Fermer'}
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-60px)]">
              <UserRolesManager />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRolesDisplay;
