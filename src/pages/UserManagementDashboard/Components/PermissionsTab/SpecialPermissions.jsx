import React from 'react';
import { useTranslation } from 'react-i18next';

const SpecialPermissions = () => {
  const { t } = useTranslation();
  
  const specialPermissions = [
    {
      id: 'exportData',
      name: t('export_data'),
      description: t('export_data_desc'),
      checked: true
    },
    {
      id: 'importData',
      name: t('import_data'),
      description: t('import_data_desc'),
      checked: false
    },
    {
      id: 'manageUsers',
      name: t('manage_users'),
      description: t('manage_users_desc'),
      checked: true
    },
    {
      id: 'manageRoles',
      name: t('manage_roles'),
      description: t('manage_roles_desc'),
      checked: false
    },
    {
      id: 'systemSettings',
      name: t('system_settings'),
      description: t('system_settings_desc'),
      checked: false
    },
    {
      id: 'backupRestore',
      name: t('backup_restore'),
      description: t('backup_restore_desc'),
      checked: false
    }
  ];

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
        {t('special_permissions')}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {specialPermissions.map(perm => (
          <div key={perm.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
            <input
              type="checkbox"
              id={perm.id}
              className="permission-checkbox mr-3"
              checked={perm.checked}
              onChange={() => {}}
            />
            <label htmlFor={perm.id} className="text-sm text-gray-700">
              <span className="font-medium">{perm.name}</span>
              <p className="text-xs text-gray-500">{perm.description}</p>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecialPermissions;