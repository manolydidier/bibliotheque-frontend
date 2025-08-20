// useDeleteUserRole.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faTimes, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

export const useDeleteUserRole = (onUserRoleDeleted) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { t } = useTranslation();

  // Configuration Axios
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = API_BASE_URL;
  }, []);

  const [userRoleToDelete, setUserRoleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteModal = (userRole) => {
    setUserRoleToDelete(userRole);
  };

  const closeDeleteModal = () => {
    setUserRoleToDelete(null);
    setIsDeleting(false);
  };

  const handleDelete = async () => {
    if (!userRoleToDelete) return;

    setIsDeleting(true);
    try {
      // ✅ Bon endpoint : supprime l'affectation
      await axios.delete(`/userrole/${userRoleToDelete.user_id}/roles/${userRoleToDelete.role_id}`);
      
      // Appelle le callback avec l'ID de l'affectation ou les clés
      onUserRoleDeleted(userRoleToDelete);
      closeDeleteModal();
    } catch (error) {
      console.error('Erreur lors de la suppression de l’affectation :', error);
      alert(t('failed_to_remove_role') || 'Échec de la suppression du rôle');
    } finally {
      setIsDeleting(false);
    }
  };

  const DeleteModal = () => {
    if (!userRoleToDelete) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-2xl w-auto p-8 relative">
          {/* Bouton de fermeture */}
          <button
            onClick={closeDeleteModal}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            aria-label={t('close')}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>

          {/* Icône et texte */}
          <div className="text-center bg-red-50 p-6 rounded-md">
            <FontAwesomeIcon icon={faTrashAlt} className="text-red-500 text-5xl mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('confirm_delete')}</h3>
            <p className="text-gray-600">
              {t('delete_user_role_confirmation', {
                role: userRoleToDelete.role?.name || 'ce rôle',
                user: userRoleToDelete.user?.username || 'cet utilisateur',
              })}
            </p>
          </div>

          {/* Boutons */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={closeDeleteModal}
              className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-70 flex items-center transition"
            >
              {isDeleting && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              {t('confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { openDeleteModal, DeleteModal };
};