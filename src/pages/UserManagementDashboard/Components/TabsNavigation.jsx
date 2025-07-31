import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUsers, faKey, faUserTag, faHistory } from '@fortawesome/free-solid-svg-icons';

const iconComponents = {
  user: faUser,
  users: faUsers,
  key: faKey,
  'user-tag': faUserTag,
  history: faHistory
};

const TabsNavigation = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="flex border-b overflow-x-auto bg-white">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`flex-shrink-0 py-4 px-6 font-medium flex items-center border-b-2 ${
            activeTab === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-indigo-300'
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          <FontAwesomeIcon icon={iconComponents[tab.icon]} className="mr-2" />
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabsNavigation;