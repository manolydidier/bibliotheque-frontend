import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Header from './Header';
import TabsNavigation from './TabsNavigation';

// Tabs content
import ProfileTab from './ProfileTab/ProfilTab';
import UsersTable from './UsersTab/UsersTable';
import RolesTable from './RolesTab/RolesTable';
import ActivityLog from './ActivityTab/ActivityLog';
import PermissionsTable from './PermissionsTab/PermissionsTable';
import EditProfileTab from './EditProfile/EditProfileTab';
import UserRolesDisplay from './UserRole/UserRolesDisplay'; // (corrigé sans espace)
import ActivityLogAll from './ActivityTab/ActivityLogAll';

const UserManagementDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  // Icônes spécifiques par onglet (clé utilisée par TabsNavigation)
  const tabs = [
    { id: 'profile',     label: t('my_profile'),   icon: 'user-circle' },
    { id: 'EditProfil',  label: t('edit_profil'),  icon: 'user-pen' },
    { id: 'users',       label: t('user_list'),    icon: 'users' },
    { id: 'userrole',    label: t('user_roles'),   icon: 'user-shield' },
    { id: 'roles',       label: t('roles'),        icon: 'user-tag' },
    { id: 'permissions', label: t('permissions'),  icon: 'key' },
    { id: 'activity',    label: t('activity'),     icon: 'clock-rotate-left' },
    { id: 'activityall', label: t('activity_all'), icon: 'list-ul' },
  ];

  // Garde basique: redirige si pas de token (tokenGuard)
  const token = localStorage.getItem('tokenGuard');
  if (!token) {
    navigate('/auth');
    window.location.href = '/auth';
  }

  return (
    <div className="bg-white w-full font-sans antialiased mt-10">
      <div className="container mx-auto px-4 py-6">
        <Header />

        <TabsNavigation
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
          {activeTab === 'profile'     && <ProfileTab />}
          {activeTab === 'EditProfil'  && <EditProfileTab />}
          {activeTab === 'users'       && <UsersTable />}
          {activeTab === 'userrole'    && <UserRolesDisplay />}
          {activeTab === 'roles'       && <RolesTable />}
          {activeTab === 'permissions' && <PermissionsTable />}
          {activeTab === 'activity'    && <ActivityLog />}
          {activeTab === 'activityall' && <ActivityLogAll />}
        </div>
      </div>
    </div>
  );
};

export default UserManagementDashboard;
