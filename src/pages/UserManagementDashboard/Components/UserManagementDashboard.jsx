import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Header from './Header.jsx';
import TabsNavigation from './TabsNavigation.jsx';

// Tabs content
import ProfileTab from './ProfileTab/ProfilTab.jsx';
import EditProfileTab from './EditProfile/EditProfileTab.jsx';
import UsersTable from './UsersTab/UsersTable.jsx';
import UserRolesDisplay from './UserRole/UserRolesDisplay.jsx';
import RolesTable from './RolesTab/RolesTable.jsx';
import PermissionsTable from './PermissionsTab/PermissionsTable.jsx';
import ActivityLogAll from './ActivityTab/ActivityLogAll.jsx';

/* ======================= Constantes ======================= */
const ALL_TABS = [
  'profile',
  'EditProfil',
  'users',
  'userrole',
  'roles',
  'permissions',
  'activityall',
];

/* ======================= Helpers ========================== */
const getTokenGuard = () => {
  try {
    return (
      (typeof sessionStorage !== 'undefined' &&
        (sessionStorage.getItem('tokenGuard') || sessionStorage.getItem('access_token'))) ||
      (typeof localStorage !== 'undefined' &&
        (localStorage.getItem('tokenGuard') || localStorage.getItem('access_token'))) ||
      null
    );
  } catch { return null; }
};

// Normalise rôles/permissions en liste de noms (minuscule)
const asNameList = (input) => {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  return arr
    .map((x) => {
      if (x == null) return null;
      if (typeof x === 'string') return x;
      if (typeof x === 'number') return String(x);
      if (typeof x === 'object') {
        return (
          x.name ??
          x.slug ??
          x.code ??
          x.title ??
          x.label ??
          x.key ??
          x.permission ??
          x.role ??
          null
        );
      }
      return String(x);
    })
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());
};

const hasSome = (arr, ...keys) => {
  const set = new Set(asNameList(arr));
  return keys.map((k) => String(k).toLowerCase()).some((k) => set.has(k));
};

// Règles d’accès par onglet
const canAccessTab = (tabId, roles = [], permissions = []) => {
  const roleNames = asNameList(roles);
  const permNames = asNameList(permissions);

  const isAdmin =
    hasSome(roleNames, 'admin', 'superadmin', 'owner', 'root') ||
    hasSome(permNames, 'admin', 'superadmin', 'owner', 'root');

  if (isAdmin) return true;

  switch (tabId) {
    case 'users':
      return hasSome(permNames, 'users.view', 'users:list', 'user.read', 'users.read', 'manage.users');
    case 'userrole':
      return hasSome(
        permNames,
        'user_roles.view',
        'user.role.view',
        'userroles.view',
        'roles.assign',
        'user.role.read'
      );
    case 'roles':
      return hasSome(permNames, 'roles.view', 'role.read', 'roles.read', 'manage.roles');
    case 'permissions':
      return hasSome(permNames, 'permissions.view', 'permission.read', 'permissions.read', 'manage.permissions');
    case 'activityall':
      return hasSome(permNames, 'activity.view_all', 'activities.read_all', 'audit.read', 'audit.view');
    case 'profile':
    case 'EditProfil':
    default:
      return true;
  }
};

/* ======================= Composant principal ======================= */
const UserManagementDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Auth depuis Redux (adapte si ton store diffère)
  const authSlice =
    useSelector((s) => s.library?.auth) ||
    useSelector((s) => s.auth) ||
    {};
  const { isAuthenticated, user } = authSlice;

  // Garde token (redirige si inexistant)
  useEffect(() => {
    const token = getTokenGuard();
    if (!token) {
      navigate('/auth', { replace: true });
      window.location.href = '/auth';
    }
  }, [navigate]);

  const roleNames = useMemo(() => asNameList(user?.roles || user?.roleNames || user?.role || []), [user]);
  const permissionNames = useMemo(
    () => asNameList(user?.permissions || user?.permissionNames || user?.permission || []),
    [user]
  );

  // Onglet initial depuis l’URL
  const initialTab = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search);
      const q = sp.get('tab');
      return ALL_TABS.includes(q) ? q : 'profile';
    } catch { return 'profile'; }
  }, [location.search]);

  const [activeTab, setActiveTab] = useState(initialTab);

  // Liste des onglets ACCESSIBLES (on CACHE les autres)
  const accessibleTabs = useMemo(() => {
    return ALL_TABS.filter((tabId) => canAccessTab(tabId, roleNames, permissionNames));
  }, [roleNames, permissionNames]);

  // Si l’URL pointe vers un onglet non accessible → on bascule vers le 1er autorisé
  useEffect(() => {
    if (!accessibleTabs.includes(activeTab)) {
      const fallback = accessibleTabs[0] || 'profile';
      if (activeTab !== fallback) {
        const sp = new URLSearchParams(location.search);
        sp.set('tab', fallback);
        setActiveTab(fallback);
        navigate(`${location.pathname}?${sp.toString()}`, { replace: true });
      }
    }
  }, [accessibleTabs, activeTab, navigate, location.pathname, location.search]);

  // Sync sur changement URL (back/forward)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(location.search);
      const q = sp.get('tab');
      const next = ALL_TABS.includes(q) ? q : 'profile';
      setActiveTab(accessibleTabs.includes(next) ? next : (accessibleTabs[0] || 'profile'));
    } catch {
      setActiveTab(accessibleTabs[0] || 'profile');
    }
  }, [location.search, accessibleTabs]);

  // Définition des tabs (affiche UNIQUEMENT ceux accessibles)
  const tabs = useMemo(() => ([
    { id: 'profile',     label: t('my_profile',   'Mon profil'),         icon: 'user-circle' },
    { id: 'EditProfil',  label: t('edit_profil',  'Modifier le profil'),  icon: 'user-pen' },
    { id: 'users',       label: t('user_list',    'Utilisateurs'),        icon: 'users' },
    { id: 'userrole',    label: t('user_roles',   'Rôles utilisateur'),   icon: 'user-shield' },
    { id: 'roles',       label: t('roles',        'Rôles'),               icon: 'user-tag' },
    { id: 'permissions', label: t('permissions',  'Permissions'),         icon: 'key' },
    { id: 'activityall', label: t('activity_all', 'Activité (toutes)'),   icon: 'list-ul' },
  ].filter(tab => accessibleTabs.includes(tab.id))), [t, accessibleTabs]);

  // setActiveTab + mise à jour URL (seulement si l’onglet demandé est accessible)
  const setActiveTabAndUrl = useCallback(
    (id) => {
      if (!accessibleTabs.includes(id)) return;
      setActiveTab(id);
      const sp = new URLSearchParams(location.search);
      sp.set('tab', id);
      navigate(`${location.pathname}?${sp.toString()}`, { replace: false });
    },
    [navigate, location.pathname, location.search, accessibleTabs]
  );

  return (
    <div className="bg-white w-full font-sans antialiased mt-10">
      <div className="container mx-auto px-4 py-6">
        <Header />

        <TabsNavigation
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTabAndUrl}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
          {/* Comme on ne rend que des onglets accessibles, on peut afficher directement */}
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
