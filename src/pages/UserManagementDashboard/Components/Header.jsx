
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsersCog, faSearch, faBell } from '@fortawesome/free-solid-svg-icons';


const Header = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <FontAwesomeIcon icon={faUsersCog} className="text-blue-600 mr-3" /> 
          <span>{t('user_management')}</span>
        </h1>
        <p className="text-gray-500 mt-1">{t('manage_accounts_access')}</p>
      </div>  
    </div>
  );
};

export default Header;