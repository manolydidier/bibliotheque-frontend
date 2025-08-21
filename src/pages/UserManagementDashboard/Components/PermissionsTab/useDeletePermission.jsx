// hooks/useDeletePermission.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faTimes, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

export const useDeletePermission = (onPermissionDeleted) => {
  const { t } = useTranslation();

  const [permissionToDelete, setPermissionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const openDeleteModal = (permission) => {
    setPermissionToDelete(permission);
    setError(null);
  };

  const closeDeleteModal = () => {
    setPermissionToDelete(null);
    setIsDeleting(false);
    setError(null);
  };

  const handleDelete = async () => {
    if (!permissionToDelete) return;

    setIsDeleting(true);
    setError(null);
    
    try {
      // Configuration du token avant chaque requête
      const token = localStorage.getItem('auth_token');
      const config = {
        headers: {}
      };
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Appel à l'API pour supprimer la permission
      await axios.delete(`/permissions/${permissionToDelete.id}`, config);
      
      // Appelle le callback avec la permission supprimée
      onPermissionDeleted(permissionToDelete);
      closeDeleteModal();
    } catch (error) {
      console.error('Erreur lors de la suppression de la permission :', error);
      
      // Gestion des erreurs spécifiques
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 404) {
          setError(t('permission_not_found') || 'Permission non trouvée');
        } else if (status === 400) {
          setError(t('cannot_delete_assigned_permission') || 'Impossible de supprimer une permission assignée à des rôles');
        } else {
          setError(t('failed_to_delete_permission') || 'Échec de la suppression de la permission');
        }
      } else {
        setError(t('failed_to_delete_permission') || 'Échec de la suppression de la permission');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const DeleteModal = () => {
    if (!permissionToDelete) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-2xl w-auto p-8 relative max-w-md">
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
              {t('delete_permission_confirmation', {
                name: permissionToDelete.name,
              })}
            </p>
            
            {/* Affichage des erreurs */}
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Boutons */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={closeDeleteModal}
              className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              disabled={isDeleting}
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