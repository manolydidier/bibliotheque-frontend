import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Pagination from '../../../../component/pagination/Pagination';

import { faUserTag } from '@fortawesome/free-solid-svg-icons';
import UserRoleModal from './UserRoleModal';
import useDeleteUserRole from './useDeleteUserRole';

import { 
  faEdit, faCog, faTrashAlt, 
  faChevronDown, faSearch, faPlus,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import ErrorBoundary from '../../../../component/ErrorBoundary/ErrorBoundary';
import { useDeleteUser } from './DeleteUserModal';
import DeactivateUserModal from './DeactivateUserModal';
import EditRoleModal from './EditRoleModal';
import { useSelector } from 'react-redux';

const UsersTable = () => {
   const isRefresh=useSelector(state => state.library.isReredingListeuser)
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0
  });

  // États pour la gestion des UserRoles
  const [userRoles, setUserRoles] = useState([]);
  const [userRolesLoading, setUserRolesLoading] = useState(false);
  const [showUserRoleModal, setShowUserRoleModal] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);

  // Hook pour la suppression des UserRoles
  const { 
    openDeleteModal: openDeleteUserRoleModal, 
    DeleteModal: DeleteUserRoleModal 
  } = useDeleteUserRole((deletedId) => {
    setUserRoles(prev => prev.filter(ur => ur.id !== deletedId));
  });


  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // États pour contrôler l'affichage des modales
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [fresh, setFresh] = useState(false);
  
  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;
  
  const cancelToken = useRef(null);
  const debounceTimeout = useRef(null);

  // Hook pour gérer la suppression
  const { openDeleteModal, DeleteModal } = useDeleteUser((userId) => {
    setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    
    if (users.length === 1 && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  });

  // Configuration axios
  useEffect(() => {
    axios.defaults.headers.common['Accept'] = 'application/json';
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return () => {
      if (cancelToken.current) {
        cancelToken.current.cancel('Component unmounted');
      }
    };
  }, []);

  const fetchUsers = async (page = 1, search = '') => {
    if (cancelToken.current) {
      cancelToken.current.cancel('New request initiated');
    }
    
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

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      fetchUsers(currentPage, searchTerm);
    }, 300);
    
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [currentPage, searchTerm, isRefresh]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDeleteClick = (user) => {
    openDeleteModal(user);
  };

  // Gestionnaires pour les nouvelles modales
  const handleEditClick = (user) => {
    setSelectedUser(user);
    setShowEditRoleModal(true);
  };

  const handleDeactivateClick = (user) => {
    setSelectedUser(user);
    setShowDeactivateModal(true);
  };

  // Fonction pour fermer les modales
  const closeModals = () => {
    setShowDeactivateModal(false);
    setShowEditRoleModal(false);
    setSelectedUser(null);
  };
  
  const setValueFresh=()=>{
    setFresh(!fresh)
  }
  
  // Callback après modification du rôle
  const handleRoleUpdated = (updatedUser) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      )
    );
    closeModals();
  };

  // Callback après désactivation
  const handleUserDeactivated = (deactivatedUser) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === deactivatedUser.id ? deactivatedUser : user
      )
    );
    closeModals();
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
                  <tr key={user.id} className="hover:bg-gray-50 group">
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
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {/* Bouton Modifier avec tooltip */}
                        <div className="relative group/action">
                          <button 
                            className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition-colors duration-200"
                            onClick={() => handleEditClick(user)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/action:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                              {t('edit_user')}
                            </div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-2 h-2 bg-gray-800 rotate-45"></div>
                          </div>
                        </div>

                        {/* Bouton Paramètres avec tooltip */}
                        <div className="relative group/action">
                          <button 
                            className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-50 transition-colors duration-200"
                            onClick={() => handleDeactivateClick(user)}
                          >
                            <FontAwesomeIcon icon={faCog} />
                          </button>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/action:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                              {t('user_settings')}
                            </div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-2 h-2 bg-gray-800 rotate-45"></div>
                          </div>
                        </div>

                        {/* Bouton Supprimer avec tooltip */}
                        <div className="relative group/action">
                          <button 
                            className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/action:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                              {t('delete_user')}
                            </div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-2 h-2 bg-gray-800 rotate-45"></div>
                          </div>
                        </div>
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
        
        {/* Section UserRoles */}
        {selectedUserForRoles && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">
                {t('roles_for_user', { name: selectedUserForRoles.name })}
              </h3>
              <button
                onClick={() => setShowUserRoleModal(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center hover:bg-blue-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1" />
                {t('assign_role')}
              </button>
            </div>

            {userRolesLoading ? (
              <div className="p-8 text-center">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                {t('loading')}...
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('role')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('assigned_at')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userRoles.map(role => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{role.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(role.pivot.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="relative group/action">
                          <button
                            onClick={() => openDeleteUserRoleModal(role)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/action:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                              {t('delete_role')}
                            </div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-2 h-2 bg-gray-800 rotate-45"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <DeleteModal />
        <DeleteUserRoleModal />
        <UserRoleModal
          show={showUserRoleModal}
          onClose={() => setShowUserRoleModal(false)}
          onSave={(newUserRole) => {
            setUserRoles(prev => [...prev, newUserRole]);
            setShowUserRoleModal(false);
          }}
          userId={selectedUserForRoles?.id}
        />
        
        {/* Modales avec contrôle conditionnel */}
        <DeleteModal />
        
        {showDeactivateModal && selectedUser && (
          <DeactivateUserModal
            user={selectedUser}
            isOpen={showDeactivateModal}
            onClose={closeModals}
            onUserDeactivated={handleUserDeactivated}
            onFresh={setValueFresh}
          />
        )}
        
        {showEditRoleModal && selectedUser && (
          <EditRoleModal
            user={selectedUser}
            isOpen={showEditRoleModal}
            onClose={closeModals}
            onRoleUpdated={handleRoleUpdated}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default UsersTable;