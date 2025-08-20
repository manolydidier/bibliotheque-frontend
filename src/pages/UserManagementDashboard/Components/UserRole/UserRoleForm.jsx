import React, { useState, useEffect } from 'react';
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
  faPlus,
  faCog,
  faTimes,
  faCheck,
  faChevronDown 
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';
import Pagination from '../../../../component/pagination/Pagination';
import { useSelector } from 'react-redux';

const UserRolesManager = () => {
  const { t } = useTranslation();
  const isRefresh = useSelector((state) => state.library.isReredingListeuser);

  // États principaux
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });

  // États pour la sélection
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [assignError, setAssignError] = useState('');

  // États pour les modales
  const [showUserSelectionModal, setShowUserSelectionModal] = useState(false);
  const [showRoleSelectionModal, setShowRoleSelectionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // États pour la recherche dans les modales
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [filteredModalUsers, setFilteredModalUsers] = useState([]);
  const [filteredModalRoles, setFilteredModalRoles] = useState([]);
  
  const API_BASE_STORAGE = import.meta.env.VITE_API_STORAGE_URL;

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
  }, []);

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, rolesRes] = await Promise.all([
          axios.get('/users', {
            params: { 
              page: pagination.current_page, 
              search: searchTerm 
            }
          }),
          axios.get('/roles')
        ]);
          
        setUsers(usersRes.data.users || []);
        setPagination(usersRes.data.pagination || {
          current_page: 1,
          last_page: 1,
          total: 0,
          per_page: 10
        });
        setRoles(rolesRes.data.data || []);
      } catch (err) {
        setError(t('failed_to_load_data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchTerm, pagination.current_page, isRefresh]);

  // Filtrer les utilisateurs pour la modale
  useEffect(() => {
    if (userSearchTerm) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
      setFilteredModalUsers(filtered);
    } else {
      setFilteredModalUsers(users);
    }
  }, [userSearchTerm, users]);

  // Filtrer les rôles pour la modale
  useEffect(() => {
    if (roleSearchTerm) {
      const filtered = roles.filter(role => 
        role.name.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(roleSearchTerm.toLowerCase()))
      );
      setFilteredModalRoles(filtered);
    } else {
      setFilteredModalRoles(roles);
    }
  }, [roleSearchTerm, roles]);

  // Fonction pour obtenir tous les rôles d'un utilisateur
  const getUserRoles = (user) => {
    const rolesList = [];
    
    // Ajouter le rôle principal si présent
    if (user.role && user.role !== "User") {
      rolesList.push(user.role);
    }
    
    // Ajouter les rôles supplémentaires si présents
    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach(role => {
        if (role.name && role.name !== "User" && !rolesList.includes(role.name)) {
          rolesList.push(role.name);
        }
      });
    }
    
    // Si aucun rôle n'a été trouvé, ajouter "User" comme rôle par défaut
    if (rolesList.length === 0) {
      rolesList.push("User");
    }
    
    return rolesList;
  };

  // Gestion des sélections
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowUserSelectionModal(false);
    setUserSearchTerm('');
    setAssignError('');
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleSelectionModal(false);
    setRoleSearchTerm('');
    setAssignError('');
  };

  // Attribution de rôle
  const handleAssignRole = async () => {
    if (!selectedUser) return setAssignError(t('please_select_user'));
    if (!selectedRole) return setAssignError(t('please_select_role'));

    try {
      await axios.post('/userrole/user-roles', {
        user_id: selectedUser.id,
        role_id: selectedRole.id,
      });

      // Réinitialiser et rafraîchir
      setSelectedUser(null);
      setSelectedRole(null);
      setAssignError('');
      fetchUsers();
    } catch (err) {
      setAssignError(t('failed_to_assign_role'));
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRes = await axios.get('/users', {
        params: { 
          page: pagination.current_page, 
          search: searchTerm 
        }
      });
      
      setUsers(usersRes.data.users || []);
      setPagination(usersRes.data.pagination || {
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 10
      });
    } catch (err) {
      setError(t('failed_to_load_users'));
    } finally {
      setLoading(false);
    }
  };

  // Modale de sélection d'utilisateur améliorée
  const UserSelectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">{t('select_user')}</h3>
          <button onClick={() => {
            setShowUserSelectionModal(false);
            setUserSearchTerm('');
          }} className="text-gray-500">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder={t('search_users')}
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded"
            />
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {filteredModalUsers.length > 0 ? (
            filteredModalUsers.map(user => (
              <div 
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="p-4 hover:bg-gray-50 cursor-pointer flex items-center"
              >
                <img
                  src={user.avatar_url ? `${API_BASE_STORAGE}/${user.avatar_url}` : 'https://www.w3schools.com/howto/img_avatar2.png'}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover mr-3"
                />
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {getUserRoles(user).join(', ') || t('no_roles_assigned')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              {t('no_users_found')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Modale de sélection de rôle améliorée
  const RoleSelectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">{t('select_role')}</h3>
          <button onClick={() => {
            setShowRoleSelectionModal(false);
            setRoleSearchTerm('');
          }} className="text-gray-500">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder={t('search_roles')}
              value={roleSearchTerm}
              onChange={(e) => setRoleSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded"
            />
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {filteredModalRoles.length > 0 ? (
            filteredModalRoles.map(role => (
              <div 
                key={role.id}
                onClick={() => handleRoleSelect(role)}
                className="p-4 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              >
                <div className="font-medium flex items-center">
                  <FontAwesomeIcon icon={faShieldAlt} className="text-blue-500 mr-2" />
                  {role.name}
                </div>
                <div className="text-sm text-gray-500 mt-1">{role.description || t('no_description')}</div>
                <div className="text-xs text-gray-400 mt-2">
                  {role.users_count || 0} {t('users_with_this_role')}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              {t('no_roles_found')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Modale d'édition de rôles - MODIFIÉE selon la référence
  const RoleEditModal = ({ user, onClose, onUpdate }) => {
    const [selectedRole, setSelectedRole] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');
    const [availableRoles, setAvailableRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [selectedRoleDetails, setSelectedRoleDetails] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
      const fetchAvailableRoles = async () => {
        setLoadingRoles(true);
        try {
          const response = await axios.get('/roles');
          
          if (response.data && response.data.data) {
            setAvailableRoles(response.data.data);
            
            // Sélectionner le rôle actuel de l'utilisateur
            if (user) {
              const currentRole = response.data.data.find((r) => r.id === user.role_id);
              if (currentRole) {
                setSelectedRole(currentRole.id);
                setSelectedRoleDetails(currentRole);
              } else if (user.role) {
                setSelectedRole(user.role);
              }
            }
          }
        } catch (err) {
          setError(t('error_fetching_roles'));
        } finally {
          setLoadingRoles(false);
        }
      };

      if (user) {
        fetchAvailableRoles();
      }
    }, [user]);

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
        const response = await axios.post(`/users/${user.id}/role`, {
          role_id: selectedRole,
        });

        if (response.data.status === 'success') {
          onUpdate();
          onClose();
        } else {
          throw new Error(response.data.message || 'Failed to update role');
        }
      } catch (error) {
        console.error('Error updating user role:', error);
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError(t('error_updating_role'));
        }
      } finally {
        setIsUpdating(false);
      }
    };

    if (!user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium">{t('edit_roles_for')} {user.name}</h3>
            <button onClick={onClose} className="text-gray-500">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded m-4 flex items-center">
              <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
              {error}
            </div>
          )}

          <div className="p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('select_role')}</label>
            
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
                className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                disabled={isUpdating}
              />
            </div>

            {/* Roles List */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden max-h-60 overflow-y-auto">
              {loadingRoles ? (
                <div className="flex flex-col items-center justify-center p-6 text-gray-400">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-base mb-2" />
                  <span className="text-xs">{t('loading_roles')}</span>
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-gray-400">
                  <FontAwesomeIcon icon={faExclamationCircle} className="text-base mb-2" />
                  <span className="text-xs">{t('no_roles_found')}</span>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {availableRoles
                    .filter(role => 
                      !searchTerm || 
                      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((role) => (
                    <li
                      key={role.id}
                      onClick={() => handleRoleChange(role.id)}
                      className={`p-3 cursor-pointer transition-colors duration-100 ${
                        selectedRole === role.id 
                          ? 'bg-blue-50/50' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`flex items-center justify-center h-7 w-7 rounded-full mr-3 flex-shrink-0 ${
                          selectedRole === role.id 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <FontAwesomeIcon 
                            icon={role.is_admin ? faShieldAlt : faUserTag} 
                            className="text-xs" 
                          />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center">
                            <p className={`text-sm font-medium ${
                              selectedRole === role.id 
                                ? 'text-blue-700' 
                                : 'text-gray-700'
                            }`}>
                              {role.name}
                            </p>
                            {selectedRole === role.id && (
                              <FontAwesomeIcon 
                                icon={faCheck} 
                                className="ml-2 text-green-500 flex-shrink-0 text-xs" 
                              />
                            )}
                          </div>
                          
                          {role.description && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Selected Role Details */}
            {selectedRoleDetails && (
              <div className="bg-gray-50 p-3 rounded-lg mt-4 border border-gray-100">
                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                  {t('role_permissions')}
                </h4>
                {selectedRoleDetails.permissions && selectedRoleDetails.permissions.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {selectedRoleDetails.permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center text-xs text-gray-700">
                        <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-1.5 text-xs" />
                        <span className="truncate">{permission.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">{t('no_permissions_for_role')}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="px-4 py-2 border rounded text-gray-700"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleUpdateRole}
              disabled={isUpdating || !selectedRole || selectedRole === (user.role_id || user.role)}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-70 flex items-center justify-center"
            >
              {isUpdating ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-1.5" />
                  {t('updating')}...
                </>
              ) : (
                t('save_changes')
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modale de désactivation
  const DeactivateModal = ({ user, onClose }) => {
    const [loading, setLoading] = useState(false);

    const handleDeactivate = async () => {
      setLoading(true);
      try {
        await axios.put(`/users/${user.id}/deactivate`);
        onClose();
        fetchUsers();
      } catch (err) {
        alert(t('deactivation_failed'));
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">{t('deactivate_user')}</h3>
          </div>
          <div className="p-4">
            <p className="mb-4">{t('confirm_deactivate_user')} <strong>{user.name}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded text-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeactivate}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-70"
              >
                {loading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  t('confirm')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Affichage principal
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
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                fetchUsers();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={loading}
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
            </button>
          </div>
        </div>

        {/* Section d'attribution de rôle */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faUser} /> {t('assign_role')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('user')}</label>
              <button
                onClick={() => setShowUserSelectionModal(true)}
                className="w-full p-2 border rounded text-left hover:bg-gray-50 flex justify-between items-center"
              >
                {selectedUser ? (
                  <div className="flex items-center">
                    <img
                      src={selectedUser.avatar_url ? `${API_BASE_STORAGE}/${selectedUser.avatar_url}` : 'https://www.w3schools.com/howto/img_avatar2.png'}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover mr-2"
                    />
                    <span>{selectedUser.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">{t('select_user')}</span>
                )}
                <FontAwesomeIcon icon={faChevronDown} className="text-gray-400" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
              <button
                onClick={() => selectedUser && setShowRoleSelectionModal(true)}
                disabled={!selectedUser}
                className="w-full p-2 border rounded text-left hover:bg-gray-50 flex justify-between items-center disabled:bg-gray-50"
              >
                {selectedRole ? (
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faShieldAlt} className="text-blue-500 mr-2" />
                    <span>{selectedRole.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">{t('select_role')}</span>
                )}
                <FontAwesomeIcon icon={faChevronDown} className="text-gray-400" />
              </button>
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
        </div>

        {/* Liste des utilisateurs */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
                {users.map((user) => {
                  const userRoles = getUserRoles(user);
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={user.avatar_url ? `${API_BASE_STORAGE}/${user.avatar_url}` : 'https://www.w3schools.com/howto/img_avatar2.png'}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full object-cover"
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
                                key={index} 
                                className={`px-2 py-1 rounded-full text-xs ${
                                  role === "User" 
                                    ? "bg-gray-100 text-gray-800" 
                                    : "bg-blue-100 text-blue-800"
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
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.status === "Actif" ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
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
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeactivateModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-800 p-1"
                            title={user.status === "Actif" ? t('deactivate') : t('activate')}
                          >
                            <FontAwesomeIcon icon={faCog} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              {t('no_users_found')}
            </div>
          )}

          {pagination.last_page > 1 && (
            <div className="px-4 py-3 border-t">
              <Pagination
                currentPage={pagination.current_page}
                totalPages={pagination.last_page}
                onPageChange={(page) => setPagination({ ...pagination, current_page: page })}
              />
            </div>
          )}
        </div>

        {/* Liste des rôles disponibles */}
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

        {/* Modales */}
        {showUserSelectionModal && <UserSelectionModal />}
        {showRoleSelectionModal && <RoleSelectionModal />}
        {showEditModal && selectedUser && (
          <RoleEditModal
            user={selectedUser}
            onClose={() => setShowEditModal(false)}
            onUpdate={() => fetchUsers()}
          />
        )}
        {showDeactivateModal && selectedUser && (
          <DeactivateModal
            user={selectedUser}
            onClose={() => setShowDeactivateModal(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default UserRolesManager;