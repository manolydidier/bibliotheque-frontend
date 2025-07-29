import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faSignInAlt, 
  faUserPlus, 
  faUserCircle, 
  faCog, 
  faBell, 
  faSignOutAlt,
  faFileAlt,
  faVideo,
  faPodcast,
  faSitemap,
  faBullseye,
  faUsers,
  faEnvelope,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../langue/LanguageSwitcher';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024);
  
  const searchRef = useRef(null);
  const userProfileRef = useRef(null);
  const navRef = useRef(null);
  const burgerRef = useRef(null);

  const { t, i18n } = useTranslation();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsLangMenuOpen(false);
    if (!isDesktop) setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      const isNowDesktop = window.innerWidth > 1024;
      setIsDesktop(isNowDesktop);
      
      if (isNowDesktop) {
        setIsMenuOpen(false);
        setActiveSubmenu(null);
        setIsProfileOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setIsLangMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (userProfileRef.current && !userProfileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (isMenuOpen && navRef.current && !navRef.current.contains(event.target)) {
        if (burgerRef.current && !burgerRef.current.contains(event.target)) {
          setIsMenuOpen(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) {
      setActiveSubmenu(null);
      setIsProfileOpen(false);
    }
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  };

  const toggleSubmenu = (index) => {
    if (isDesktop) return;
    setActiveSubmenu(activeSubmenu === index ? null : index);
  };

  const handleNavLinkClick = () => {
    if (!isDesktop) {
      setIsMenuOpen(false);
    }
  };

  const navLinks = [
    { 
      name: t('home'), 
      path: '/', 
      submenu: null 
    },
    { 
      name: t('platform'), 
      path: '/platform', 
      submenu: [
        { icon: faFileAlt, name: t('sumary'), path: '/platform/summary' },
        { icon: faVideo, name: t('video'), path: '/platform/video' },
        { icon: faPodcast, name: t('audio'), path: '/platform/audio' }
      ] 
    },
    { 
      name: t('genre'), 
      path: '/genre', 
      submenu: [
        { icon: faFileAlt, name: t('playdoier'), path: '/genre/playdoier' },
        { icon: faVideo, name: t('fundraising'), path: '/genre/fundraising' },
        { icon: faPodcast, name: t('technical'), path: '/genre/technical' }
      ] 
    },
    { 
      name: t('about'), 
      path: '/about', 
      submenu: [
        { icon: faSitemap, name: t('structure'), path: '/about/structure' },
        { icon: faBullseye, name: t('goals'), path: '/about/goals' },
        { icon: faUsers, name: t('members'), path: '/about/members' },
        { icon: faEnvelope, name: t('contact'), path: '/about/contact' }
      ] 
    }
  ];

  return (
    <nav className="fixed top-0 left-0 w-full bg-gradient-to-r from-blue-900 to-blue-700 shadow-md flex justify-between items-center px-6 h-20 z-50">
      {/* Logo */}
      <Link to="/" className="logo flex items-center gap-3">
        <div className="logo-icon w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg transition-all duration-500 hover:rotate-y-180">
          B
        </div>
        <span className="logo-text text-white text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
          BlueUI
        </span>
      </Link>

      {/* Navigation Links - Desktop */}
      {isDesktop && (
        <ul className="nav-links flex gap-8 font-medium">
          {navLinks.map((link, index) => (
            <li 
              key={index} 
              className={`${link.submenu ? 'has-submenu relative' : ''}`}
              onMouseEnter={() => link.submenu && setActiveSubmenu(index)}
              onMouseLeave={() => link.submenu && setActiveSubmenu(null)}
            >
              <Link 
                to={link.path} 
                className="flex items-center py-3 text-white hover:text-white"
              >
                {link.name}
              </Link>
              
              {link.submenu && (
                <ul 
                  className={`submenu absolute top-full left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl w-60 py-2 transition-all ${
                    activeSubmenu === index ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
                  }`}
                >
                  {link.submenu.map((subItem, subIndex) => (
                    <li key={subIndex} className="relative">
                      <Link 
                        to={subItem.path} 
                        className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50 transition-all"
                      >
                        <FontAwesomeIcon icon={subItem.icon} className="mr-3 text-blue-600" />
                        {subItem.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Navigation Links - Mobile */}
      {!isDesktop && (
        <>
          <ul 
            ref={navRef}
            className={`fixed top-0 left-0 w-80 h-screen bg-white flex-col items-start p-24 gap-0 shadow-lg transform transition-all duration-300 z-40 ${
              isMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {navLinks.map((link, index) => (
              <li 
                key={index} 
                className={`${link.submenu ? 'has-submenu relative' : ''} w-full border-b border-gray-100`}
              >
                {link.submenu ? (
                  <>
                    <Link 
                      to={link.path} 
                      className={`flex items-center py-3 text-gray-800 ${!isDesktop && link.submenu ? 'justify-between' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubmenu(index);
                      }}
                    >
                      {link.name}
                      {link.submenu && (
                        <FontAwesomeIcon 
                          icon={faChevronDown} 
                          className={`ml-2 transition-transform ${activeSubmenu === index ? 'rotate-180' : ''}`} 
                        />
                      )}
                    </Link>
                    
                    {link.submenu && (
                      <ul 
                        className={`w-full overflow-hidden transition-all duration-300 bg-blue-50 bg-opacity-30 rounded-lg m-2 ${
                          activeSubmenu === index ? 'max-h-96 py-2' : 'max-h-0'
                        }`}
                      >
                        {link.submenu.map((subItem, subIndex) => (
                          <li key={subIndex} className="relative">
                            <Link 
                              to={subItem.path} 
                              className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50 transition-all"
                              onClick={handleNavLinkClick}
                            >
                              <FontAwesomeIcon icon={subItem.icon} className="mr-3 text-blue-600" />
                              {subItem.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link 
                    to={link.path} 
                    className="flex items-center py-3 text-gray-800"
                    onClick={handleNavLinkClick}
                  >
                    {link.name}
                  </Link>
                )}
              </li>
            ))}

            {/* Language Switcher */}
            <LanguageSwitcher isMobile />

            {/* Mobile Auth Buttons */}
            <div className="mobile-actions w-full mt-8">
              <div className="mobile-auth-buttons flex flex-col gap-3 w-full">
                <Link 
                  to="/login" 
                  className="mobile-login-btn border border-blue-600 text-blue-600 rounded-md py-3 text-center font-medium"
                  onClick={handleNavLinkClick}
                >
                  {t('login')} 
                </Link>
                <Link 
                  to="/signup" 
                  className="mobile-signup-btn bg-blue-600 text-white rounded-md py-3 text-center font-medium"
                  onClick={handleNavLinkClick}
                >
                  {t('signup')} 
                </Link>
              </div>
            </div>
          </ul>

          {/* Overlay for mobile */}
          <div 
            className={`fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 backdrop-blur-sm transition-all z-30 ${
              isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
            onClick={toggleMenu}
          />
        </>
      )}

      {/* User Section */}
      <div className="user-section flex items-center gap-6">
        {isDesktop && <LanguageSwitcher />}

        {/* Search */}
        <div className="search-container relative">
          <button 
            className="search-btn text-white text-lg cursor-pointer hover:text-blue-400 transition-all"
            onClick={toggleSearch}
          >
            <FontAwesomeIcon icon={faSearch} />
          </button>
          <input 
            type="text" 
            ref={searchRef}
            className={`search-input fixed top-24 left-1/2 transform -translate-x-1/2 w-[calc(100%-48px)] max-w-md px-5 py-4 rounded-lg border-none shadow-lg transition-all ${
              isSearchOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
            }`}
            placeholder={t('search')}
          />
        </div>

        {/* Auth Buttons - Desktop */}
        {isDesktop && (
          <div className="auth-buttons flex gap-3">
            <Link to="/login" className="auth-btn login-btn border border-white border-opacity-30 rounded-md px-2 py-1 text-white hover:bg-white hover:bg-opacity-10 hover:border-opacity-50 transition-all">
              <FontAwesomeIcon icon={faSignInAlt} />
            </Link>
            <Link to="/signup" className="auth-btn signup-btn bg-blue-500 text-white rounded-md px-2 py-1 hover:bg-blue-600 transition-all">
              <FontAwesomeIcon icon={faUserPlus} />
            </Link>
          </div>
        )}

        {/* User Profile - Desktop */}
        {isDesktop && (
          <div className="user-profile relative" ref={userProfileRef}>
            <img 
              src="https://randomuser.me/api/portraits/women/44.jpg" 
              alt="User" 
              className="user-avatar w-10 h-10 rounded-full border-2 border-white border-opacity-30 hover:border-blue-500 transition-all cursor-pointer"
              onClick={toggleProfile}
            />
            <div 
              className={`dropdown-menu absolute top-full right-0 bg-white rounded-lg shadow-lg w-56 py-2 transition-all ${
                isProfileOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
              }`}
            >
              <Link 
                to="/profile" 
                className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50 transition-all"
                onClick={toggleProfile}
              >
                <FontAwesomeIcon icon={faUserCircle} className="mr-3 text-blue-600" />
                {t('profile')} 
              </Link>
              <Link 
                to="/settings" 
                className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50 transition-all"
                onClick={toggleProfile}
              >
                <FontAwesomeIcon icon={faCog} className="mr-3 text-blue-600" />
                {t('settings')} 
              </Link>
              <Link 
                to="/logout" 
                className="flex items-center px-6 py-3 text-gray-800 hover:text-blue-500 hover:bg-blue-50 transition-all"
                onClick={toggleProfile}
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="mr-3 text-blue-600" />
                {t('logout')} 
              </Link>
            </div>
          </div>
        )}

        {/* Burger Menu */}
        {!isDesktop && (
          <div 
            ref={burgerRef}
            className="burger flex flex-col justify-between w-7 h-5 cursor-pointer relative z-50"
            onClick={toggleMenu}
          >
            <div className={`h-1 bg-white rounded transition-all ${isMenuOpen ? 'transform rotate-45 translate-y-2' : ''}`}></div>
            <div className={`h-1 bg-white rounded transition-all ${isMenuOpen ? 'opacity-0 scale-x-0' : ''}`}></div>
            <div className={`h-1 bg-white rounded transition-all ${isMenuOpen ? 'transform -rotate-45 -translate-y-2' : ''}`}></div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;