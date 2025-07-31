import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCog, faTrashAlt, faChevronDown, faSearch, faPlus } from '@fortawesome/free-solid-svg-icons';

const UsersTable = () => {
  const { t } = useTranslation();
  
  const users = [
    {
      id: 1,
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      role: 'Administrateur',
      status: 'Actif',
      lastActivity: 'Aujourd\'hui, 09:30',
      image: 'https://randomuser.me/api/portraits/men/32.jpg'
    },
    // Plus d'utilisateurs...
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('user_list')}</h2>
          <p className="text-gray-500 text-sm">{t('manage_user_accounts')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder={t('search_user')}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-400" />
          </div>
          
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center whitespace-nowrap">
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            {t('new_user')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>{t('user')}</span>
                    <FontAwesomeIcon icon={faChevronDown} className="ml-1 text-gray-400 hover:text-gray-600" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>{t('role')}</span>
                    <FontAwesomeIcon icon={faChevronDown} className="ml-1 text-gray-400 hover:text-gray-600" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>{t('status')}</span>
                    <FontAwesomeIcon icon={faChevronDown} className="ml-1 text-gray-400 hover:text-gray-600" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>{t('last_activity')}</span>
                    <FontAwesomeIcon icon={faChevronDown} className="ml-1 text-gray-400 hover:text-gray-600" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full" src={user.image} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {user.lastActivity}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-50">
                        <FontAwesomeIcon icon={faCog} />
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
    </div>
  );
};

export default UsersTable;