import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faEdit,
  faPlus,
  faTrashAlt,
  faSearch,
  faSpinner,
  faFilter,
  faRotateRight,
  faXmark,
  faDownload,
  faToggleOn,
  faToggleOff,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import RoleModal from './RoleModal';
import Pagination from '../../../../component/pagination/Pagination';
import { useDeleteRole } from './DeleteRoleModal';
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';
import { useSelector } from 'react-redux';

/** -------- Helper PATCH→PUT→POST(_method) -------- */
const patchOrPutOrPostOverride = async (client, url, data) => {
  // 1) PATCH
  try {
    return await client.patch(url, data);
  } catch (e1) {
    if (e1?.response?.status !== 405) throw e1;
  }
  // 2) PUT
  try {
    return await client.put(url, data);
  } catch (e2) {
    if (e2?.response?.status !== 405) throw e2;
  }
  // 3) POST + _method override (Laravel-friendly)
  return await client.post(url, { ...data, _method: 'PATCH' });
};

const RolesTable = () => {
  const { t, i18n } = useTranslation();
  const isRefresh = useSelector(state => state.library.isReredingListeuser);

  // Données
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Recherche & pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });

  // Filtres appliqués
  const [filters, setFilters] = useState({
    status: [],            // ['active','inactive']
    createdFrom: '',       // YYYY-MM-DD
    createdTo: '',         // YYYY-MM-DD
    minUsers: '',          // string pour input
    maxUsers: '',
    sortBy: 'created_at',  // 'created_at' | 'name' | 'users'
    sortDir: 'desc',       // 'asc' | 'desc'
    perPage: 10,
  });

  // UI filtres
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);

  // Modale création/édition
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // Pending toggle (par id)
  const [pendingToggle, setPendingToggle] = useState({}); // { [roleId]: true }

  // Abort + debounce
  const controllerRef = useRef(null);
  const debounceRef = useRef(null);

  // axios instance locale
  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      timeout: 20000,
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

  // Fetch
  const fetchRoles = useCallback(async (page = 1, search = searchTerm, applied = filters) => {
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setLoading(true);
    setErrorMsg('');

    const params = {
      page,
      search: search || undefined,
      status: applied.status.length ? applied.status.join(',') : undefined,
      created_from: applied.createdFrom || undefined,
      created_to: applied.createdTo || undefined,
      min_users: applied.minUsers || undefined,
      max_users: applied.maxUsers || undefined,
      sort_by: applied.sortBy || undefined,
      sort_dir: applied.sortDir || undefined,
      per_page: applied.perPage || 10,
    };

    try {
      const { data } = await axiosInstance.get('/roles', { params, signal: ctrl.signal });

      const list = data?.data ?? data?.data?.data ?? data?.roles ?? [];
      const current_page = data?.current_page ?? data?.data?.current_page ?? 1;
      const last_page = data?.last_page ?? data?.data?.last_page ?? 1;
      const total = data?.total ?? data?.data?.total ?? list.length;
      const per_page = data?.per_page ?? data?.data?.per_page ?? applied.perPage ?? 10;

      setRoles(list || []);
      setPagination({ current_page, last_page, total, per_page });
    } catch (err) {
      if (err?.code !== 'ERR_CANCELED') {
        console.error('Erreur chargement rôles:', err);
        setRoles([]);
        setPagination((p) => ({ ...p, current_page: 1, last_page: 1, total: 0 }));
        setErrorMsg(t('error_loading_roles') || 'Erreur lors du chargement des rôles.');
      }
    } finally {
      setLoading(false);
    }
  }, [axiosInstance, filters, searchTerm, t]);

  // Debounce recherche + refresh
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRoles(currentPage, searchTerm, filters);
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [currentPage, searchTerm, filters, isRefresh, fetchRoles]);

  // Messages éphémères
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Search input
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Pagination
  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    setCurrentPage(page);
  };

  // Modales
  const handleCreate = () => { setSelectedRole(null); setShowModal(true); };
  const handleEdit = (role) => { setSelectedRole(role); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); setSelectedRole(null); };

  // Si tu utilises encore onSave (sinon tu peux supprimer ce callback)
  const handleSave = (updated) => {
    if (selectedRole) {
      setRoles(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      setSuccessMsg(t('updated_success') || 'Rôle mis à jour.');
    } else {
      setRoles(prev => [updated, ...prev]);
      setSuccessMsg(t('created_success') || 'Rôle créé.');
    }
    handleCloseModal();
  };

  // Suppression
  const { openDeleteModal, DeleteModal } = useDeleteRole((deletedRoleId) => {
    setRoles(prev => prev.filter(r => r.id !== deletedRoleId));
    if (roles.length === 1 && currentPage > 1) setCurrentPage(p => p - 1);
    setSuccessMsg(t('deleted_success') || 'Rôle supprimé.');
  });
  const handleDeleteClick = (role) => openDeleteModal(role);

  // -------- Toggle actif avec fallback PATCH→PUT→POST(_method) --------
  const toggleActive = async (role) => {
    if (pendingToggle[role.id]) return; // eviter double-clic
    const prev = role.is_active;

    // Optimiste + lock btn
    setPendingToggle((m) => ({ ...m, [role.id]: true }));
    setRoles(prevList => prevList.map(r => (r.id === role.id ? { ...r, is_active: !prev } : r)));

    try {
      await patchOrPutOrPostOverride(axiosInstance, `/roles/${role.id}`, { is_active: !prev });
      setSuccessMsg(!prev ? (t('activated') || 'Activé') : (t('deactivated') || 'Désactivé'));
    } catch (err) {
      // rollback
      setRoles(prevList => prevList.map(r => (r.id === role.id ? { ...r, is_active: prev } : r)));
      console.error('Toggle failed:', err);
      const msg = (err?.response?.status === 405)
        ? (t('method_not_allowed_hint') || 'Méthode non autorisée par l’API. Essayez PUT ou POST avec _method côté serveur.')
        : (t('update_failed') || 'Mise à jour du statut échouée.');
      setErrorMsg(msg);
    } finally {
      setPendingToggle((m) => {
        const n = { ...m };
        delete n[role.id];
        return n;
      });
    }
  };

  // Filtres UI
  const openFilters = () => { setDraftFilters(filters); setShowFilters(true); };
  const closeFilters = () => setShowFilters(false);
  const applyFilters = () => {
    const clean = { ...draftFilters, perPage: Number(draftFilters.perPage) || 10 };
    setFilters(clean);
    setCurrentPage(1);
    setShowFilters(false);
  };
  const resetFilters = () => {
    const cleared = {
      status: [], createdFrom: '', createdTo: '', minUsers: '', maxUsers: '',
      sortBy: 'created_at', sortDir: 'desc', perPage: 10
    };
    setDraftFilters(cleared);
    setFilters(cleared);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const removeChip = (type, value) => {
    if (type === 'status') {
      setFilters(f => ({ ...f, status: f.status.filter(s => s !== value) }));
    } else if (type === 'dateFrom') {
      setFilters(f => ({ ...f, createdFrom: '' }));
    } else if (type === 'dateTo') {
      setFilters(f => ({ ...f, createdTo: '' }));
    } else if (type === 'minUsers') {
      setFilters(f => ({ ...f, minUsers: '' }));
    } else if (type === 'maxUsers') {
      setFilters(f => ({ ...f, maxUsers: '' }));
    } else if (type === 'sort') {
      setFilters(f => ({ ...f, sortBy: 'created_at', sortDir: 'desc' }));
    } else if (type === 'perPage') {
      setFilters(f => ({ ...f, perPage: 10 }));
    }
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.status.length) n++;
    if (filters.createdFrom || filters.createdTo) n++;
    if (filters.minUsers || filters.maxUsers) n++;
    if (!(filters.sortBy === 'created_at' && filters.sortDir === 'desc')) n++;
    if (filters.perPage !== 10) n++;
    return n;
  }, [filters]);

  // Export CSV des rôles affichés
  const exportCSV = () => {
    if (!roles.length) return;
    const headers = ['id', 'name', 'description', 'users', 'created_at', 'is_active'];
    const rows = roles.map(r => [
      r.id,
      `"${(r.name ?? '').replace(/"/g, '""')}"`,
      `"${(r.description ?? '').replace(/"/g, '""')}"`,
      r.users ?? 0,
      r.created_at ?? '',
      r.is_active ? 'active' : 'inactive',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roles_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Skeleton
  const SkeletonRow = () => (
    <tr>
      <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-64 bg-gray-100 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-100 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-100 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" /></td>
      <td className="px-6 py-4 text-right">
        <div className="inline-flex space-x-2">
          <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </td>
    </tr>
  );

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t('roles_management') || 'Gestion des rôles'}</h2>
            <p className="text-gray-500 text-sm">{t('create_manage_roles') || 'Créer et gérer les rôles'}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setDraftFilters(filters); setShowFilters(true); }}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors flex items-center"
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
              onClick={() => fetchRoles(currentPage, searchTerm, filters)}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              title={t('refresh') || 'Rafraîchir'}
            >
              <FontAwesomeIcon icon={faRotateRight} />
            </button>

            <button
              onClick={exportCSV}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              title={t('export') || 'Exporter'}
              disabled={!roles.length}
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              {t('export') || 'Exporter'}
            </button>

            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              {t('new_role') || 'Nouveau rôle'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded">{successMsg}</div>
        )}
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{errorMsg}</div>
        )}

        {/* Barre de recherche */}
        <div className="flex justify-end">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder={t('search_by_name') || 'Rechercher par nom'}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('role_name') || 'Nom du rôle'}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('description') || 'Description'}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('users') || 'Utilisateurs'}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('creation_date') || 'Date de création'}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status') || 'Statut'}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions') || 'Actions'}</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {loading && roles.length === 0 && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}

                {!loading && roles.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="mb-3">{t('no_roles_found') || 'Aucun rôle trouvé.'}</div>
                      <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        {t('new_role') || 'Nouveau rôle'}
                      </button>
                    </td>
                  </tr>
                )}

                {roles.map((role) => {
                  const isToggling = !!pendingToggle[role.id];
                  return (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <FontAwesomeIcon icon={faCrown} className="text-blue-600 text-sm" />
                          </div>
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {role.description || '—'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {role.users ?? 0} {t('users') || 'utilisateurs'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(role.created_at)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleActive(role)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            role.is_active
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          } ${isToggling ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title={role.is_active ? (t('click_to_deactivate') || 'Cliquer pour désactiver') : (t('click_to_activate') || 'Cliquer pour activer')}
                        >
                          {isToggling ? (
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                          ) : (
                            <FontAwesomeIcon icon={role.is_active ? faToggleOn : faToggleOff} />
                          )}
                          {role.is_active ? (t('active') || 'Actif') : (t('inactive') || 'Inactif')}
                        </button>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(role)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                            title={t('edit') || 'Modifier'}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(role)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title={t('delete') || 'Supprimer'}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {loading && roles.length > 0 && <SkeletonRow />}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.last_page > 1 && (
            <div className="border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.last_page}
                onPageChange={handlePageChange}
              />
              <div className="px-6 py-3 text-sm text-gray-500">
                {t('page_info', {
                  current: pagination.current_page,
                  total: pagination.last_page,
                  count: pagination.total,
                }) || `Page ${pagination.current_page}/${pagination.last_page} — ${pagination.total} éléments`}
              </div>
            </div>
          )}
        </div>

        {/* Modales */}
        <RoleModal
          show={showModal}
          onClose={handleCloseModal}
          initialData={selectedRole}
          onSave={handleSave}
        />
        <DeleteModal />
      </div>
    </ErrorBoundary>
  );
};

export default RolesTable;
