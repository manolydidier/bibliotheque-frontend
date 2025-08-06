import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faSpinner, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';

const UserRoleForm = ({ userId, onSave, onCancel, initialRoles = [] }) => {
  const { t } = useTranslation();
  const [allRoles, setAllRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchAllRoles = async () => {
      try {
        const response = await axios.get('/roles');
        setAllRoles(response.data.data || []);
        
        // Initialize selected roles if editing existing user
        if (initialRoles.length > 0) {
          setSelectedRoles(initialRoles.map(role => role.id));
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
        setError(t('failed_to_load_roles'));
      } finally {
        setLoading(false);
      }
    };

    fetchAllRoles();
  }, [initialRoles, t]);

  const handleRoleToggle = (roleId) => {
    setSelectedRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      await axios.post(`/users/${userId}/roles`, {
        roles: selectedRoles
      });

      // Fetch the updated roles to return complete role objects
      const response = await axios.get(`/users/${userId}/roles`);
      onSave(response.data.data);
    } catch (err) {
      console.error('Error saving user roles:', err);
      setSubmitError(t('failed_to_save_roles'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <div className="flex items-center text-red-600">
          <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
          <span>{error}</span>
        </div>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          {t('cancel')}
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">{t('assign_roles')}</h3>
          <p className="text-sm text-gray-500">
            {t('select_roles_to_assign_to_user')}
          </p>
        </div>

        <div className="border rounded-lg divide-y">
          {allRoles.map(role => (
            <div key={role.id} className="p-3 hover:bg-gray-50">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => handleRoleToggle(role.id)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="flex-grow">
                  <div className="font-medium text-gray-900">{role.name}</div>
                  <div className="text-sm text-gray-500">{role.description}</div>
                </div>
              </label>
            </div>
          ))}
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 rounded-lg flex items-center text-red-600">
            <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting || selectedRoles.length === 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                {t('saving')}...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheck} className="mr-2" />
                {t('save_roles')}
              </>
            )}
          </button>
        </div>
      </form>
    </ErrorBoundary>
  );
};

export default UserRoleForm;