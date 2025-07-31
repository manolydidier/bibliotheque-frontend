import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
import SpecialPermissions from './SpecialPermissions';

const PermissionsTable = () => {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState([
    {
      id: 1,
      table: 'Utilisateurs',
      icon: faUsers,
      read: true,
      create: true,
      edit: true,
      delete: false,
      all: false
    },
    // Ajoutez d'autres permissions ici...
  ]);

  const togglePermission = (id, field) => {
    setPermissions(prev => 
      prev.map(perm => {
        if (perm.id !== id) return perm;
        
        // Si on clique sur "Tout", mettre à jour toutes les permissions
        if (field === 'all') {
          return {
            ...perm,
            read: !perm.all,
            create: !perm.all,
            edit: !perm.all,
            delete: !perm.all,
            all: !perm.all
          };
        }
        
        // Sinon, mettre à jour la permission spécifique
        const updated = { ...perm, [field]: !perm[field] };
        
        // Vérifier si toutes les permissions sont cochées
        updated.all = updated.read && updated.create && updated.edit && updated.delete;
        
        return updated;
      })
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('table')}
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('read')}
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('create')}
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('edit')}
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('delete')}
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('all')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {permissions.map(permission => (
              <tr key={permission.id} className="hover:bg-gray-50">
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
                    className="permission-checkbox"
                    checked={permission.read}
                    onChange={() => togglePermission(permission.id, 'read')}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <input
                    type="checkbox"
                    className="permission-checkbox"
                    checked={permission.create}
                    onChange={() => togglePermission(permission.id, 'create')}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <input
                    type="checkbox"
                    className="permission-checkbox"
                    checked={permission.edit}
                    onChange={() => togglePermission(permission.id, 'edit')}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <input
                    type="checkbox"
                    className="permission-checkbox"
                    checked={permission.delete}
                    onChange={() => togglePermission(permission.id, 'delete')}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <input
                    type="checkbox"
                    className="permission-checkbox"
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
  );
};

export default PermissionsTable;