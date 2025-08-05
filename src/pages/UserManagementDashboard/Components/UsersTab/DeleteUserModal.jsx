import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrashAlt, 
  faSpinner, 
  faTriangleExclamation,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const DeleteUserModal = ({ user, isOpen, onClose, onUserDeleted }) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    setError('');

    try {
      await axios.delete(`users/${user.id}/delete`);
      
      // Notifier le parent que l'utilisateur a été supprimé
      onUserDeleted(user.id);
      
      // Fermer la modal
      onClose();
      
      // Optionnel: Afficher un toast de succès
      // toast.success(t('user_deleted_successfully'));
      
    } catch (error) {
      console.error('Error deleting user:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError(t('error_deleting_user'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError('');
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-600" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">
              {t('confirm_deletion')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            {t('delete_user_confirmation', { name: user.name })}
          </p>
          
          {/* Informations utilisateur - Version épurée */}
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
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user.role}
              </span>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">
              <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
              {t('delete_warning_irreversible')}
            </p>
          </div>

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
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
          >
            {isDeleting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                {t('deleting')}...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrashAlt} className="mr-2" />
                {t('delete')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook personnalisé pour gérer la suppression
export const useDeleteUser = (onUserDeleted) => {
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    user: null
  });

  const openDeleteModal = (user) => {
    setDeleteModal({
      isOpen: true,
      user
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      user: null
    });
  };

  const handleUserDeleted = (userId) => {
    if (onUserDeleted) {
      onUserDeleted(userId);
    }
    closeDeleteModal();
  };

  return {
    deleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleUserDeleted,
    DeleteModal: ({ children, ...props }) => (
      <DeleteUserModal
        user={deleteModal.user}
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onUserDeleted={handleUserDeleted}
        {...props}
      />
    )
  };
};

export default DeleteUserModal;