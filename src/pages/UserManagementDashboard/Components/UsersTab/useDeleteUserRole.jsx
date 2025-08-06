import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const useDeleteUserRole = (onSuccess) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [userRoleToDelete, setUserRoleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const openDeleteModal = (userRole) => {
    setUserRoleToDelete(userRole);
    setIsOpen(true);
  };

  const closeDeleteModal = () => {
    setIsOpen(false);
    setUserRoleToDelete(null);
    setError('');
  };

  const handleDelete = async () => {
    if (!userRoleToDelete) return;
    
    setIsDeleting(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`/user-roles/${userRoleToDelete.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      onSuccess(userRoleToDelete.id);
      closeDeleteModal();
    } catch (err) {
      console.error('Error deleting user role:', err);
      setError(err.response?.data?.message || t('error_deleting_user_role'));
    } finally {
      setIsDeleting(false);
    }
  };

  const DeleteModal = () => (
    isOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium mb-4">
            {t('confirm_delete_user_role')}
          </h3>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">
              {error}
            </div>
          )}

          <p className="mb-4">
            {t('confirm_delete_user_role_message', { 
              role: userRoleToDelete?.name 
            })}
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={closeDeleteModal}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700"
              disabled={isDeleting}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded"
              disabled={isDeleting}
            >
              {isDeleting ? t('deleting') + '...' : t('delete')}
            </button>
          </div>
        </div>
      </div>
    )
  );

  return { openDeleteModal, DeleteModal };
};

export default useDeleteUserRole;