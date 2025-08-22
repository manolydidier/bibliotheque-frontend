import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../../../../component/pagination/Pagination';
import {
  faEdit, faCog, faTrashAlt,
  faSearch, faPlus, faSpinner, faRotateRight, faFilter, faChevronDown, faXmark
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';
import { useDeleteUser } from './DeleteUserModal';
import DeactivateUserModal from './DeactivateUserModal';
import EditRoleModal from './EditRoleModal';
import UserRoleModal from './UserRoleModal';
import useDeleteUserRole from './useDeleteUserRole';
import { useSelector } from 'react-redux';

const UsersTable = () => {
  const isRefresh = useSelector(state => state.library.isReredingListeuser);
  const { t, i18n } = useTranslation();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  // Recherche & pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtres (appliqués)
  const [filters, setFilters] = useState({
    roles: [],                // ex: ['Admin','User']
    status: [],               // ex: ['active','inactive']
    lastActiveFrom: '',       // 'YYYY-MM-DD'
    lastActiveTo: '',         // 'YYYY-MM-DD'
    sortBy: 'last_activity',  // 'last_activity' | 'name'
    sortDir: 'desc',          // 'asc' | 'desc'
  });

  // Panneau de filtres (draft avant Apply)
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);

  // Modales: user (edit/deactivate/delete)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // UserRoles section
  const [userRoles, setUserRoles] = useState([]);
  const [userRolesLoading, setUserRolesLoading] = useState(false);
  const [showUserRoleModal, setShowUserRoleModal] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);

  const { openDeleteModal, DeleteModal } = useDeleteUser((userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (users.length === 1 && currentPage > 1) setCurrentPage(p => p - 1);
  });

  const {
    openDeleteModal: openDeleteUserRoleModal,
    DeleteModal: DeleteUserRoleModal
  } = useDeleteUserRole((deletedId) => {
    setUserRoles(prev => prev.filter(ur => ur.id !== deletedId));
  });

  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;
  const placeholderAvatar = 'https://www.w3schools.com/howto/img_avatar2.png';

  // Abort controller pour annuler les requêtes en cours
  const controllerRef = useRef(null);

  // Instance axios locale
  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
    });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, []);

  useEffect(() => {
    return () => {
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  const formatDateTime = useCallback((value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString(i18n.language || undefined);
    } catch {
      return value;
    }
  }, [i18n.language]);

  const fetchUsers = useCallback(async (page = 1, search = '', appliedFilters = filters) => {
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setErrorMsg('');

    // Map des filtres -> params d’API (ajuste selon ton backend)
    const params = {
      page,
      search: search || undefined,
      roles: appliedFilters.roles.length ? appliedFilters.roles.join(',') : undefined,
      status: appliedFilters.status.length ? appliedFilters.status.join(',') : undefined, // 'active,inactive'
      last_active_from: appliedFilters.lastActiveFrom || undefined,
      last_active_to: appliedFilters.lastActiveTo || undefined,
      sort_by: appliedFilters.sortBy || undefined,
      sort_dir: appliedFilters.sortDir || undefined,
    };

    try {
      const { data } = await axiosInstance.get('users', { params, signal: controller.signal });
      setUsers(data.users || []);
      setPagination(data.pagination || { current_page: 1, last_page: 1, total: 0 });
    } catch (err) {
      if (err?.code !== 'ERR_CANCELED') {
        console.error('Error fetching users:', err);
        setUsers([]);
        setPagination({ current_page: 1, last_page: 1, total: 0 });
        setErrorMsg(t('error_loading_users') || 'Une erreur est survenue lors du chargement des utilisateurs.');
      }
    } finally {
      setLoading(false);
    }
  }, [axiosInstance, t, filters]);

  // Débounce pour la recherche
  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(currentPage, searchTerm, filters);
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [currentPage, searchTerm, isRefresh, filters, fetchUsers]);

  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => setCurrentPage(page), []);

  const handleEditClick = useCallback((user) => {
    setSelectedUser(user);
    setShowEditRoleModal(true);
  }, []);

  const handleDeactivateClick = useCallback((user) => {
    setSelectedUser(user);
    setShowDeactivateModal(true);
  }, []);

  const handleDeleteClick = useCallback((user) => openDeleteModal(user), [openDeleteModal]);

  const closeModals = useCallback(() => {
    setShowDeactivateModal(false);
    setShowEditRoleModal(false);
    setSelectedUser(null);
  }, []);

  const handleRoleUpdated = useCallback((updatedUser) => {
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    closeModals();
  }, [closeModals]);

  const handleUserDeactivated = useCallback((deactivatedUser) => {
    setUsers(prev => prev.map(u => (u.id === deactivatedUser.id ? deactivatedUser : u)));
    closeModals();
  }, [closeModals]);

  // Charger les rôles d’un utilisateur
  const loadUserRoles = useCallback(async (user) => {
    setSelectedUserForRoles(user);
    setUserRoles([]);
    setUserRolesLoading(true);
    try {
      const { data } = await axiosInstance.get(`users/${user.id}/roles`, {
        signal: (controllerRef.current = new AbortController()).signal
      });
      setUserRoles(data.roles || []);
    } catch (err) {
      if (err?.code !== 'ERR_CANCELED') {
        console.error('Error fetching user roles:', err);
        setUserRoles([]);
      }
    } finally {
      setUserRolesLoading(false);
    }
  }, [axiosInstance]);

  // Rôles disponibles (dérivés des données actuelles). Tu peux remplacer par un fetch dédié `GET /roles`.
  const availableRoles = useMemo(() => {
    const set = new Set();
    users.forEach(u => u?.role && set.add(u.role));
    return Array.from(set);
  }, [users]);

  const isActive = (user) => {
    if (typeof user.isActive === 'boolean') return user.isActive;
    return (user.status || '').toLowerCase() === 'actif';
  };

  // ------ UI FILTRES (panneau façon MUI) ------
  const openFilters = () => {
    setDraftFilters(filters);
    setShowFilters(true);
  };
  const closeFilters = () => setShowFilters(false);
  const applyFilters = () => {
    setFilters(draftFilters);
    setCurrentPage(1);
    setShowFilters(false);
  };
  const resetFilters = () => {
    const cleared = { roles: [], status: [], lastActiveFrom: '', lastActiveTo: '', sortBy: 'last_activity', sortDir: 'desc' };
    setDraftFilters(cleared);
    setFilters(cleared);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const removeChip = (type, value) => {
    if (type === 'role') {
      const next = { ...filters, roles: filters.roles.filter(r => r !== value) };
      setFilters(next); setCurrentPage(1);
    } else if (type === 'status') {
      const next = { ...filters, status: filters.status.filter(s => s !== value) };
      setFilters(next); setCurrentPage(1);
    } else if (type === 'dateFrom') {
      const next = { ...filters, lastActiveFrom: '' };
      setFilters(next); setCurrentPage(1);
    } else if (type === 'dateTo') {
      const next = { ...filters, lastActiveTo: '' };
      setFilters(next); setCurrentPage(1);
    } else if (type === 'sort') {
      const next = { ...filters, sortBy: 'last_activity', sortDir: 'desc' };
      setFilters(next); setCurrentPage(1);
    }
  };

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.roles.length) n += 1;
    if (filters.status.length) n += 1;
    if (filters.lastActiveFrom || filters.lastActiveTo) n += 1;
    if (!(filters.sortBy === 'last_activity' && filters.sortDir === 'desc')) n += 1;
    return n;
  }, [filters]);

  return (
    <ErrorBoundary>
      <div className="p-6">
        {/* Header / actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t('user_list')}</h2>
            <p className="text-gray-500 text-sm">{t('manage_user_accounts')}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder={t('search_user')}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                value={searchTerm}
                onChange={handleSearch}
                aria-label={t('search_user')}
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-400" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                onClick={openFilters}
                aria-expanded={showFilters}
                aria-controls="filters-panel"
              >
                <FontAwesomeIcon icon={faFilter} className="mr-2" />
                {t('filters') || 'Filtres'}
                {activeFiltersCount > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">{activeFiltersCount}</span>
                )}
              </button>

              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center whitespace-nowrap"
                aria-label={t('new_user')}
                onClick={() => console.log('Open create user modal')}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                {t('new_user')}
              </button>

              <button
                type="button"
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                aria-label={t('refresh') || 'Rafraîchir'}
                onClick={() => fetchUsers(currentPage, searchTerm, filters)}
                title={t('refresh') || 'Rafraîchir'}
              >
                <FontAwesomeIcon icon={faRotateRight} />
              </button>
            </div>
          </div>
        </div>

        {/* Chips de filtres actifs */}
        {(filters.roles.length || filters.status.length || filters.lastActiveFrom || filters.lastActiveTo ||
          !(filters.sortBy === 'last_activity' && filters.sortDir === 'desc')) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.roles.map(role => (
              <span key={`role-${role}`} className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                {t('role') || 'Rôle'}: {role}
                <button className="ml-2" onClick={() => removeChip('role', role)} aria-label="Remove role filter">
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </span>
            ))}
            {filters.status.map(st => (
              <span key={`status-${st}`} className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-green-100 text-green-800">
                {t('status') || 'Statut'}: {st === 'active' ? (t('active') || 'Actif') : (t('inactive') || 'Inactif')}
                <button className="ml-2" onClick={() => removeChip('status', st)} aria-label="Remove status filter">
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </span>
            ))}
            {filters.lastActiveFrom && (
              <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                {t('from') || 'Du'}: {filters.lastActiveFrom}
                <button className="ml-2" onClick={() => removeChip('dateFrom')} aria-label="Remove date from">
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </span>
            )}
            {filters.lastActiveTo && (
              <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                {t('to') || 'Au'}: {filters.lastActiveTo}
                <button className="ml-2" onClick={() => removeChip('dateTo')} aria-label="Remove date to">
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </span>
            )}
            {!(filters.sortBy === 'last_activity' && filters.sortDir === 'desc') && (
              <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                {t('sort') || 'Tri'}: {filters.sortBy} {filters.sortDir === 'asc' ? '↑' : '↓'}
                <button className="ml-2" onClick={() => removeChip('sort')} aria-label="Remove sort">
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Panneau de filtres */}
        {showFilters && (
          <div
            id="filters-panel"
            className="mb-6 w-full bg-white rounded-xl shadow border border-gray-200 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Rôles (multi-select) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('role') || 'Rôle'}</label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 border rounded-lg hover:bg-gray-50 flex justify-between items-center"
                    onClick={(e) => {
                      // simple toggle dropdown via data-attr
                      const box = e.currentTarget.nextElementSibling;
                      if (box) box.classList.toggle('hidden');
                    }}
                  >
                    <span>
                      {draftFilters.roles.length ? draftFilters.roles.join(', ') : (t('select') || 'Sélectionner')}
                    </span>
                    <FontAwesomeIcon icon={faChevronDown} />
                  </button>
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow hidden">
                    <div className="max-h-56 overflow-auto py-2">
                      {availableRoles.length === 0 && (
                        <div className="px-3 py-1 text-sm text-gray-500">{t('no_data') || 'Aucun rôle disponible'}</div>
                      )}
                      {availableRoles.map(role => {
                        const checked = draftFilters.roles.includes(role);
                        return (
                          <label key={role} className="flex items-center px-3 py-1 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={checked}
                              onChange={(e) => {
                                setDraftFilters(df => ({
                                  ...df,
                                  roles: e.target.checked
                                    ? [...df.roles, role]
                                    : df.roles.filter(r => r !== role)
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

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('status') || 'Statut'}</label>
                <div className="flex items-center gap-4 border rounded-lg px-3 py-2">
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={draftFilters.status.includes('active')}
                      onChange={(e) => {
                        setDraftFilters(df => ({
                          ...df,
                          status: e.target.checked
                            ? Array.from(new Set([...df.status, 'active']))
                            : df.status.filter(s => s !== 'active')
                        }));
                      }}
                    />
                    {t('active') || 'Actif'}
                  </label>
                  <label className="inline-flex items-center text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={draftFilters.status.includes('inactive')}
                      onChange={(e) => {
                        setDraftFilters(df => ({
                          ...df,
                          status: e.target.checked
                            ? Array.from(new Set([...df.status, 'inactive']))
                            : df.status.filter(s => s !== 'inactive')
                        }));
                      }}
                    />
                    {t('inactive') || 'Inactif'}
                  </label>
                </div>
              </div>

              {/* Date from */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('from') || 'Du'} — {t('last_activity') || 'Dernière activité'}
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={draftFilters.lastActiveFrom}
                  onChange={(e) => setDraftFilters(df => ({ ...df, lastActiveFrom: e.target.value }))}
                />
              </div>

              {/* Date to */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('to') || 'Au'} — {t('last_activity') || 'Dernière activité'}
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={draftFilters.lastActiveTo}
                  onChange={(e) => setDraftFilters(df => ({ ...df, lastActiveTo: e.target.value }))}
                />
              </div>

              {/* Tri */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sort') || 'Tri'}</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-3 py-2 border rounded-lg"
                    value={draftFilters.sortBy}
                    onChange={(e) => setDraftFilters(df => ({ ...df, sortBy: e.target.value }))}
                  >
                    <option value="last_activity">{t('last_activity') || 'Dernière activité'}</option>
                    <option value="name">{t('user') || 'Utilisateur'}</option>
                  </select>
                  <select
                    className="w-32 px-3 py-2 border rounded-lg"
                    value={draftFilters.sortDir}
                    onChange={(e) => setDraftFilters(df => ({ ...df, sortDir: e.target.value }))}
                  >
                    <option value="asc">ASC</option>
                    <option value="desc">DESC</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                onClick={resetFilters}
              >
                {t('reset') || 'Réinitialiser'}
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={applyFilters}
              >
                {t('apply') || 'Appliquer'}
              </button>
            </div>
          </div>
        )}

        {/* Erreur */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
              onClick={() => fetchUsers(currentPage, searchTerm, filters)}
            >
              {t('retry') || 'Réessayer'}
            </button>
          </div>
        )}

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('last_activity')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {loading && users.length === 0 && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}

                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500">
                      {t('no_users_found')}
                    </td>
                  </tr>
                )}

                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={
                              user.avatar_url
                                ? `${API_BASE_STORAGE}/storage/${user.avatar_url}`
                                : placeholderAvatar
                            }
                            onError={(e) => { e.currentTarget.src = placeholderAvatar; }}
                            alt={user?.name ? `${user.name} avatar` : 'Avatar'}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        onClick={() => loadUserRoles(user)}
                        aria-label={t('roles_for_user', { name: user.name })}
                        title={t('roles_for_user', { name: user.name })}
                      >
                        {user.role}
                      </button>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isActive(user) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isActive(user) ? (t('active') || 'Actif') : (t('inactive') || 'Inactif')}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(user.last_activity)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="relative group/action">
                          <button
                            className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition-colors duration-200"
                            onClick={() => handleEditClick(user)}
                            aria-label={t('edit_user')}
                            title={t('edit_user')}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                        </div>

                        <div className="relative group/action">
                          <button
                            className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-50 transition-colors duration-200"
                            onClick={() => handleDeactivateClick(user)}
                            aria-label={t('user_settings')}
                            title={t('user_settings')}
                          >
                            <FontAwesomeIcon icon={faCog} />
                          </button>
                        </div>

                        <div className="relative group/action">
                          <button
                            className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                            onClick={() => handleDeleteClick(user)}
                            aria-label={t('delete_user')}
                            title={t('delete_user')}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}

                {loading && users.length > 0 && <SkeletonRow />}
              </tbody>
            </table>
          </div>

          {!loading && pagination.last_page > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.last_page}
              onPageChange={handlePageChange}
            />
          )}
        </div>

        {/* Bloc rôles de l’utilisateur sélectionné */}
        {selectedUserForRoles && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">
                {t('roles_for_user', { name: selectedUserForRoles.name })}
              </h3>
              <button
                onClick={() => setShowUserRoleModal(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center hover:bg-blue-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1" />
                {t('assign_role')}
              </button>
            </div>

            {userRolesLoading ? (
              <div className="p-8 text-center text-gray-600">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                {t('loading')}...
              </div>
            ) : userRoles.length === 0 ? (
              <div className="p-6 text-gray-500">{t('no_users_found') || 'Aucun rôle assigné.'}</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('role')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('assigned_at')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{role.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(role.pivot?.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="relative group/action">
                          <button
                            onClick={() => openDeleteUserRoleModal(role)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                            aria-label={t('delete_role')}
                            title={t('delete_role')}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Modales */}
        <DeleteModal />
        <DeleteUserRoleModal />
        <UserRoleModal
          show={showUserRoleModal}
          onClose={() => setShowUserRoleModal(false)}
          onSave={(newUserRole) => {
            setUserRoles(prev => [...prev, newUserRole]);
            setShowUserRoleModal(false);
          }}
          userId={selectedUserForRoles?.id}
        />

        {showDeactivateModal && selectedUser && (
          <DeactivateUserModal
            user={selectedUser}
            isOpen={showDeactivateModal}
            onClose={closeModals}
            onUserDeactivated={handleUserDeactivated}
            onFresh={() => fetchUsers(currentPage, searchTerm, filters)}
          />
        )}

        {showEditRoleModal && selectedUser && (
          <EditRoleModal
            user={selectedUser}
            isOpen={showEditRoleModal}
            onClose={closeModals}
            onRoleUpdated={handleRoleUpdated}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

// Skeleton row (simple)
const SkeletonRow = () => (
  <tr>
    <td className="px-6 py-4">
      <div className="flex items-center">
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="ml-4">
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-44 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" /></td>
    <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" /></td>
    <td className="px-6 py-4"><div className="h-3 w-28 bg-gray-100 rounded animate-pulse" /></td>
    <td className="px-6 py-4 text-right">
      <div className="inline-flex space-x-2">
        <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
      </div>
    </td>
  </tr>
);

export default UsersTable;
