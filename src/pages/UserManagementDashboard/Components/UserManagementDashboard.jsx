import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Header from './Header';
import TabsNavigation from './TabsNavigation';
import ProfileTab from './ProfileTab/ProfilTab';
import UsersTable from './UsersTab/UsersTable';
import RolesTable from './RolesTab/RolesTable';
import ActivityLog from './ActivityTab/ActivityLog';
import PermissionsTable from './PermissionsTab/PermissionsTable';
import EditProfileTab from './EditProfile/EditProfileTab';
import UserRoleForm from './UserRole/UserRoleForm';
import UserRolesDisplay from './UserRole/UserRolesDisplay ';




const UserManagementDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: t('my_profile'), icon: 'user' },
    { id: 'EditProfil', label: t('edit_profil'), icon: 'history' },
    { id: 'users', label: t('user_list'), icon: 'users' },
    { id: 'userrole', label: t('user_roles'), icon: 'history' },
    { id: 'roles', label: t('roles'), icon: 'user-tag' },

    { id: 'permissions', label: t('permissions'), icon: 'key' },
    { id: 'activity', label: t('activity'), icon: 'history' },
  ];

  const token = localStorage.getItem('tokenGuard');
    if (!token) {
        window.location.href = '/auth';
  }

  return (
    <div className="bg-white w-full font-sans antialiased mt-10">
      <div className="container mx-auto px-4 py-6">
        <Header />
        <TabsNavigation tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'users' && <UsersTable />}
          {activeTab === 'permissions' && <PermissionsTable />}
          {activeTab === 'roles' && <RolesTable />}
          {activeTab === 'activity' && <ActivityLog />}
          {activeTab === 'EditProfil' && <EditProfileTab />}
          {activeTab === 'userrole' && <UserRolesDisplay  />}
        </div>
      </div>
   
    </div>
  );
};

export default UserManagementDashboard;