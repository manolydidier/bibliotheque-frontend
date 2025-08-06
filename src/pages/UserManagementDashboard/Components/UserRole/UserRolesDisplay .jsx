import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrashAlt, faPlus, faSpinner, 
  faCheckCircle, faExclamationCircle, faUserTag 
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import UserRoleForm from './UserRoleForm';

const UserRolesDisplay = ({ userId, userName }) => {
  const { t } = useTranslation();
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const response = await axios.get(`/users/${userId}/roles`);
        setUserRoles(response.data.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching user roles:', err);
        setError(t('failed_to_load_roles'));
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [userId, t]);

  const handleDeleteRole = async (roleId) => {
    try {
      await axios.delete(`/users/${userId}/roles/${roleId}`);
      setUserRoles(prev => prev.filter(role => role.id !== roleId));
      setSuccessMessage(t('role_removed_success'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting role:', err);
      setError(t('failed_to_remove_role'));
    }
  };

  const handleAddRoles = (newRoles) => {
    setUserRoles(prev => [...prev, ...newRoles]);
    setShowAddForm(false);
    setSuccessMessage(t('roles_added_success'));
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-500 mr-3" />
        <span>{t('loading_roles')}...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faUserTag} className="text-blue-500 mr-2" />
          <h3 className="font-medium text-gray-800">
            {t('roles_for_user', { name: userName })}
          </h3>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center hover:bg-blue-700"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          {t('assign_role')}
        </button>
      </div>

      {/* Messages d'état */}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 flex items-center">
          <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-green-50 text-green-600 flex items-center">
          <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="p-4 border-b">
          <UserRoleForm
            userId={userId}
            onSave={handleAddRoles}
            onCancel={() => setShowAddForm(false)}
            existingRoles={userRoles}
          />
        </div>
      )}

      {/* Tableau des rôles */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('role_name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('description')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('assigned_on')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {userRoles.length > 0 ? (
              userRoles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{role.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{role.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(role.pivot?.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                      title={t('remove_role')}
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                  {t('no_roles_assigned')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserRolesDisplay;