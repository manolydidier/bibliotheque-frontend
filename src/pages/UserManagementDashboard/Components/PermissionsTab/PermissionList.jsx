import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faSyncAlt,
  faSpinner,
  faExclamationCircle,
  faEdit,
  faTrashAlt,
  faShieldAlt,
  faPlus,
  faTimes,
  faCheck,
  faChevronDown,
  faUser,
  faCalendar,
  faFilter,faUserShield ,faKey 
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';
import Pagination from '../../../../component/pagination/Pagination';
import { useSelector } from 'react-redux';
import { toast } from '../../../../component/toast/toast';

const RolePermissionsManager = () => {
  const { t } = useTranslation();
  const isRefresh = useSelector((state) => state.library.isReredingListeuser);

  // États principaux
  const [rolePermissions, setRolePermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    search: '',
    role_id: '',
    permission_id: '',
    granted_by: '',
    sort: 'granted_at',
    order: 'desc'
  });
  
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });

  // États pour les modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  // États pour le formulaire
  const [formData, setFormData] = useState({
    role_id: '',
    permission_id: '',
    granted_by: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const API_BASE_STORAGE = import.meta.env.VITE_API_STORAGE_URL;

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
  }, []);

  // Charger les données
  useEffect(() => {
    fetchData();
  }, [filters, pagination.current_page, isRefresh]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...filters
      };

      const response = await axios.get('/role-permissions', { params });
      
      console.log(response);
      
      setRolePermissions(response.data.data || []);
      setPagination(response.data.pagination || {
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 10
      });
   
      
    } catch (err) {
      setError(t('failed_to_load_data'));
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        axios.get('/roles'),
        axios.get('/permissions'),
        axios.get('/users')
      ]);

      setRoles(rolesRes.data.data || []);
      setPermissions(permissionsRes.data.data.data || []);
      setUsers(usersRes.data.users || []);
    
      
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  // Gérer les changements de filtres
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      search: '',
      role_id: '',
      permission_id: '',
      granted_by: '',
      sort: 'granted_at',
      order: 'desc'
    });
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  // Gérer les changements du formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      role_id: '',
      permission_id: '',
      granted_by: ''
    });
    setFormError('');
  };

  // Ajouter une association rôle-permission
  const handleAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const response = await axios.post('/role-permissions', formData);
      console.log(response);
      
      
      if (response.data.status === 'success') {
        setShowAddModal(false);
        resetForm();
        fetchData();
        toast.success('Ajout avec success')
      } else {
        throw new Error(response.data.message || 'Failed to create role permission');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || t('error_creating_role_permission'));
    } finally {
      setFormLoading(false);
    }
  };

  // Supprimer une association
  const handleDelete = (item) => {
    setCurrentItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!currentItem) return;

    setFormLoading(true);
    
    try {
      await axios.delete(`/role-permissions/${currentItem.id}`);
      setShowDeleteModal(false);
      setCurrentItem(null);
      fetchData();
    } catch (err) {
      alert(t('error_deleting_role_permission'));
    } finally {
      setFormLoading(false);
    }
  };

  // Formatage de la date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Modal de filtres
  const FiltersModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} />
            {t('advanced_filters')}
          </h3>
          <button onClick={() => setShowFiltersModal(false)} className="text-gray-500">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('role')}
              </label>
              <select
                value={filters.role_id}
                onChange={(e) => handleFilterChange('role_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('all_roles')}</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('permission')}
              </label>
              <select
                value={filters.permission_id}
                onChange={(e) => handleFilterChange('permission_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('all_permissions')}</option>
                {permissions.map(permission => (
                  <option key={permission.id} value={permission.id}>{permission.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('granted_by')}
              </label>
              <select
                value={filters.granted_by}
                onChange={(e) => handleFilterChange('granted_by', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('all_users')}</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('sort_by')}
              </label>
              <div className="flex gap-2">
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="granted_at">{t('granted_at')}</option>
                  <option value="created_at">{t('created_at')}</option>
                  <option value="updated_at">{t('updated_at')}</option>
                </select>
                <select
                  value={filters.order}
                  onChange={(e) => handleFilterChange('order', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">{t('desc')}</option>
                  <option value="asc">{t('asc')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={resetFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            {t('reset')}
          </button>
          <button
            onClick={() => setShowFiltersModal(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('apply_filters')}
          </button>
        </div>
      </div>
    </div>
  );

  // Modal d'ajout
  const AddModal = () => (
   <div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
  role="dialog"
  aria-modal="true"
>
  <div
   
    className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden"
  >
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="flex items-center space-x-3">
        <span className="bg-white bg-opacity-20 p-2 rounded-full">
          <FontAwesomeIcon icon={faShieldAlt} className="w-5 h-5" />
        </span>
        <h3 className="text-xl font-semibold">{t('assign_permission_to_role')}</h3>
      </div>
      <button
        onClick={() => setShowAddModal(false)}
        aria-label={t('close')}
        className="text-white hover:text-gray-200"
      >
        <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
      </button>
    </div>

    {/* Form */}
    <form
      onSubmit={handleSubmitAdd}
      className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]"
    >
      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-2">
          {t('role')} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faUserShield} className="w-5 h-5 text-gray-400" />
          </div>
          <select
            name="role_id"
            value={formData.role_id}
            onChange={handleInputChange}
            required
            disabled={formLoading}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
          >
            <option value="">{t('select_role')}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Permission */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-2">
          {t('permission')} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faKey} className="w-5 h-5 text-gray-400" />
          </div>
          <select
            name="permission_id"
            value={formData.permission_id}
            onChange={handleInputChange}
            required
            disabled={formLoading}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
          >
            <option value="">{t('select_permission')}</option>
            {permissions.map((permission) => (
              <option key={permission.id} value={permission.id}>
                {permission.name} ({permission.resource}:{permission.action})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Granted By */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-2">
          {t('granted_by')}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-gray-400" />
          </div>
          <select
            name="granted_by"
            value={formData.granted_by}
            onChange={handleInputChange}
            disabled={formLoading}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
          >
            <option value="">{t('system_default')}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {formError && (
        <p className="text-sm text-red-600 flex items-center">
          <FontAwesomeIcon icon={faExclamationCircle} className="w-4 h-4 mr-2" />
          {formError}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowAddModal(false)}
          disabled={formLoading}
          className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-150"
        >
          <FontAwesomeIcon icon={faTimes} className="w-4 h-4 mr-2" />
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={formLoading || !formData.role_id || !formData.permission_id}
          className={`flex items-center px-5 py-2.5 rounded-lg font-medium text-white transition-all duration-150 shadow-sm ${
            formLoading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {formLoading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 mr-2 animate-spin" />
              {t('creating')}
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCheck} className="w-4 h-4 mr-2" />
              {t('assign')}
            </>
          )}
        </button>
      </div>
    </form>
  </div>
</div>

  );

  // Modal de suppression
  const DeleteModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-red-600">
            {t('remove_permission_from_role')}
          </h3>
        </div>
        <div className="p-4">
          <p className="mb-4">
            {t('confirm_remove_permission')} <strong>{currentItem?.permission?.name}</strong> {t('from_role')} <strong>{currentItem?.role?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={formLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={formLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {formLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  {t('removing')}...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrashAlt} />
                  {t('remove')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-7xl w-full">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex gap-2 w-full md:w-auto justify-end justify-items-end  m-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder={t('search_roles_permissions')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            
            <button
              onClick={() => setShowFiltersModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              title={t('advanced_filters')}
            >
              <FontAwesomeIcon icon={faFilter} />
            </button>
            
            <button
              onClick={() => {
                resetFilters();
                fetchData();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
            </button>
            
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              {t('assign_permission')}
            </button>
          </div>
        </div>

        {/* Filtres actifs */}
        {(filters.role_id || filters.permission_id || filters.granted_by) && (
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <FontAwesomeIcon icon={faFilter} />
              <span>{t('active_filters')}:</span>
              {filters.role_id && (
                <span className="bg-blue-100 px-2 py-1 rounded">
                  {t('role')}: {roles.find(r => r.id == filters.role_id)?.name}
                </span>
              )}
              {filters.permission_id && (
                <span className="bg-blue-100 px-2 py-1 rounded">
                  {t('permission')}: {permissions.find(p => p.id == filters.permission_id)?.name}
                </span>
              )}
              {filters.granted_by && (
                <span className="bg-blue-100 px-2 py-1 rounded">
                  {t('granted_by')}: {users.find(u => u.id == filters.granted_by)?.name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('permission')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('resource_action')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('granted_by')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('granted_at')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rolePermissions.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-blue-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.role?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.role?.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.permission?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.permission?.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                          {item.permission?.resource}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.permission?.action === 'create' ? 'bg-green-100 text-green-800' :
                          item.permission?.action === 'read' ? 'bg-blue-100 text-blue-800' :
                          item.permission?.action === 'update' ? 'bg-yellow-100 text-yellow-800' :
                          item.permission?.action === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.permission?.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.granted_by ? (
                        <div className="flex items-center">
                          <img
                            src={item.grantedBy?.avatar_url ? `${API_BASE_STORAGE}/${item.grantedBy.avatar_url}` : 'https://www.w3schools.com/howto/img_avatar2.png'}
                            alt="Avatar"
                            className="w-6 h-6 rounded-full object-cover mr-2"
                          />
                          <span className="text-sm text-gray-900">{item.grantedBy?.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">{t('system')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faCalendar} className="text-gray-400 mr-1" />
                        {formatDate(item.granted_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title={t('remove')}
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rolePermissions.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              <FontAwesomeIcon icon={faShieldAlt} className="text-4xl text-gray-300 mb-2" />
              <div>{filters.search ? t('no_role_permissions_match_search') : t('no_role_permissions_found')}</div>
            </div>
          )}

          {pagination.last_page > 1 && (
            <div className="px-4 py-3 border-t">
              <Pagination
                currentPage={pagination.current_page}
                totalPages={pagination.last_page}
                onPageChange={(page) => setPagination({ ...pagination, current_page: page })}
              />
            </div>
          )}
        </div>

        {/* Modales */}
        {showFiltersModal && <FiltersModal />}
        {showAddModal && <AddModal />}
        {showDeleteModal && currentItem && <DeleteModal />}
      </div>
    </ErrorBoundary>
  );
};

export default RolePermissionsManager;