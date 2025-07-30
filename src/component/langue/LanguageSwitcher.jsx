import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { language } from '../../store/slices/Slice';
import { useDispatch } from 'react-redux';

const LanguageSwitcher = ({ isMobile = false }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = i18n.language || 'fr';
  const dispatch = useDispatch();

  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' }
  ];

const changeLanguage = (lng) => {
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(lng);
      dispatch(language({
        langue: lng,
          }));
      
    } else {
      console.error('i18n not properly initialized');
    }
    setIsOpen(false);
  };

  return isMobile ? (
    <div className="w-full px-4 py-3 border-t border-gray-200 mt-4">
      <div className="flex justify-center gap-4">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`px-4 py-2 rounded ${
              currentLanguage === lang.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  ) : (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-white hover:text-blue-200 transition-colors"
      >
        <FontAwesomeIcon icon={faGlobe} className="mr-2 mt-1" />
        <span className="mr-1">{currentLanguage.toUpperCase()}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-md shadow-lg py-1 z-50 min-w-[120px]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`block w-full px-4 py-2 text-left hover:bg-blue-50 ${
                currentLanguage === lang.code
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-800'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;