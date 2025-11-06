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
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <div className="mb-6">
      <div 
        className="relative bg-white/80 backdrop-blur-md border border-white/50 rounded-xl p-2 inline-flex shadow-sm max-w-full overflow-x-auto"
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          minWidth: 'fit-content'
        }}
      >
        {/* Knob glass */}
        <div
          className="absolute top-2 bottom-2 rounded-lg transition-all duration-300 ease-out"
          style={{
            width: `calc(100% / ${tabs.length} - 16px)`,
            left: `calc(${activeIndex * (100 / tabs.length)}% + 8px)`,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        />
        
        {/* Options */}
        <div className="relative z-10 flex min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const icon = ICONS[tab.icon] || faUser;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-sm px-6 py-3 font-medium transition-all duration-200 rounded-lg whitespace-nowrap flex items-center justify-center ${
                  isActive
                    ? "text-blue-600 font-semibold"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                style={{
                  width: `${100 / tabs.length}%`,
                  minWidth: '140px'
                }}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                type="button"
              >
                <FontAwesomeIcon
                  icon={icon}
                  className={`mr-3 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
                  size="sm"
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabsNavigation;