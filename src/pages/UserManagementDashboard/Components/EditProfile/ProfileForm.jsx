import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEnvelope,
  faPhone,
  faCalendarAlt,
  faMapMarkerAlt,
  faIdBadge,
  faEdit,
  faSave,
  faUserTag
} from '@fortawesome/free-solid-svg-icons';

const ProfileForm = () => {
   
  
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: 'sophie_m',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@example.com',
    phone: '+33 6 12 34 56 78',
    birthdate: '1990-03-15',
    role: 'Administrateur',
    address: '123 Rue de Paris, 75001 Paris, France',
    about: t('admin_description')
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          <FontAwesomeIcon icon={faUser} className="mr-3 text-blue-600" />
          {t('profile_information')}
        </h2>
        {isEditing ? (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center shadow-sm hover:shadow-md"
          >
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            {t('save_changes')}
          </button>
        ) : (
          <button
            onClick={handleEditClick}
            className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center shadow-sm hover:shadow-md"
          >
            <FontAwesomeIcon icon={faEdit} className="mr-2" />
            {t('edit_profile')}
          </button>
        )}
      </div>

      <div className={`bg-white p-6 rounded-xl shadow-sm border ${
        isEditing ? 'border-gray-200' : 'border-gray-100'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Username */}
          <div className="space-y-1">
            <label htmlFor="username" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faUserTag} 
                className={`mr-2 text-xs ${
                  isEditing ? 'text-blue-500' : 'text-gray-400'
                }`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('username')}</span>
              <span className="ml-1 text-xs text-gray-400">(unique)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faUserTag} 
                  className={isEditing ? 'text-gray-400' : 'text-gray-300'} 
                />
              </div>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isEditing 
                    ? 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none' 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
              />
            </div>
          </div>

          {/* First Name */}
          <div className="space-y-1">
            <label htmlFor="firstName" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faUser} 
                className={`mr-2 text-xs ${
                  isEditing ? 'text-blue-500' : 'text-gray-400'
                }`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('first_name')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faUser} 
                  className={isEditing ? 'text-gray-400' : 'text-gray-300'} 
                />
              </div>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isEditing 
                    ? 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none' 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Last Name */}
          <div className="space-y-1">
            <label htmlFor="lastName" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faUser} 
                className={`mr-2 text-xs ${
                  isEditing ? 'text-blue-500' : 'text-gray-400'
                }`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('last_name')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faUser} 
                  className={isEditing ? 'text-gray-400' : 'text-gray-300'} 
                />
              </div>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isEditing 
                    ? 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none' 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faEnvelope} 
                className={`mr-2 text-xs ${
                  isEditing ? 'text-blue-500' : 'text-gray-400'
                }`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>Email</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faEnvelope} 
                  className={isEditing ? 'text-gray-400' : 'text-gray-300'} 
                />
              </div>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isEditing 
                    ? 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none' 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label htmlFor="phone" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faPhone} 
                className={`mr-2 text-xs ${
                  isEditing ? 'text-blue-500' : 'text-gray-400'
                }`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('phone')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faPhone} 
                  className={isEditing ? 'text-gray-400' : 'text-gray-300'} 
                />
              </div>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isEditing 
                    ? 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none' 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Birthdate */}
          <div className="space-y-1">
            <label htmlFor="birthdate" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faCalendarAlt} 
                className={`mr-2 text-xs ${
                  isEditing ? 'text-blue-500' : 'text-gray-400'
                }`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('birthdate')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faCalendarAlt} 
                  className={isEditing ? 'text-gray-400' : 'text-gray-300'} 
                />
              </div>
              <input
                type="date"
                id="birthdate"
                value={formData.birthdate}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isEditing 
                    ? 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none' 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label htmlFor="role" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faIdBadge} 
                className={`mr-2 text-xs ${
                  isEditing ? 'text-blue-500' : 'text-gray-400'
                }`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('role')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faIdBadge} 
                  className={isEditing ? 'text-gray-400' : 'text-gray-300'} 
                />
              </div>
              <select
                id="role"
                value={formData.role}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg appearance-none transition-all duration-200 ${
                  isEditing 
                    ? 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none' 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
              >
                <option>{t('administrator')}</option>
                <option>{t('editor')}</option>
                <option>{t('user')}</option>
                <option>{t('guest')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="mt-6 space-y-1">
          <label htmlFor="address" className={`block text-sm font-medium mb-1.5 flex items-center ${
            isEditing ? 'text-gray-600' : 'text-gray-500'
          }`}>
            <FontAwesomeIcon 
              icon={faMapMarkerAlt} 
              className={`mr-2 text-xs ${
                isEditing ? 'text-blue-500' : 'text-gray-400'
              }`} 
            />
            <span className={`font-semibold ${
              isEditing ? 'text-blue-600' : 'text-gray-500'
            }`}>{t('address')}</span>
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3">
              <FontAwesomeIcon 
                icon={faMapMarkerAlt} 
                className={isEditing ? 'text-gray-400' : 'text-gray-300'} 
              />
            </div>
            <textarea
              id="address"
              rows="2"
              value={formData.address}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200 ${
                isEditing 
                  ? 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none' 
                  : 'border border-gray-100 bg-gray-50 text-gray-500'
              }`}
            />
          </div>
        </div>

        {/* About */}
        <div className="mt-6 space-y-1">
          <label className={`block text-sm font-medium mb-1.5 flex items-center ${
            isEditing ? 'text-gray-600' : 'text-gray-500'
          }`}>
            <FontAwesomeIcon 
              icon={faUser} 
              className={`mr-2 text-xs ${
                isEditing ? 'text-blue-500' : 'text-gray-400'
              }`} 
            />
            <span className={`font-semibold ${
              isEditing ? 'text-blue-600' : 'text-gray-500'
            }`}>{t('about')}</span>
          </label>
          <textarea
            rows="4"
            value={formData.about}
            onChange={(e) => setFormData({...formData, about: e.target.value})}
            disabled={!isEditing}
            className={`w-full px-4 py-2.5 rounded-lg transition-all duration-200 ${
              isEditing 
                ? 'border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none' 
                : 'border border-gray-100 bg-gray-50 text-gray-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;