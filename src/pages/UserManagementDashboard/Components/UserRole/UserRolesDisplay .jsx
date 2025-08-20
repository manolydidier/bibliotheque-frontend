import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrashAlt,
  faSpinner,
  faCheckCircle,
  faExclamationCircle,
  faUserTag,
  faTimes,
  faCheck,
  faSearch,
  faAngleLeft,
  faAngleRight,
  faCogs, // Icône pour le bouton de gestion
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useSelector } from 'react-redux';

// 🔽 Import du gestionnaire avancé
import UserRolesManager from './UserRoleForm'; // Ajuste le chemin si nécessaire

const UserRolesDisplay = () => {
  const { t } = useTranslation();
  const currentUserId = useSelector((state) => state?.library?.auth?.user?.id);

  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // 🔍 Recherche
  const [search, setSearch] = useState('');

  // 📄 Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // 🗑️ Modal suppression
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 🛠️ Modal de gestion avancée
  const [showManagerModal, setShowManagerModal] = useState(false);

  // 🔁 Charger les données
  const fetchUserRoles = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get('/userrole', {
        params: {
          search,
          per_page: pagination.per_page,
          page,
        },
      });

      const data = response.data?.data;
      if (data?.data) {
        setUserRoles(data.data);
        setPagination({
          current_page: data.current_page,
          last_page: data.last_page,
          per_page: data.per_page,
          total: data.total,
        });
      }
      setError(null);
    } catch (err) {
      console.error('Erreur chargement des rôles:', err);
      setError(
        err.response?.data?.message ||
        t('error_load', 'Failed to load roles.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRoles(1);
  }, [search]);

  // 🕒 Disparition auto des messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    fetchUserRoles(page);
  };

  // 🗑️ Suppression
  const handleDelete = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/userrole/${roleToDelete.id}`);
      setUserRoles((prev) => prev.filter((ur) => ur.id !== roleToDelete.id));
      setSuccessMessage(t('success_delete', { role: roleToDelete.role?.name }));
      setRoleToDelete(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        t('error_delete', 'Failed to delete role.')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && userRoles.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-500 mr-3" />
        <span>{t('loading_roles')}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header + Bouton de gestion */}
      <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faUserTag} className="text-blue-500 mr-2" />
          <h3 className="font-medium text-gray-800">{t('roles_management')}</h3>
        </div>

        {/* Bouton "Gérer les rôles" */}
        <button
          onClick={() => setShowManagerModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm transition"
        >
          <FontAwesomeIcon icon={faCogs} />
          {t('manage_roles_advanced', 'Gérer les rôles')}
        </button>
      </div>

      {/* Notifications éphémères */}
      {successMessage && (
        <div className="p-3 bg-green-50 text-green-600 flex items-center justify-between border-b">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
            aria-label={t('close')}
          >
            <FontAwesomeIcon icon={faTimes} size="sm" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-600 flex items-center justify-between border-b">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
            aria-label={t('close')}
          >
            <FontAwesomeIcon icon={faTimes} size="sm" />
          </button>
        </div>
      )}

      {/* Recherche */}
      <div className="p-4 border-b bg-gray-50">
        <div className="relative max-w-md">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('search_users_or_roles')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('user')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('role')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('description')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('assigned_on')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('assigned_by')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {userRoles.length > 0 ? (
              userRoles.map((userRole) => {
                const isCurrentUser = Number(userRole.user_id) === Number(currentUserId);
                return (
                  <tr
                    key={userRole.id}
                    className={isCurrentUser ? 'bg-blue-50 border-l-4 border-l-blue-400' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {userRole.user?.username || userRole.user?.email || `#${userRole.user_id}`}
                      </div>
                      {isCurrentUser && (
                        <span className="text-xs text-blue-600 font-semibold">{t('me_indicator')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userRole.role?.name || t('unknown', 'Unknown')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {userRole.role?.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(userRole.assigned_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userRole.assigned_by?.username || userRole.assigned_by?.email || t('system', 'System')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setRoleToDelete(userRole)}
                        className={`p-1 rounded-full ${
                          isCurrentUser ? 'text-red-700 hover:bg-red-200' : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={t('delete')}
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  {t('no_roles_found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="flex items-center justify-between p-4 bg-gray-50">
          <div className="text-sm text-gray-600">
            {t('page_info', {
              current: pagination.current_page,
              total: pagination.last_page,
              count: pagination.total,
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
            {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === pagination.last_page ||
                  (page >= pagination.current_page - 1 && page <= pagination.current_page + 1)
              )
              .map((page, idx, filtered) => {
                const prevPage = filtered[idx - 1];
                if (prevPage && page - prevPage > 1) {
                  return (
                    <React.Fragment key={`ellipsis-${page}`}>
                      <span className="px-3 py-1 text-gray-500">...</span>
                      <button
                        onClick={() => handlePageChange(page)}
                        className="px-3 py-1 border rounded hover:bg-gray-200"
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 border rounded ${
                      page === pagination.current_page ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl w-auto p-8 relative max-w-md">
            <button
              onClick={() => setRoleToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label={t('close')}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <div className="text-center bg-red-50 p-6 rounded-md">
              <FontAwesomeIcon icon={faTrashAlt} className="text-red-500 text-5xl mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('confirm_delete')}</h3>
              <p className="text-gray-600">
                {t('delete_confirmation', {
                  role: roleToDelete.role?.name,
                  user: roleToDelete.user?.username || roleToDelete.user?.email,
                })}
              </p>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => setRoleToDelete(null)}
                className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 text-white rounded-lg flex items-center disabled:opacity-70"
              >
                {isDeleting && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
                <FontAwesomeIcon icon={faCheck} className="mr-2" />
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal : Gestionnaire avancé */}
      {showManagerModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 pt-10 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Header de la modale */}
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="text-lg font-medium text-gray-800">{t('advanced_role_management')}</h3>
              <button
                onClick={() => setShowManagerModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label={t('close')}
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>
            {/* Contenu */}
            <div className="overflow-y-auto max-h-[calc(90vh-60px)]">
              <UserRolesManager />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRolesDisplay;