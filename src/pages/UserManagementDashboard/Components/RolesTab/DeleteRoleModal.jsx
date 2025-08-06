// DeleteRoleModal.jsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faTimes, faCheck , faSpinner} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

export const useDeleteRole = (onRoleDeleted) => {
 const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Configuration Axios
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = API_BASE_URL;
  }, []);


  const { t } = useTranslation();
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteModal = (role) => {
    setRoleToDelete(role);
  };

  const closeDeleteModal = () => {
    setRoleToDelete(null);
    setIsDeleting(false);
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/roles/${roleToDelete.id}/delete`);
      onRoleDeleted(roleToDelete.id);
      closeDeleteModal();
    } catch (error) {
      console.error('Erreur lors de la suppression du rôle :', error);
      alert(t('delete_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const DeleteModal = () => {
  if (!roleToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-2xl  w-auto p-8 relative">
        {/* Bouton de fermeture */}
        <button
          onClick={closeDeleteModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label={t('close')}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        {/* Icône et titre */}
        <div className="text-center bg-slate-50 p-2 w-80 rounded-md">
          <FontAwesomeIcon icon={faTrashAlt} className="text-red-500 text-6xl mb-4 " />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {t('confirm_delete')}
          </h3>
          <p className="text-gray-600 ">
            {t('delete_role_confirmation', { name: roleToDelete.name })}
          </p>
        </div>

        {/* Boutons centrés */}
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