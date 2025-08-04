import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../../../../component/pagination/Pagination';
import { 
  faEdit, faCog, faTrashAlt, 
  faChevronDown, faSearch, faPlus,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';

const UsersTable = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;
  
  const cancelToken = useRef(null);
  const debounceTimeout = useRef(null);

  // Configuration axios
  useEffect(() => {
    axios.defaults.headers.common['Accept'] = 'application/json';
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return () => {
      // Annule la requête en cours si le composant est démonté
      if (cancelToken.current) {
        cancelToken.current.cancel('Component unmounted');
      }
    };
  }, []);

  const fetchUsers = async (page = 1, search = '') => {
    // Annule la requête précédente s'il y en a une
    if (cancelToken.current) {
      cancelToken.current.cancel('New request initiated');
    }
    
    // Crée un nouveau token d'annulation
    cancelToken.current = axios.CancelToken.source();
    
    setLoading(true);
    try {
      const response = await axios.get(`users`, {
        params: {
          page,
          search
        },
        cancelToken: cancelToken.current.token
      });
      
      setUsers(response.data.users || []);
      setPagination(response.data.pagination || {
        current_page: 1,
        last_page: 1,
        total: 0
      });
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Error fetching users:', error);
        setUsers([]);
        setPagination({
          current_page: 1,
          last_page: 1,
          total: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounce avancé avec annulation des requêtes
  useEffect(() => {
    // Efface le timeout précédent
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    // Configure un nouveau timeout
    debounceTimeout.current = setTimeout(() => {
      fetchUsers(currentPage, searchTerm);
    }, 300); // 300ms de délai
    
    // Nettoyage
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [currentPage, searchTerm]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1); // Reset à la première page lors d'une nouvelle recherche
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-500" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                value={searchTerm}
                onChange={handleSearch}
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-400" />
            </div>
            
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center whitespace-nowrap">
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
                    {t('user')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('role')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('last_activity')}
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
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={
                              user.avatar_url
                                ? `${API_BASE_STORAGE}/storage/${user.avatar_url}`
                                : 'https://www.w3schools.com/howto/img_avatar2.png'
                            }
                            alt="Avatar"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'Actif' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_activity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50">
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

          {users.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              {t('no_users_found')}
            </div>
          )}

          {!loading && pagination.last_page > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.last_page}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default UsersTable;