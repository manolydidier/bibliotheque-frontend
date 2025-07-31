import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faEdit, faCopy, faTrashAlt, faPlus } from '@fortawesome/free-solid-svg-icons';
import RoleModal from './RoleModal';

const RolesTable = () => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  
  const roles = [
    {
      id: 1,
      name: 'Administrateur',
      description: 'Accès complet au système',
      users: 3,
      created: '15/02/2023'
    },
    // Plus de rôles...
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('roles_management')}</h2>
          <p className="text-gray-500 text-sm">{t('create_manage_roles')}</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center whitespace-nowrap"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          {t('new_role')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('role_name')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('description')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('creation_date')}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                        <FontAwesomeIcon icon={faCrown} className="text-indigo-600 text-sm" />
                      </div>
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {role.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {role.users} {t('users')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {role.created}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-50">
                        <FontAwesomeIcon icon={faCopy} />
                      </button>
                      <button className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50">
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RoleModal show={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default RolesTable;