import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog,
  faSpinner,
  faTimes,
  faUserTag,
  faShieldAlt,
  faCheckCircle,
  faSearch,
  faSortUp,
  faSortDown,
  faInfoCircle,
  faUsers,
  faKey
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const EditRoleModal = ({ user, isOpen, onClose, onRoleUpdated }) => {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRoleDetails, setSelectedRoleDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({
    onlyAdmin: false,
    withPermissions: false
  });
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0
  });

  // Configure Axios
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
  }, []);

  const fetchAvailableRoles = async (term = '') => {
    setLoadingRoles(true);
    try {
      // Utiliser la route correcte pour les rôles
      const response = await axios.get('/roles');
      
      if (response.data && response.data.data) {
        // Filtrer les rôles selon les critères
        let filteredRoles = response.data.data;
        
        // Filtrer par terme de recherche
        if (term) {
          filteredRoles = filteredRoles.filter(role => 
            role.name.toLowerCase().includes(term.toLowerCase()) ||
            (role.description && role.description.toLowerCase().includes(term.toLowerCase()))
          );
        }
        
        // Filtrer par type admin
        if (filters.onlyAdmin) {
          filteredRoles = filteredRoles.filter(role => role.is_admin === true);
        }
        
        // Filtrer par permissions
        if (filters.withPermissions) {
          filteredRoles = filteredRoles.filter(role => 
            role.permissions && role.permissions.length > 0
          );
        }
        
        // Trier les résultats
        filteredRoles.sort((a, b) => {
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
        
        setAvailableRoles(filteredRoles);
        setPagination(prev => ({
          ...prev,
          total: filteredRoles.length
        }));

        // Sélectionner le rôle actuel de l'utilisateur
        if (!term && user) {
          const currentRole = filteredRoles.find((r) => r.id === user.role_id);
          if (currentRole) {
            setSelectedRole(currentRole.id);
            setSelectedRoleDetails(currentRole);
          } else if (user.role) {
            // Si l'utilisateur a un rôle mais qu'il n'est pas dans la liste
            setSelectedRole(user.role);
          }
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(err.response?.data?.message || t('error_fetching_roles'));
      setAvailableRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      setSearchTerm('');
      setSelectedRole(user.role_id || user.role || '');
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchAvailableRoles();
    } else {
      setAvailableRoles([]);
      setSelectedRole('');
      setSelectedRoleDetails(null);
      setError('');
      setSearchTerm('');
    }
  }, [isOpen, user, filters, sortField, sortDirection]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (isOpen) {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchAvailableRoles(searchTerm);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    const role = availableRoles.find((r) => r.id === roleId);
    setSelectedRoleDetails(role);
  };

  const handleUpdateRole = async () => {
    if (!user || !selectedRole) return;

    setIsUpdating(true);
    setError('');
    try {
      // Utiliser la route correcte pour mettre à jour le rôle
      // Votre contrôleur attend un ID d'attribution de rôle, mais nous devons d'abord trouver l'ID de l'attribution existante
      
      // D'abord, récupérer l'attribution de rôle existante pour cet utilisateur
      const userRolesResponse = await axios.get(`/userrole/${user.id}/roles`);
        // console.log(userRolesResponse.data.data.roles[0].id);

      
      if (userRolesResponse.data.status && userRolesResponse.data.data.roles.length > 0) {
        // Prendre le premier rôle (ou trouver le bon si l'utilisateur a plusieurs rôles)
        const userRole = userRolesResponse.data.data.roles[0];
        // console.log(userRole);
        
        // Maintenant mettre à jour avec l'ID correct
        const response = await axios.post(`/users/${userRole.id}/role`, {
          role_id: selectedRole,
          user_id: user.id
        });

        if (response.data.status) {
          onRoleUpdated?.(user.id, selectedRole, response.data.data);
          onClose();
        } else {
          throw new Error(response.data.message || 'Failed to update role');
        }
      } else {
        // Si l'utilisateur n'a pas d'attribution de rôle existante, en créer une nouvelle
        const response = await axios.post('/userrole/user-roles', {
          role_id: selectedRole,
          user_id: user.id
        });

        if (response.data.status) {
          onRoleUpdated?.(user.id, selectedRole, response.data.data);
          onClose();
        } else {
          throw new Error(response.data.message || 'Failed to assign role');
        }
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      // Afficher un message d'erreur plus spécifique
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.status === 404) {
        setError(t('role_assignment_not_found'));
      } else if (error.response?.status === 422) {
        setError(t('user_already_has_role'));
      } else {
        setError(t('error_updating_role'));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Fonction pour obtenir les rôles paginés
  const getPaginatedRoles = () => {
    const startIndex = (pagination.page - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    return availableRoles.slice(startIndex, endIndex);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
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
          >
            <FontAwesomeIcon icon={faTimes} className="text-sm" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-gray-600 text-sm mb-5">{t('change_role_for_user', { name: user.name })}</p>

          {/* User Info */}
          <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-5 border border-gray-100">
            <img
              className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
              src={user.avatar_url || 'https://www.gravatar.com/avatar/?d=mp'}
              alt="Avatar"
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

          {/* Role Selection */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
              {t('new_role')}
            </label>

            {/* Search Input */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FontAwesomeIcon icon={faSearch} className="text-xs" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_roles')}
                className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                disabled={isUpdating}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-3">
              <label className="inline-flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.onlyAdmin}
                  onChange={(e) => setFilters({...filters, onlyAdmin: e.target.checked})}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700">{t('only_admin_roles')}</span>
              </label>
              <label className="inline-flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.withPermissions}
                  onChange={(e) => setFilters({...filters, withPermissions: e.target.checked})}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700">{t('only_with_permissions')}</span>
              </label>
            </div>

            {/* Roles List */}
            <div className="border border-gray-200 rounded-lg bg-white shadow-xs overflow-hidden">
              {/* Sort Header */}
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

              {/* Roles List Content */}
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
                          selectedRole === role.id 
                            ? 'bg-blue-50/50' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-4 px-3 py-2.5">
                          <div className="col-span-8 flex items-center">
                            <div className={`flex items-center justify-center h-7 w-7 rounded-full mr-2.5 flex-shrink-0 ${
                              selectedRole === role.id 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                            }`}>
                              <FontAwesomeIcon 
                                icon={role.is_admin ? faShieldAlt : faUserTag} 
                                className="text-xs" 
                              />
                            </div>
                            
                            <div className="min-w-0">
                              <div className="flex items-center">
                                <p className={`text-sm font-medium truncate ${
                                  selectedRole === role.id 
                                    ? 'text-blue-700' 
                                    : 'text-gray-700'
                                }`}>
                                  {role.name}
                                </p>
                                {selectedRole === role.id && (
                                  <FontAwesomeIcon 
                                    icon={faCheckCircle} 
                                    className="ml-1.5 text-green-500 flex-shrink-0 text-xs" 
                                  />
                                )}
                              </div>
                              
                              {role.description && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {role.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="col-span-4 flex items-center justify-end space-x-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              role.is_admin 
                                ? 'bg-purple-50 text-purple-700' 
                                : 'bg-gray-50 text-gray-700'
                            }`}>
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

              {/* Pagination */}
              {availableRoles.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="inline-flex items-center px-2.5 py-1 border border-gray-200 text-xs font-medium rounded text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('previous')}
                  </button>
                  <span className="text-xs text-gray-600">
                    {pagination.page} / {Math.ceil(pagination.total / pagination.perPage)}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page * pagination.perPage >= pagination.total}
                    className="inline-flex items-center px-2.5 py-1 border border-gray-200 text-xs font-medium rounded text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('next')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Selected Role Details */}
          {selectedRoleDetails && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-100">
              <h4 className="flex items-center text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                <FontAwesomeIcon icon={faShieldAlt} className="text-blue-500 mr-1.5 text-xs" />
                {t('role_permissions')}
              </h4>
              {selectedRoleDetails.permissions && selectedRoleDetails.permissions.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {selectedRoleDetails.permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center text-xs text-gray-700">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-1.5 text-xs" />
                      <span className="truncate">{permission.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">{t('no_permissions_for_role')}</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-600">{error}</p>
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
            disabled={isUpdating || !selectedRole || selectedRole === (user.role_id || user.role)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
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

// Custom hook
export const useEditRole = (onRoleUpdated) => {
  const [editRoleModal, setEditRoleModal] = useState({
    isOpen: false,
    user: null,
  });

  const openEditRoleModal = (user) => {
    setEditRoleModal({
      isOpen: true,
      user,
    });
  };

  const closeEditRoleModal = () => {
    setEditRoleModal({
      isOpen: false,
      user: null,
    });
  };

  const handleRoleUpdated = (userId, newRole, updatedUser) => {
    if (onRoleUpdated) {
      onRoleUpdated(userId, newRole, updatedUser);
    }
    closeEditRoleModal();
  };

  return {
    editRoleModal,
    openEditRoleModal,
    closeEditRoleModal,
    handleRoleUpdated,
    EditRoleModalComponent: (props) => (
      <EditRoleModal
        user={editRoleModal.user}
        isOpen={editRoleModal.isOpen}
        onClose={closeEditRoleModal}
        onRoleUpdated={handleRoleUpdated}
        {...props}
      />
    ),
  };
};

export default EditRoleModal;