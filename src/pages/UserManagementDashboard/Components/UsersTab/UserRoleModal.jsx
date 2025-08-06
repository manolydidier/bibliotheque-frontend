import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const UserRoleModal = ({ show, onClose, userId, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    role_id: '',
    assigned_by: '',
    assigned_at: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState([]);

const fetchUserRoles = async (userId) => {
  setUserRolesLoading(true);
  try {
    const response = await axios.get(`/userrole/${userId}/roles`);
    setUserRoles(response.data.data || []);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    setUserRoles([]);
  } finally {
    setUserRolesLoading(false);
  }
};

const handleViewUserRoles = (user) => {
  setSelectedUserForRoles(user);
  fetchUserRoles(user.id);
};

  useEffect(() => {
    if (show) {
      const fetchRoles = async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.get('/roles/select-list', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          setRoles(response.data.data || []);
        } catch (err) {
          console.error('Error fetching roles:', err);
        }
      };
      fetchRoles();
    }
  }, [show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const data = {
        ...formData,
        user_id: userId
      };

      const response = await axios.post('/user-roles', data, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.status === 'success') {
        onSave(response.data.data);
      } else {
        throw new Error(response.data.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving user role:', err);
      setError(err.response?.data?.message || t('error_saving_user_role'));
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            {t('assign_new_role')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('role')} *
            </label>
            <select
              name="role_id"
              value={formData.role_id}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="">{t('select_role')}</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assigned_by')} ({t('optional')})
            </label>
            <input
              type="text"
              name="assigned_by"
              value={formData.assigned_by}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2"
              placeholder="ID de l'administrateur"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('assignment_date')} ({t('optional')})
            </label>
            <input
              type="date"
              name="assigned_at"
              value={formData.assigned_at}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700"
              disabled={loading}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
              disabled={loading}
            >
              {loading ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              ) : (
                <FontAwesomeIcon icon={faSave} className="mr-2" />
              )}
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRoleModal;