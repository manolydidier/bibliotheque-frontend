import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { updateUser } from '../../../../store/slices/Slice';
import axios from 'axios';
import {
  faUser,
  faEnvelope,
  faPhone,
  faCalendarAlt,
  faMapMarkerAlt,
  faIdBadge,
  faCheck,
  faTimes,
  faExclamationTriangle,
  faEdit,
  faSave,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const ProfileForm = () => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthdate: '',
    roles: [],
    address: '',
    isActive: false,
    emailVerified: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const dispatch = useDispatch();

  const [validationErrors, setValidationErrors] = useState({});
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
  // Récupération des données utilisateur depuis Redux
  const userId = useSelector(state => state?.library?.auth?.user?.id);

  // Chargement des données utilisateur
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/user/${userId}/profile`);

        setFormData({
          username: response.data.user.username,
          firstName: response.data.user.first_name,
          lastName: response.data.user.last_name,
          email: response.data.user.email,
          phone: response.data.user.phone,
          birthdate: response.data.user.birthdate,
          roles: response.data.user.roles || [],
          address: response.data.user.address,
          isActive: response.data.user.is_active,
          emailVerified: response.data.user.email_verified_at !== null
        });
        dispatch(updateUser(response.data.user));
        
      } catch (err) {
        setError(err.response?.data?.message || t('fetch_error'));
        console.log(err);
        

      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
     
      
    }
  }, [userId, t]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (validationErrors[id]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    setIsEditing(true);
    setError(null);
    setShowSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setValidationErrors({});
    try {
      await axios.post(`/user/${userId}/edit`, {
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.birthdate,
        address: formData.address
      });
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      if (err.response?.status === 422) {
        setValidationErrors(err.response.data.errors || {});
        setError(t('validation_error'));
      } else {
        setError(err.response?.data?.message || t('update_error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setValidationErrors({});
    setLoading(true);
  };

  const getValidationError = (field) => {
    return validationErrors[field] ? validationErrors[field][0] : null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="text-blue-600 animate-spin mb-4 text-2xl" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center mb-2">
            <FontAwesomeIcon icon={faUser} className="mr-3 text-blue-600" />
            {t('title')}
          </h2>
          
          {showSuccess && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              <span className="text-sm">{t('update_success')}</span>
            </div>
          )}
          
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center shadow-sm hover:shadow-md disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {t('save')}
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleEditClick}
              className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center shadow-sm hover:shadow-md"
            >
              <FontAwesomeIcon icon={faEdit} className="mr-2" />
              {t('edit')}
            </button>
          )}
        </div>
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
                icon={faUser} 
                className={`mr-2 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('username')}</span>
              <span className="ml-1 text-xs text-gray-400">({t('unique')})</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faUser} 
                  className={`${isEditing ? 'text-gray-400' : 'text-gray-300'}`} 
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
                    ? `border ${getValidationError('username') ? 'border-red-300' : 'border-gray-300'} bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none` 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
                placeholder={t('username_placeholder')}
              />
            </div>
            {getValidationError('username') && (
              <p className="text-red-500 text-xs mt-1">{getValidationError('username')}</p>
            )}
          </div>

          {/* First Name */}
          <div className="space-y-1">
            <label htmlFor="firstName" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faUser} 
                className={`mr-2 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('first_name')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faUser} 
                  className={`${isEditing ? 'text-gray-400' : 'text-gray-300'}`} 
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
                    ? `border ${getValidationError('firstName') ? 'border-red-300' : 'border-gray-300'} bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none` 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
                placeholder={t('first_name_placeholder')}
              />
            </div>
            {getValidationError('firstName') && (
              <p className="text-red-500 text-xs mt-1">{getValidationError('firstName')}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-1">
            <label htmlFor="lastName" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faUser} 
                className={`mr-2 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('last_name')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faUser} 
                  className={`${isEditing ? 'text-gray-400' : 'text-gray-300'}`} 
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
                    ? `border ${getValidationError('lastName') ? 'border-red-300' : 'border-gray-300'} bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none` 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
                placeholder={t('last_name_placeholder')}
              />
            </div>
            {getValidationError('lastName') && (
              <p className="text-red-500 text-xs mt-1">{getValidationError('lastName')}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faEnvelope} 
                className={`mr-2 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('email')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faEnvelope} 
                  className={`${isEditing ? 'text-gray-400' : 'text-gray-300'}`} 
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
                    ? `border ${getValidationError('email') ? 'border-red-300' : 'border-gray-300'} bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none` 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
                placeholder={t('email_placeholder')}
              />
            </div>
            {getValidationError('email') && (
              <p className="text-red-500 text-xs mt-1">{getValidationError('email')}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label htmlFor="phone" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faPhone} 
                className={`mr-2 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('phone')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faPhone} 
                  className={`${isEditing ? 'text-gray-400' : 'text-gray-300'}`} 
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
                    ? `border ${getValidationError('phone') ? 'border-red-300' : 'border-gray-300'} bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none` 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
                placeholder={t('phone_placeholder')}
              />
            </div>
            {getValidationError('phone') && (
              <p className="text-red-500 text-xs mt-1">{getValidationError('phone')}</p>
            )}
          </div>

          {/* Birthdate */}
          <div className="space-y-1">
            <label htmlFor="birthdate" className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faCalendarAlt} 
                className={`mr-2 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('birthdate')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faCalendarAlt} 
                  className={`${isEditing ? 'text-gray-400' : 'text-gray-300'}`} 
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
                    ? `border ${getValidationError('birthdate') ? 'border-red-300' : 'border-gray-300'} bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none` 
                    : 'border border-gray-100 bg-gray-50 text-gray-500'
                }`}
              />
            </div>
            {getValidationError('birthdate') && (
              <p className="text-red-500 text-xs mt-1">{getValidationError('birthdate')}</p>
            )}
          </div>

          {/* Roles */}
          <div className="space-y-1">
            <label className={`block text-sm font-medium mb-1.5 flex items-center ${
              isEditing ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <FontAwesomeIcon 
                icon={faIdBadge} 
                className={`mr-2 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} 
              />
              <span className={`font-semibold ${
                isEditing ? 'text-blue-600' : 'text-gray-500'
              }`}>{t('roles')}</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon 
                  icon={faIdBadge} 
                  className="text-gray-300" 
                />
              </div>
              <div className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 min-h-[42px] flex items-center">
                {formData.roles?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {formData.roles.map((role, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">{t('no_roles')}</span>
                )}
              </div>
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
              className={`mr-2 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} 
            />
            <span className={`font-semibold ${
              isEditing ? 'text-blue-600' : 'text-gray-500'
            }`}>{t('address')}</span>
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3">
              <FontAwesomeIcon 
                icon={faMapMarkerAlt} 
                className={`${isEditing ? 'text-gray-400' : 'text-gray-300'}`} 
              />
            </div>
            <textarea
              id="address"
              rows="2"
              value={formData.address}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200 resize-none ${
                isEditing 
                  ? `border ${getValidationError('address') ? 'border-red-300' : 'border-gray-300'} bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none` 
                  : 'border border-gray-100 bg-gray-50 text-gray-500'
              }`}
              placeholder={isEditing ? t('address_placeholder') : ""}
            />
          </div>
          {getValidationError('address') && (
            <p className="text-red-500 text-xs mt-1">{getValidationError('address')}</p>
          )}
        </div>

        {/* Account Status */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <FontAwesomeIcon icon={faIdBadge} className="mr-2 text-blue-600" />
            {t('account_status')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  formData.isActive ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{t('account_status')}</p>
                  <p className="text-xs text-gray-600">
                    {formData.isActive ? t('active') : t('inactive')}
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={formData.isActive ? faCheck : faTimes} 
                className={`${formData.isActive ? 'text-green-500' : 'text-red-500'}`} 
              />
            </div>

            {/* Email Verification */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  formData.emailVerified ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{t('email_verification')}</p>
                  <p className="text-xs text-gray-600">
                    {formData.emailVerified ? t('verified') : t('not_verified')}
                  </p>
                </div>
              </div>
              <FontAwesomeIcon 
                icon={formData.emailVerified ? faCheck : faExclamationTriangle} 
                className={`${formData.emailVerified ? 'text-green-500' : 'text-yellow-500'}`} 
              />
            </div>
          </div>

          {/* Email Verification Action */}
          {!formData.emailVerified && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    {t('email_not_verified')}
                  </span>
                </div>
                <button className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors">
                  {t('resend_email')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;