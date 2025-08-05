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

  // Configure Axios
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
  }, []);

  // Fetch roles with optional search term
  const fetchAvailableRoles = async (term = '') => {
    setLoadingRoles(true);
    try {
      const params = term ? { search: term } : {};
      const response = await axios.get('/roles/rolesliste', { params });
      const roles = Array.isArray(response.data) ? response.data : [];
      setAvailableRoles(roles);

      // Preselect current role if no search term
      if (!term && user?.role_id) {
        const currentRole = roles.find((r) => r.id === user.role_id);
        setSelectedRoleDetails(currentRole);
        if (currentRole) {
          setSelectedRole(currentRole.id);
        }
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(t('error_fetching_roles'));
      setAvailableRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Load all roles when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedRole(user?.role_id || user?.role?.id || '');
      fetchAvailableRoles();
    } else {
      // Reset state when closing
      setAvailableRoles([]);
      setSelectedRole('');
      setSelectedRoleDetails(null);
      setError('');
      setSearchTerm('');
    }
  }, [isOpen, user]);

  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (isOpen) {
        fetchAvailableRoles(searchTerm);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, isOpen]);

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    const role = availableRoles.find((r) => r.id == roleId);
    setSelectedRoleDetails(role);
  };

  const handleUpdateRole = async () => {
    if (!user || !selectedRole || selectedRole === (user.role_id || user.role?.id)) return;

    setIsUpdating(true);
    setError('');
    try {
      await axios.patch(`/users/${user.id}/role`, {
        role_id: selectedRole,
      });

      if (onRoleUpdated) {
        onRoleUpdated(user.id, selectedRole);
      }
      onClose();
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

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faUserTag} className="text-blue-600" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">{t('edit_user_role')}</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isUpdating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">{t('change_role_for_user', { name: user.name })}</p>

          {/* User Info */}
          <div className="flex items-center p-4 bg-gray-50 rounded-lg mb-4">
            <img
              className="h-12 w-12 rounded-full object-cover"
              src={
                user.avatar_url
                  ? `${import.meta.env.VITE_API_BASE_STORAGE}/storage/${user.avatar_url}`
                  : 'https://www.w3schools.com/howto/img_avatar2.png'
              }
              alt="Avatar"
            />
            <div className="ml-4 flex-1">
              <div className="font-medium text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">{t('current_role')}</div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user.role?.name || 'N/A'}
              </span>
            </div>
          </div>

          {/* Role Selection with Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('new_role')}</label>

            {/* Search Input */}
            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_roles')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isUpdating}
              />
            </div>

            {/* Roles List */}
            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-inner">
              {loadingRoles ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  {t('loading_roles')}
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">{t('no_roles_found')}</div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-32">
                  {availableRoles.map((role) => (
                    <div
                      key={role.id}
                      onClick={() => handleRoleChange(role.id)}
                      className={`p-3 cursor-pointer transition-colors duration-150 hover:bg-blue-50 flex justify-between items-center ${
                        selectedRole == role.id ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="font-medium truncate">{role.name}</p>
                          {selectedRole == role.id && (
                            <FontAwesomeIcon 
                              icon={faCheckCircle} 
                              className="ml-2 text-green-500 flex-shrink-0" 
                            />
                          )}
                        </div>
                        {role.description && (
                          <p className="text-xs text-gray-500 truncate mt-1">{role.description}</p>
                        )}
                      </div>
                      <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">
                        {role.users_count} {t('users')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Role Details */}
          {selectedRoleDetails && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <FontAwesomeIcon icon={faShieldAlt} className="text-blue-500 mr-2" />
                {t('role_permissions')}
              </h4>
              {selectedRoleDetails.permissions && selectedRoleDetails.permissions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedRoleDetails.permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center text-sm text-gray-700">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" />
                      <span className="truncate">{permission.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('no_permissions_for_role')}</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isUpdating}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleUpdateRole}
            disabled={isUpdating || !selectedRole || selectedRole === (user.role_id || user.role?.id)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
          >
            {isUpdating ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                {t('updating')}...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCog} className="mr-2" />
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

  const handleRoleUpdated = (userId, newRole) => {
    if (onRoleUpdated) {
      onRoleUpdated(userId, newRole);
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