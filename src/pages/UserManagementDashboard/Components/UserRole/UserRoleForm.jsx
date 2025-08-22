import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faSyncAlt,
  faSpinner,
  faExclamationCircle,
  faEdit,
  faUser,
  faShieldAlt,
  faCog,
  faTimes,
  faCheck,
  faChevronDown,
  faUndoAlt,
  faUserTag,
  faCheckCircle,
  faSortUp,
  faSortDown,
  faInfoCircle,
  faUsers,
  faKey,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';
import Pagination from '../../../../component/pagination/Pagination';
import { useSelector } from 'react-redux';

const DEBOUNCE_MS = 300;

function useDebouncedValue(value, delay = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const UserRolesManager = () => {
  const { t } = useTranslation();
  const isRefresh = useSelector((state) => state.library.isReredingListeuser);

  // États principaux
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });

  // Sélections attribution rapide
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [assignError, setAssignError] = useState('');
  const [assignOK, setAssignOK] = useState(false);

  // Modales locales
  const [showUserSelectionModal, setShowUserSelectionModal] = useState(false);
  const [showRoleSelectionModal, setShowRoleSelectionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Recherche modales
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleSearchTerm, setRoleSearchTerm] = useState('');

  const API_BASE_STORAGE = import.meta.env.VITE_API_STORAGE_URL;

  // Axios base
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
  }, []);

  const getAvatarSrc = (item) =>
    item?.avatar_url
      ? `${API_BASE_STORAGE}/${item.avatar_url}`
      : 'https://www.w3schools.com/howto/img_avatar2.png';

  // -------- Fetch des données ----------
  const fetchData = useCallback(
    async (opts = { withRoles: true, withUsers: true, resetPage: false }) => {
      const { withRoles, withUsers, resetPage } = opts;
      if (resetPage) {
        setPagination((p) => ({ ...p, current_page: 1 }));
      }
      setLoading(true);
      setError(null);
      try {
        const tasks = [];
        if (withUsers) {
          setTableLoading(true);
          tasks.push(
            axios.get('/users', {
              params: {
                page: resetPage ? 1 : pagination.current_page,
                search: debouncedSearch || '',
              },
            })
          );
        } else {
          tasks.push(Promise.resolve(null));
        }

        if (withRoles) {
          tasks.push(axios.get('/roles'));
        } else {
          tasks.push(Promise.resolve(null));
        }

        const [usersRes, rolesRes] = await Promise.all(tasks);

        if (usersRes) {
          setUsers(usersRes.data?.users || []);
          setPagination(
            usersRes.data?.pagination || {
              current_page: 1,
              last_page: 1,
              total: 0,
              per_page: 10,
            }
          );
        }
        if (rolesRes) {
          setRoles(rolesRes.data?.data || []);
        }
      } catch (err) {
        console.error(err);
        setError(t('failed_to_load_data'));
      } finally {
        setLoading(false);
        setTableLoading(false);
      }
    },
    [pagination.current_page, debouncedSearch, t]
  );

  useEffect(() => {
    fetchData({ withRoles: true, withUsers: true });
  }, [fetchData, isRefresh]);

  useEffect(() => {
    fetchData({ withRoles: false, withUsers: true });
  }, [debouncedSearch, pagination.current_page, fetchData]);

  // Filtrages modales
  const filteredModalUsers = useMemo(() => {
    const base = users || [];
    if (!userSearchTerm) return base;
    const term = userSearchTerm.toLowerCase();
    return base.filter(
      (u) =>
        u?.name?.toLowerCase().includes(term) ||
        u?.email?.toLowerCase().includes(term)
    );
  }, [userSearchTerm, users]);

  const filteredModalRoles = useMemo(() => {
    const base = roles || [];
    if (!roleSearchTerm) return base;
    const term = roleSearchTerm.toLowerCase();
    return base.filter(
      (r) =>
        r?.name?.toLowerCase().includes(term) ||
        r?.description?.toLowerCase().includes(term)
    );
  }, [roleSearchTerm, roles]);

  // Rôles d’un utilisateur (affichage)
  const getUserRoles = (user) => {
    const rolesList = [];
    if (user?.role && user.role !== 'User') rolesList.push(user.role);
    if (user?.roles && Array.isArray(user.roles)) {
      user.roles.forEach((role) => {
        if (role?.name && role.name !== 'User' && !rolesList.includes(role.name)) {
          rolesList.push(role.name);
        }
      });
    }
    if (rolesList.length === 0) rolesList.push('User');
    return rolesList;
  };

  // Attribution simple
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowUserSelectionModal(false);
    setUserSearchTerm('');
    setAssignError('');
    setAssignOK(false);
  };
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleSelectionModal(false);
    setRoleSearchTerm('');
    setAssignError('');
    setAssignOK(false);
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return setAssignError(t('please_select_user'));
    if (!selectedRole) return setAssignError(t('please_select_role'));

    try {
      await axios.post('/userrole/user-roles', {
        user_id: selectedUser.id,
        role_id: selectedRole.id,
      });
      setAssignError('');
      setAssignOK(true);
      setSelectedUser(null);
      setSelectedRole(null);
      await fetchData({ withRoles: false, withUsers: true });
      setTimeout(() => setAssignOK(false), 2000);
    } catch (err) {
      console.error(err);
      setAssignError(t('failed_to_assign_role'));
      setAssignOK(false);
    }
  };

  // -------- Modale d’édition intégrée (pas de hook) ----------
  const EditRoleModal = ({ user, isOpen, onClose, onRoleUpdated }) => {
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [modError, setModError] = useState('');
    const [availableRoles, setAvailableRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [selectedRoleDetails, setSelectedRoleDetails] = useState(null);
    const [term, setTerm] = useState('');
    const [sortField, setSortField] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [filters, setFilters] = useState({ onlyAdmin: false, withPermissions: false });
    const [pager, setPager] = useState({ page: 1, perPage: 10, total: 0 });

    // Fetch + filter côté client
    const fetchAvailableRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await axios.get('/roles');
        let list = response.data?.data || [];

        // filtre search
        if (term) {
          const q = term.toLowerCase();
          list = list.filter(
            (r) =>
              r.name.toLowerCase().includes(q) ||
              (r.description && r.description.toLowerCase().includes(q))
          );
        }
        // filtres
        if (filters.onlyAdmin) list = list.filter((r) => r.is_admin === true);
        if (filters.withPermissions) list = list.filter((r) => (r.permissions || []).length > 0);

        // tri
        list.sort((a, b) => {
          if (sortField === 'name') {
            return sortDirection === 'asc'
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name);
          } else if (sortField === 'users_count') {
            return sortDirection === 'asc'
              ? (a.users_count || 0) - (b.users_count || 0)
              : (b.users_count || 0) - (a.users_count || 0);
          }
          return 0;
        });

        setAvailableRoles(list);
        setPager((p) => ({ ...p, total: list.length }));

        // rôle courant sélectionné
        if (user) {
          const current = list.find((r) => r.id === (user.role_id || user.role?.id));
          if (current) {
            setSelectedRoleId(current.id);
            setSelectedRoleDetails(current);
          } else if (user.role && typeof user.role === 'string') {
            // rien à faire, affichage générique
          }
        }
      } catch (e) {
        console.error(e);
        setModError(t('error_fetching_roles'));
        setAvailableRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };

    useEffect(() => {
      if (isOpen && user) {
        setTerm('');
        setModError('');
        setSelectedRoleId(user.role_id || user.role || '');
        setPager((p) => ({ ...p, page: 1 }));
        fetchAvailableRoles();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, user]);

    useEffect(() => {
      if (isOpen) {
        setPager((p) => ({ ...p, page: 1 }));
        fetchAvailableRoles();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term, filters, sortField, sortDirection]);

    const handleSort = (field) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
      setPager((p) => ({ ...p, page: 1 }));
    };

    const handlePageChange = (newPage) => {
      setPager((p) => ({ ...p, page: newPage }));
    };

    const handleRoleChange = (roleId) => {
      setSelectedRoleId(roleId);
      const role = availableRoles.find((r) => r.id === roleId);
      setSelectedRoleDetails(role || null);
    };

    const getPaginatedRoles = () => {
      const start = (pager.page - 1) * pager.perPage;
      return availableRoles.slice(start, start + pager.perPage);
      };

    const handleUpdateRole = async () => {
      if (!user || !selectedRoleId) return;
      setIsUpdating(true);
      setModError('');
      try {
        // récupérer l’assignation existante
        const userRolesResponse = await axios.get(`/userrole/${user.id}/roles`);
        const hasAssign = userRolesResponse.data?.status && userRolesResponse.data?.data?.roles?.length > 0;

        if (hasAssign) {
          // on prend la 1ère assignation
          const userRole = userRolesResponse.data.data.roles[0];
          const resp = await axios.post(`/users/${userRole.id}/role`, {
            role_id: selectedRoleId,
            user_id: user.id,
          });
          if (!resp.data?.status) throw new Error(resp.data?.message || 'update failed');
        } else {
          // créer une assignation
          const resp = await axios.post('/userrole/user-roles', {
            role_id: selectedRoleId,
            user_id: user.id,
          });
          if (!resp.data?.status) throw new Error(resp.data?.message || 'assign failed');
        }

        // succès -> refresh parent
        await onRoleUpdated?.();
        onClose?.();
      } catch (error) {
        console.error('Error updating role:', error);
        if (error.response?.data?.message) setModError(error.response.data.message);
        else if (error.response?.status === 404) setModError(t('role_assignment_not_found'));
        else if (error.response?.status === 422) setModError(t('user_already_has_role'));
        else setModError(t('error_updating_role'));
      } finally {
        setIsUpdating(false);
      }
    };

    if (!isOpen || !user) return null;

    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faUserTag} className="text-blue-500 text-sm" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">{t('edit_user_role')}</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label={t('close')}
            >
              <FontAwesomeIcon icon={faTimes} className="text-sm" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1">
            <p className="text-gray-600 text-sm mb-5">
              {t('change_role_for_user', { name: user.name })}
            </p>

            {/* User Info */}
            <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-5 border border-gray-100">
              <img
                className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                src={getAvatarSrc(user)}
                alt="Avatar"
                loading="lazy"
              />
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">{t('current_role')}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {user.role?.name || user.role || 'N/A'}
                </span>
              </div>
            </div>

            {/* Search + filters */}
            <div className="mb-3">
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FontAwesomeIcon icon={faSearch} className="text-xs" />
                </div>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={t('search_roles')}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  disabled={isUpdating}
                />
              </div>

              <div className="flex flex-wrap gap-3 mb-3">
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.onlyAdmin}
                    onChange={(e) => setFilters((f) => ({ ...f, onlyAdmin: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">{t('only_admin_roles')}</span>
                </label>
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.withPermissions}
                    onChange={(e) => setFilters((f) => ({ ...f, withPermissions: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">{t('only_with_permissions')}</span>
                </label>
              </div>
            </div>

            {/* List + sort + pagination */}
            <div className="border border-gray-200 rounded-lg bg-white shadow-xs overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <div className="col-span-8 flex items-center">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    {t('role_name')}
                    {sortField === 'name' && (
                      <FontAwesomeIcon
                        icon={sortDirection === 'asc' ? faSortUp : faSortDown}
                        className="ml-1.5 text-gray-400 text-xs"
                      />
                    )}
                  </button>
                </div>
                <div className="col-span-4 flex items-center justify-end">
                  <button
                    onClick={() => handleSort('users_count')}
                    className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    {t('users')}
                    {sortField === 'users_count' && (
                      <FontAwesomeIcon
                        icon={sortDirection === 'asc' ? faSortUp : faSortDown}
                        className="ml-1.5 text-gray-400 text-xs"
                      />
                    )}
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {loadingRoles ? (
                  <div className="flex flex-col items-center justify-center p-6 text-gray-400">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-base mb-2" />
                    <span className="text-xs">{t('loading_roles')}</span>
                  </div>
                ) : availableRoles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-gray-400">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-base mb-2" />
                    <span className="text-xs">{t('no_roles_found')}</span>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {getPaginatedRoles().map((role) => (
                      <li
                        key={role.id}
                        onClick={() => handleRoleChange(role.id)}
                        className={`group cursor-pointer transition-colors duration-100 ${
                          selectedRoleId === role.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-4 px-3 py-2.5">
                          <div className="col-span-8 flex items-center">
                            <div
                              className={`flex items-center justify-center h-7 w-7 rounded-full mr-2.5 flex-shrink-0 ${
                                selectedRoleId === role.id
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                              }`}
                            >
                              <FontAwesomeIcon icon={role.is_admin ? faShieldAlt : faUserTag} className="text-xs" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center">
                                <p
                                  className={`text-sm font-medium truncate ${
                                    selectedRoleId === role.id ? 'text-blue-700' : 'text-gray-700'
                                  }`}
                                >
                                  {role.name}
                                </p>
                                {selectedRoleId === role.id && (
                                  <FontAwesomeIcon icon={faCheckCircle} className="ml-1.5 text-green-500 text-xs" />
                                )}
                              </div>

                              {role.description && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{role.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="col-span-4 flex items-center justify-end space-x-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                role.is_admin ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-700'
                              }`}
                            >
                              <FontAwesomeIcon icon={faUsers} className="mr-1 text-xs" />
                              {role.users_count || 0}
                            </span>
                            {role.is_admin && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                                <FontAwesomeIcon icon={faKey} className="mr-1 text-xs" />
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {availableRoles.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => handlePageChange(pager.page - 1)}
                    disabled={pager.page === 1}
                    className="inline-flex items-center px-2.5 py-1 border border-gray-200 text-xs font-medium rounded text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('previous')}
                  </button>
                  <span className="text-xs text-gray-600">
                    {pager.page} / {Math.ceil(pager.total / pager.perPage)}
                  </span>
                  <button
                    onClick={() => handlePageChange(pager.page + 1)}
                    disabled={pager.page * pager.perPage >= pager.total}
                    className="inline-flex items-center px-2.5 py-1 border border-gray-200 text-xs font-medium rounded text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('next')}
                  </button>
                </div>
              )}
            </div>

            {/* Détails des permissions */}
            {selectedRoleDetails && (
              <div className="bg-gray-50 p-3 rounded-lg mt-4 border border-gray-100">
                <h4 className="flex items-center text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                  <FontAwesomeIcon icon={faShieldAlt} className="text-blue-500 mr-1.5 text-xs" />
                  {t('role_permissions')}
                </h4>
                {(selectedRoleDetails.permissions || []).length > 0 ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {selectedRoleDetails.permissions.map((perm) => (
                      <div key={perm.id} className="flex items-center text-xs text-gray-700">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-1.5 text-xs" />
                        <span className="truncate">{perm.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">{t('no_permissions_for_role')}</p>
                )}
              </div>
            )}

            {modError && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-4">
                <p className="text-xs text-red-600">{modError}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleUpdateRole}
              disabled={isUpdating || !selectedRoleId || selectedRoleId === (user.role_id || user.role)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px]"
            >
              {isUpdating ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1.5 text-xs" />
                  {t('updating')}...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCog} className="mr-1.5 text-xs" />
                  {t('update_role')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------- UX modales utilitaires ----------
  const useModalUX = (isOpen, onClose, inputRef) => {
    useEffect(() => {
      if (!isOpen) return;
      const onKey = (e) => e.key === 'Escape' && onClose();
      document.addEventListener('keydown', onKey);
      if (inputRef?.current) setTimeout(() => inputRef.current?.focus(), 0);
      return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose, inputRef]);
  };

  const userSearchRef = useRef(null);
  const roleSearchRef = useRef(null);

  const UserSelectionModal = () => {
    const isOpen = showUserSelectionModal;
    useModalUX(isOpen, () => {
      setShowUserSelectionModal(false);
      setUserSearchTerm('');
    }, userSearchRef);
    if (!isOpen) return null;
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={() => {
          setShowUserSelectionModal(false);
          setUserSearchTerm('');
        }}
      >
        <div
          className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium">{t('select_user')}</h3>
            <button
              onClick={() => {
                setShowUserSelectionModal(false);
                setUserSearchTerm('');
              }}
              className="text-gray-500"
              aria-label={t('close')}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <div className="p-4 border-b">
            <div className="relative">
              <input
                ref={userSearchRef}
                type="text"
                placeholder={t('search_users')}
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded"
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {tableLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredModalUsers.length > 0 ? (
              filteredModalUsers.map((user) => (
                <button
                  type="button"
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full text-left p-4 hover:bg-gray-50 cursor-pointer flex items-center border-b last:border-b-0"
                >
                  <img
                    src={getAvatarSrc(user)}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover mr-3"
                    loading="lazy"
                  />
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {getUserRoles(user).join(', ') || t('no_roles_assigned')}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                {t('no_users_found')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const RoleSelectionModal = () => {
    const isOpen = showRoleSelectionModal;
    useModalUX(isOpen, () => {
      setShowRoleSelectionModal(false);
      setRoleSearchTerm('');
    }, roleSearchRef);
    if (!isOpen) return null;
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={() => {
          setShowRoleSelectionModal(false);
          setRoleSearchTerm('');
        }}
      >
        <div
          className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium">{t('select_role')}</h3>
            <button
              onClick={() => {
                setShowRoleSelectionModal(false);
                setRoleSearchTerm('');
              }}
              className="text-gray-500"
              aria-label={t('close')}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <div className="p-4 border-b">
            <div className="relative">
              <input
                ref={roleSearchRef}
                type="text"
                placeholder={t('search_roles')}
                value={roleSearchTerm}
                onChange={(e) => setRoleSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded"
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {roles.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {t('no_roles_found')}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredModalRoles.map((role) => (
                  <li
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    role="button"
                  >
                    <div className="flex items-center">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full mr-3 bg-gray-100 text-gray-600">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-xs" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {(role.users_count || 0)} {t('users_with_this_role')}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DeactivateModal = ({ user, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      const onKey = (e) => e.key === 'Escape' && onClose();
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleDeactivate = async () => {
      setIsLoading(true);
      try {
        await axios.put(`/users/${user.id}/deactivate`);
        onClose();
        fetchData({ withRoles: false, withUsers: true });
      } catch (err) {
        alert(t('deactivation_failed'));
      } finally {
        setIsLoading(false);
      }
    };

    if (!user) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">{t('deactivate_user')}</h3>
          </div>
          <div className="p-4">
            <p className="mb-4">
              {t('confirm_deactivate_user')} <strong>{user.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 border rounded text-gray-700">
                {t('cancel')}
              </button>
              <button
                onClick={handleDeactivate}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-70"
              >
                {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -------- Render principal ----------
  return (
    <ErrorBoundary>
      <div className="p-6 max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('user_roles_management')}</h1>
            <p className="text-gray-500">{t('manage_user_roles_description')}</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder={t('search_users')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                aria-label={t('search')}
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setPagination((p) => ({ ...p, current_page: 1 }));
                fetchData({ withRoles: false, withUsers: true, resetPage: true });
              }}
              className="px-4 py-2 bg-white text-gray-700 border rounded-lg hover:bg-gray-50"
              title={t('clear_filters')}
            >
              <FontAwesomeIcon icon={faUndoAlt} />
            </button>
            <button
              onClick={() => fetchData({ withRoles: true, withUsers: true })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              disabled={loading}
              title={t('refresh')}
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
            </button>
          </div>
        </div>

        {/* Attribution rapide */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faUser} /> {t('assign_role')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('user')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUserSelectionModal(true)}
                  className="flex-1 p-2 border rounded text-left hover:bg-gray-50 flex justify-between items-center"
                >
                  {selectedUser ? (
                    <div className="flex items-center">
                      <img
                        src={getAvatarSrc(selectedUser)}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover mr-2"
                      />
                      <span className="truncate">{selectedUser.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">{t('select_user')}</span>
                  )}
                  <FontAwesomeIcon icon={faChevronDown} className="text-gray-400" />
                </button>
                {selectedUser && (
                  <button
                    className="px-2 text-gray-500 hover:text-gray-700"
                    title={t('clear')}
                    onClick={() => setSelectedUser(null)}
                    aria-label={t('clear')}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => selectedUser && setShowRoleSelectionModal(true)}
                  disabled={!selectedUser}
                  className="flex-1 p-2 border rounded text-left hover:bg-gray-50 flex justify-between items-center disabled:bg-gray-50"
                >
                  {selectedRole ? (
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faShieldAlt} className="text-blue-500 mr-2" />
                      <span className="truncate">{selectedRole.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">{t('select_role')}</span>
                  )}
                  <FontAwesomeIcon icon={faChevronDown} className="text-gray-400" />
                </button>
                {selectedRole && (
                  <button
                    className="px-2 text-gray-500 hover:text-gray-700"
                    title={t('clear')}
                    onClick={() => setSelectedRole(null)}
                    aria-label={t('clear')}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAssignRole}
                disabled={!selectedUser || !selectedRole}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faCheck} /> {t('assign_role')}
              </button>
            </div>
          </div>

          {assignError && (
            <div className="text-red-600 text-sm flex items-center gap-2 p-2 bg-red-50 rounded">
              <FontAwesomeIcon icon={faExclamationCircle} /> {assignError}
            </div>
          )}
          {assignOK && (
            <div className="text-green-700 text-sm flex items-center gap-2 p-2 bg-green-50 rounded">
              <FontAwesomeIcon icon={faCheck} /> {t('role_assigned_successfully')}
            </div>
          )}
        </div>

        {/* Liste des utilisateurs */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('roles')}
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
                {tableLoading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={`sk-${idx}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                          <div className="ml-4 space-y-2">
                            <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-12 ml-auto bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => {
                    const userRoles = getUserRoles(user);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={getAvatarSrc(user)}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                              loading="lazy"
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {userRoles.length > 0 ? (
                              userRoles.map((role, index) => (
                                <span
                                  key={`${user.id}-${role}-${index}`}
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    role === 'User' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {role}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">{t('no_roles_assigned')}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              user.status === 'Actif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.status || t('inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_activity || t('never')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title={t('edit_roles')}
                              aria-label={t('edit_roles')}
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeactivateModal(true);
                              }}
                              className="text-gray-600 hover:text-gray-800 p-1"
                              title={user.status === 'Actif' ? t('deactivate') : t('activate')}
                              aria-label={user.status === 'Actif' ? t('deactivate') : t('activate')}
                            >
                              <FontAwesomeIcon icon={faCog} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <FontAwesomeIcon icon={faUser} className="text-2xl text-gray-300" />
                        <p className="text-sm">{t('no_users_found')}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {users.length === 0 && !loading && !tableLoading && (
            <div className="p-8 text-center text-gray-500">
              {t('no_users_found')}
            </div>
          )}

          {pagination.last_page > 1 && (
            <div className="px-4 py-3 border-t">
              <Pagination
                currentPage={pagination.current_page}
                totalPages={pagination.last_page}
                onPageChange={(page) => setPagination((p) => ({ ...p, current_page: page }))}
              />
            </div>
          )}
        </div>

        {/* Liste des rôles */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faShieldAlt} /> {t('available_roles')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="border p-4 rounded-lg hover:shadow-md transition-shadow">
                <h3 className="font-medium text-lg">{role.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{role.description || t('no_description')}</p>
                <div className="mt-2 text-xs text-gray-400">
                  {role.users_count || 0} {t('users')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modales locales */}
        <UserSelectionModal />
        <RoleSelectionModal />
        {showDeactivateModal && selectedUser && (
          <DeactivateModal user={selectedUser} onClose={() => setShowDeactivateModal(false)} />
        )}

        {/* 👉 Modale d’édition intégrée */}
        {showEditModal && selectedUser && (
          <EditRoleModal
            user={selectedUser}
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onRoleUpdated={() => fetchData({ withRoles: false, withUsers: true })}
          />
        )}

        {/* Erreur globale */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faExclamationCircle} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchData({ withRoles: true, withUsers: true })}
              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {t('retry')}
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default UserRolesManager;
