// src/pages/UserManagementDashboard/Components/TabsNavigation.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,               // fallback
  faUsers,
  faKey,
  faUserTag,
  faHistory,
  faEdit,
  // Icônes spécifiques demandées
  faUserCircle,
  faUserPen,
  faUserShield,
  faClockRotateLeft,
  faListUl,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

// Map clé → icône FontAwesome
const ICONS = {
  // anciens noms (compat)
  user: faUser,
  users: faUsers,
  key: faKey,
  'user-tag': faUserTag,
  history: faHistory,
  edit: faEdit,

  // nouveaux noms spécifiques
  'user-circle': faUserCircle,
  'user-pen': faUserPen,
  'user-shield': faUserShield,
  'clock-rotate-left': faClockRotateLeft,
  'list-ul': faListUl,
};

const TabsNavigation = ({ tabs, activeTab, setActiveTab }) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const icon = ICONS[tab.icon] || faUser; // fallback si clé inconnue

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
                type="button"
              >
                <FontAwesomeIcon
                  icon={icon}
                  className={`mr-2 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}
                />
                {tab.label}
                {isActive && (
                  <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {t('active')}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default TabsNavigation
