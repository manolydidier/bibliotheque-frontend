// components/permissions/PermissionsTable.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faPlus, faTimes, faEye, faEdit, faTrash, faKey } from '@fortawesome/free-solid-svg-icons';
import AddPermissionForm from './AddPermissionForm';
import PermissionList from './PermissionList';
import SpecialPermissions from './SpecialPermissions';

// Exemple de données
const initialPermissions = [
  {
    id: 1,
    table: 'Utilisateurs',
    icon: faUsers,
    read: true,
    create: true,
    edit: true,
    delete: false,
    all: false,
  },
  {
    id: 2,
    table: 'Articles',
    icon: faEdit,
    read: true,
    create: false,
    edit: false,
    delete: false,
    all: false,
  },
  {
    id: 3,
    table: 'Paramètres',
    icon: faKey,
    read: true,
    create: false,
    edit: false,
    delete: false,
    all: false,
  },
];

const initialPermissionList = [
  {
    id: 1,
    name: 'Manage Users',
    description: 'Permet de gérer les utilisateurs',
    resource: 'users',
    action: 'manage',
    created_at: '2025-04-05T10:30:00Z',
  },
  {
    id: 2,
    name: 'View Reports',
    description: 'Accès en lecture aux rapports',
    resource: 'reports',
    action: 'read',
    created_at: '2025-04-04T15:20:00Z',
  },
];

const PermissionsTable = () => {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState(initialPermissions);
  const [permissionList, setPermissionList] = useState(initialPermissionList);

  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null); // 'add-permission' ou 'manage-permissions'

  const togglePermission = (id, field) => {
    setPermissions((prev) =>
      prev.map((perm) => {
        if (perm.id !== id) return perm;
        if (field === 'all') {
          return {
            ...perm,
            read: !perm.all,
            create: !perm.all,
            edit: !perm.all,
            delete: !perm.all,
            all: !perm.all,
          };
        }
        const updated = { ...perm, [field]: !perm[field] };
        updated.all = updated.read && updated.create && updated.edit && updated.delete;
        return updated;
      })
    );
  };

  const handlePermissionAdded = (newPerm) => {
    setPermissionList([newPerm, ...permissionList]);
    setShowModal(false);
  };

  const handleDeletePermission = (id) => {
    if (window.confirm(t('confirm_delete') || 'Confirmer la suppression ?')) {
      setPermissionList(prev => prev.filter(p => p.id !== id));
    }
  };

  const openAddPermissionModal = () => {
    setModalContent('add-permission');
    setShowModal(true);
  };

  const openManagePermissionsModal = () => {
    setModalContent('manage-permissions');
    setShowModal(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-medium text-gray-800 text-lg flex items-center">
            <FontAwesomeIcon icon={faKey} className="mr-2 text-blue-600" />
            {t('permissions')}
          </h3>
          <div className="flex gap-2">
            {/* Bouton "Gérer permissions rôles" */}
            <button
              onClick={openManagePermissionsModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm transition-colors"
            >
              <FontAwesomeIcon icon={faUsers} />
              {t('manage_role_permissions')}
            </button>
            {/* Bouton "Ajouter une permission" */}
            <button
              onClick={openAddPermissionModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm transition-colors"
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
                      <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                        <FontAwesomeIcon icon={permission.icon} className="text-indigo-600 text-sm" />
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

      {/* Modale pour ajouter une permission */}
      {showModal && modalContent === 'add-permission' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
              <h3 className="text-lg font-medium">
                {t('add_new_permission')}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <AddPermissionForm
                onClose={() => setShowModal(false)}
                onPermissionAdded={handlePermissionAdded}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modale pour gérer les permissions des rôles */}
      {showModal && modalContent === 'manage-permissions' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <h3 className="text-lg font-medium">
                {t('manage_role_permissions')}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <h4 className="text-md font-medium mb-4 text-gray-700">{t('grant_permission_to_role')}</h4>
              <PermissionList
                permissions={permissionList}
                onDelete={handleDeletePermission}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PermissionsTable;