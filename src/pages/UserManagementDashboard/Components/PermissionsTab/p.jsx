// components/permissions/PermissionsTable.jsx (extrait modifié)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faPlus, faTimes, faEye, faEdit, faTrash, faKey, faList, faSpinner } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import AddPermissionForm from './AddPermissionForm';
import SpecialPermissions from './SpecialPermissions';
import PermissionListPage from './PermissionListPage';

const PermissionsTable = () => {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10
  });

  const [filters, setFilters] = useState({
    search: '',
    role_id: '',
    permission_id: ''
  });

  // Configuration Axios
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
  }, []);

  // Charger les données initiales
  useEffect(() => {
    if (modalContent === 'manage-permissions') {
      fetchInitialData();
      fetchRolePermissions();
    }
  }, [modalContent]);

  const fetchRolePermissions = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...filters
      };

      const response = await axios.get('/role-permissions', { params });
      console.log(response);
      
      setRolePermissions(response.data.data.data || []);
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
      setPermissions(permissionsRes.data.data || []);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const togglePermission = async (roleId, permissionId, hasPermission) => {
    try {
      if (hasPermission) {
        // Supprimer la permission
        await axios.delete(`/role-permissions/${roleId}/${permissionId}`);
      } else {
        // Ajouter la permission
        await axios.post('/role-permissions', {
          role_id: roleId,
          permission_id: permissionId
        });
      }
      
      // Recharger les données
      fetchRolePermissions();
    } catch (err) {
      console.error('Error updating permission:', err);
      setError(t('failed_to_update_permission'));
    }
  };

  const handlePermissionAdded = (newPerm) => {
    setPermissions(prev => [newPerm, ...prev]);
    setShowModal(false);
    setModalContent(null);
  };

  const openModal = (content) => {
    setModalContent(content);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
    setError('');
  };

  const renderRolePermissionsTable = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-2xl mr-2" />
          <span>{t('loading')}</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('permission')}
              </th>
              {roles.map(role => (
                <th key={role.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {permissions.map(permission => (
              <tr key={permission.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <FontAwesomeIcon icon={faKey} className="text-blue-600 text-sm" />
                    </div>
                    <div>
                      <div className="font-medium">{permission.name}</div>
                      <div className="text-xs text-gray-500">{permission.resource}.{permission.action}</div>
                    </div>
                  </div>
                </td>
                {roles.map(role => {
                  const hasPermission = rolePermissions.some(rp => 
                    rp.role_id === role.id && rp.permission_id === permission.id
                  );
                  
                  return (
                    <td key={role.id} className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        checked={hasPermission}
                        onChange={() => togglePermission(role.id, permission.id, hasPermission)}
                        title={`${hasPermission ? t('remove') : t('add')} ${permission.name} ${t('from')} ${role.name}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderModalContent = () => {
    switch (modalContent) {
      case 'add-permission':
        return (
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-purple-700 text-white">
              <h3 className="text-lg font-medium">
                {t('add_new_permission')}
              </h3>
              <button onClick={closeModal} className="text-white hover:text-gray-200 transition-colors">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <AddPermissionForm onClose={closeModal} onPermissionAdded={handlePermissionAdded} />
            </div>
          </div>
        );

      case 'manage-permissions':
        return (
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h3 className="text-lg font-medium">
                {t('manage_role_permissions')}
              </h3>
              <button onClick={closeModal} className="text-white hover:text-gray-200 transition-colors">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{t('role_permissions_management')}</h1>
                <p className="text-gray-500">{t('manage_role_permissions_description')}</p>
              </div>
              
              {/* Filtres */}
              <div className="mb-6 bg-gray-100 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('search')}
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      placeholder={t('search_permissions')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('role')}
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={filters.role_id}
                      onChange={(e) => setFilters(prev => ({ ...prev, role_id: e.target.value }))}
                    >
                      <option value="">{t('all_roles')}</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={fetchRolePermissions}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {t('apply_filters')}
                    </button>
                  </div>
                </div>
              </div>

              {renderRolePermissionsTable()}
            </div>
          </div>
        );

      case 'permission-list':
        return (
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h3 className="text-lg font-medium">
                {t('all_permissions')}
              </h3>
              <button onClick={closeModal} className="text-white hover:text-gray-200 transition-colors">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="h-[calc(90vh-60px)] overflow-y-auto">
              <PermissionListPage onClose={closeModal} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

    return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-medium text-gray-800 text-lg flex items-center">
            <FontAwesomeIcon icon={faKey} className="mr-2 text-blue-600" />
            {t('permissions')}
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openModal('permission-list')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm transition-colors"
            >
              <FontAwesomeIcon icon={faList} />
              {t('view_all_permissions')}
            </button>
            <button
              onClick={() => openModal('manage-permissions')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm transition-colors"
            >
              <FontAwesomeIcon icon={faUsers} />
              {t('manage_role_permissions')}
            </button>
            <button
              onClick={() => openModal('add-permission')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} />
              {t('add_permission')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('read')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('create')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('edit')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('delete')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('all')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <FontAwesomeIcon icon={permission.icon} className="text-blue-600 text-sm" />
                      </div>
                      {permission.table}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      checked={permission.read}
                      onChange={() => togglePermission(permission.id, 'read')}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      checked={permission.create}
                      onChange={() => togglePermission(permission.id, 'create')}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      checked={permission.edit}
                      onChange={() => togglePermission(permission.id, 'edit')}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      checked={permission.delete}
                      onChange={() => togglePermission(permission.id, 'delete')}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      checked={permission.all}
                      onChange={() => togglePermission(permission.id, 'all')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SpecialPermissions />
      </div>

      {/* Modale principale */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          {renderModalContent()}
        </div>
      )}
    </>
  );

};

export default PermissionsTable;