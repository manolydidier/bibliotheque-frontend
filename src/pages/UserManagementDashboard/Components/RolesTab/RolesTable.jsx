import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faEdit,
  faPlus,
  faTrashAlt,
  faSearch,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import RoleModal from './RoleModal';
import Pagination from '../../../../component/pagination/Pagination';
import { useDeleteRole } from './DeleteRoleModal'; // Hook personnalisé
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';

const RolesTable = () => {
  const { t } = useTranslation();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const cancelToken = useRef(null);
  const debounceTimeout = useRef(null);

  // Configuration Axios
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
  }, []);

  // Fonction pour charger les rôles
  const fetchRoles = async (page = 1, search = '') => {
    if (cancelToken.current) {
      cancelToken.current.cancel('Nouvelle requête lancée');
    }
    cancelToken.current = axios.CancelToken.source();
    setLoading(true);

    try {
      const response = await axios.get('/roles', {
        params: { page, search },
        cancelToken: cancelToken.current.token,
      });

      setRoles(response.data.data || []);
      setPagination({
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        total: response.data.total,
      });
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Erreur lors du chargement des rôles :', error);
        setRoles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Recherche avec debounce
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchRoles(currentPage, searchTerm);
    }, 300);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [currentPage, searchTerm]);

  // Gestion du modal
  const handleCreate = () => {
    setSelectedRole(null);
    setShowModal(true);
  };

  const handleEdit = (role) => {
    setSelectedRole(role);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRole(null);
  };

  // Mise à jour après création/modification
  const handleSave = (updatedRole) => {
    if (selectedRole) {
      setRoles((prev) =>
        prev.map((r) => (r.id === updatedRole.id ? updatedRole : r))
      );
    } else {
      setRoles((prev) => [updatedRole, ...prev]);
    }
    handleCloseModal();
  };

  // Hook de suppression
  const { openDeleteModal, DeleteModal } = useDeleteRole((deletedRoleId) => {
    setRoles((prev) => prev.filter((r) => r.id !== deletedRoleId));
    if (roles.length === 1 && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  });

  const handleDeleteClick = (role) => {
    openDeleteModal(role);
  };

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t('roles_management')}</h2>
            <p className="text-gray-500 text-sm">{t('create_manage_roles')}</p>
          </div>

          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            {t('new_role')}
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="flex justify-end">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder={t('search_by_name')}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('role_name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('description')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('users')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('creation_date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && roles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                      {t('loading')}
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                      {t('no_roles_found')}
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <FontAwesomeIcon icon={faCrown} className="text-blue-600 text-sm" />
                          </div>
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{role.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {role.users} {t('users')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {role.created_at
                          ? new Date(role.created_at).toLocaleDateString(t('locale') || 'fr-FR')
                          : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            role.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {role.is_active ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(role)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                            title={t('edit')}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(role)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title={t('delete')}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.last_page > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.last_page}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {/* Modales */}
        <RoleModal
          show={showModal}
          onClose={handleCloseModal}
          initialData={selectedRole}
          onSave={handleSave}
        />

        <DeleteModal />
      </div>
    </ErrorBoundary>
  );
};

export default RolesTable;