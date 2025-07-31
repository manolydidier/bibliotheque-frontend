import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsersCog, faSearch, faBell } from '@fortawesome/free-solid-svg-icons';


const Header = () => {
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <FontAwesomeIcon icon={faUsersCog} className="text-blue-600 mr-3" /> 
          <span>{t('user_management')}</span>
        </h1>
        <p className="text-gray-500 mt-1">{t('manage_accounts_access')}</p>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder={t('global_search')} 
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-400" />
        </div>
        
        <button 
          className="p-2 rounded-full bg-white shadow-md text-gray-600 hover:bg-gray-100 relative"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <FontAwesomeIcon icon={faBell} />
          <span className="notification-dot absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
        </button>
      </div>
    </div>
  );
};

export default Header;