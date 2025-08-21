// components/permissions/PermissionListPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEdit,
  faTrashAlt,
  faSearch,
  faSpinner,
  faKey,
  faPlus,
  faFilter,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import Pagination from '../../../../component/pagination/Pagination';
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';
import { useDeletePermission } from './useDeletePermission';
import AddPermissionForm from './AddPermissionForm';

const PermissionListPage = ({  }) => {
  const { t } = useTranslation();

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    resource: '',
    action: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10
  });
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const cancelToken = useRef(null);
  const debounceTimeout = useRef(null);

  // Configuration Axios
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
    
    return () => {
      delete axios.defaults.headers.common['Authorization'];
    };
  }, []);

  // Utilisation du hook de suppression
  const { openDeleteModal, DeleteModal } = useDeletePermission((deletedPermission) => {
    setPermissions(prev => prev.filter(p => p.id !== deletedPermission.id));
    if (permissions.length === 1 && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  });

  // Fonction pour charger les permissions
  const fetchPermissions = async (page = 1, search = '', filtersData = {}) => {
    if (cancelToken.current) {
      cancelToken.current.cancel('Nouvelle requête lancée');
    }
    cancelToken.current = axios.CancelToken.source();
    setLoading(true);

    try {
      const response = await axios.get('/permissions', {
        params: { 
          page, 
          search,
          ...(filtersData.resource && { resource: filtersData.resource }),
          ...(filtersData.action && { action: filtersData.action })
        },
        cancelToken: cancelToken.current.token,
      });

      // Correction ici - la structure de réponse peut varier
      const permissionsData = response.data.data?.data || response.data.data || [];
      setPermissions(permissionsData);
      setPagination({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        total: response.data.total || 0,
        per_page: response.data.per_page || 10
      });
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Erreur lors du chargement des permissions :', error);
        setPermissions([]);
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
      fetchPermissions(currentPage, searchTerm, filters);
    }, 300);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [currentPage, searchTerm, filters]);

  // Gestion des filtres
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchPermissions(1, searchTerm, filters);
  };

  const clearFilters = () => {
    setFilters({ resource: '', action: '' });
    setSearchTerm('');
    setCurrentPage(1);
    fetchPermissions(1);
  };

  // Gestion du modal de détails
  const handleViewPermission = (permission) => {
    setSelectedPermission(permission);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPermission(null);
  };

  // Fonction pour ouvrir le modal d'ajout
  const handleCreatePermission = () => {
    setShowAddModal(true);
  };

  // Fonction pour fermer le modal d'ajout
  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  // Fonction appelée après l'ajout réussi d'une permission
  const handlePermissionAdded = (newPermission) => {
    fetchPermissions(currentPage, searchTerm, filters);
    setShowAddModal(false);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Bouton de fermeture en haut à droite */}
        
          
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* En-tête */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                  <FontAwesomeIcon icon={faKey} className="mr-2 text-blue-600" />
                  {t('permissions_management')}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {t('manage_permissions_description')}
                </p>
              </div>
              <button 
                onClick={handleCreatePermission}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mt-4 md:mt-0"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                {t('add_permission')}
              </button>
            </div>

            {/* Barre de recherche et filtres */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={t('search_permissions_placeholder')}
                    value={searchTerm}
                    onChange={handleSearch}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center justify-center"
                >
                  <FontAwesomeIcon icon={faFilter} className="mr-2" />
                  {t('filters')}
                </button>
              </div>

              {showFilters && (
                <div className="bg-gray-100 p-4 rounded-md mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('resource')}
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={filters.resource}
                        onChange={(e) => handleFilterChange('resource', e.target.value)}
                        placeholder={t('filter_by_resource')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('action')}
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={filters.action}
                        onChange={(e) => handleFilterChange('action', e.target.value)}
                        placeholder={t('filter_by_action')}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      {t('clear')}
                    </button>
                    <button
                      onClick={applyFilters}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {t('apply_filters')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tableau des permissions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('description')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('resource')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('action')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('created_at')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading && permissions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                          {t('loading')}
                        </td>
                      </tr>
                    ) : permissions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                          {t('no_permissions_found')}
                        </td>
                      </tr>
                    ) : (
                      permissions.map((permission) => (
                        <tr key={permission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {permission.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {permission.description || t('no_description')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {permission.resource}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {permission.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {permission.created_at
                              ? new Date(permission.created_at).toLocaleDateString()
                              : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleViewPermission(permission)}
                                className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                                title={t('view')}
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button
                                onClick={() => console.log('Edit:', permission.id)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                                title={t('edit')}
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(permission)}
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
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.last_page}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de détails de permission */}
        {showDetailModal && selectedPermission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <h3 className="text-lg font-medium">
                  {t('permission_details')}
                </h3>
                <button
                  onClick={handleCloseDetailModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('name')}
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedPermission.name}
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('description')}
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedPermission.description || t('no_description')}
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('resource')}
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedPermission.resource}
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('action')}
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {selectedPermission.action}
                    </span>
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('created_at')}
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {new Date(selectedPermission.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t p-4">
                <button
                  onClick={handleCloseDetailModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'ajout de permission */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <h3 className="text-lg font-medium">
                  {t('add_permission')}
                </h3>
                <button
                  onClick={handleCloseAddModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>

              <div className="p-6">
                <AddPermissionForm 
                  onSuccess={handlePermissionAdded}
                  onCancel={handleCloseAddModal}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de suppression */}
        <DeleteModal />
      </div>
    </ErrorBoundary>
  );
};

export default PermissionListPage;