import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import Header from './Header';
import TabsNavigation from './TabsNavigation';

// Tabs content
import ProfileTab from './ProfileTab/ProfilTab';
import UsersTable from './UsersTab/UsersTable';
import RolesTable from './RolesTab/RolesTable';
import ActivityLog from './ActivityTab/ActivityLog';
import PermissionsTable from './PermissionsTab/PermissionsTable';
import EditProfileTab from './EditProfile/EditProfileTab';
import UserRolesDisplay from './UserRole/UserRolesDisplay';
import ActivityLogAll from './ActivityTab/ActivityLogAll';

const ALLOWED_TABS = [
  'profile',
  'EditProfil',
  'users',
  'userrole',
  'roles',
  'permissions',
  'activity',
  'activityall',
];

const UserManagementDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // --- Lecture de l’onglet depuis l’URL (?tab=...) au premier rendu
  const initialTab = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search);
      const q = sp.get('tab');
      return ALLOWED_TABS.includes(q) ? q : 'profile';
    } catch {
      return 'profile';
    }
  }, [location.search]);

  const [activeTab, setActiveTab] = useState(initialTab);

  // --- Quand l’URL change (back/forward, lien direct), on resynchronise l’état
  useEffect(() => {
    try {
      const sp = new URLSearchParams(location.search);
      const q = sp.get('tab');
      setActiveTab(ALLOWED_TABS.includes(q) ? q : 'profile');
    } catch {
      setActiveTab('profile');
    }
  }, [location.search]);

  // Icônes spécifiques par onglet (clé utilisée par TabsNavigation)
  const tabs = useMemo(() => ([
    { id: 'profile',     label: t('my_profile',     'Mon profil'),        icon: 'user-circle' },
    { id: 'EditProfil',  label: t('edit_profil',    'Modifier le profil'), icon: 'user-pen' },
    { id: 'users',       label: t('user_list',      'Utilisateurs'),       icon: 'users' },
    { id: 'userrole',    label: t('user_roles',     'Rôles utilisateur'),  icon: 'user-shield' },
    { id: 'roles',       label: t('roles',          'Rôles'),              icon: 'user-tag' },
    { id: 'permissions', label: t('permissions',    'Permissions'),        icon: 'key' },
  
    { id: 'activityall', label: t('activity_all',   'Activité (toutes)'),  icon: 'list-ul' },
  ]), [t]);

  // --- setActiveTab qui met AUSSI à jour l’URL (exacte) ?tab=<id>
  const setActiveTabAndUrl = (id) => {
    if (!ALLOWED_TABS.includes(id)) return;

    // met à jour l’état pour un retour visuel immédiat
    setActiveTab(id);

    // met à jour l’URL avec un matching EXACT sur ?tab=
    const sp = new URLSearchParams(location.search);
    sp.set('tab', id);

    // on conserve le pathname courant et on remplace juste la query
    navigate(`${location.pathname}?${sp.toString()}`, { replace: false });
  };

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
          setActiveTab={setActiveTabAndUrl} // ← met à jour l’état + l’URL
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
          {activeTab === 'profile'     && <ProfileTab />}
          {activeTab === 'EditProfil'  && <EditProfileTab />}
          {activeTab === 'users'       && <UsersTable />}
          {activeTab === 'userrole'    && <UserRolesDisplay />}
          {activeTab === 'roles'       && <RolesTable />}
          {activeTab === 'permissions' && <PermissionsTable />}
          {activeTab === 'activityall' && <ActivityLogAll />}
        </div>
      </div>
    </div>
  );
};

export default UserManagementDashboard;
