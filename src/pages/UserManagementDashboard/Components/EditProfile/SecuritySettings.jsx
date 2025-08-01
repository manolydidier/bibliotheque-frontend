import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  faEdit,
  faSave,
  faTimes,
  faLock,
  faCheckDouble,
  faShieldAlt,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const SecuritySettings = () => {
  const { t } = useTranslation();
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  console.log('API_BASE_URL:', API_BASE_URL);
  
  const authToken = useSelector(state => state?.library?.auth?.token);
  const userId = useSelector(state => state?.library?.auth?.user?.id);

  const handleEditClick = () => {
    setIsEditingPassword(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setSuccessMessage('');
  };

  const handleCancelClick = () => {
    setIsEditingPassword(false);
    setPasswordError('');
    setSuccessMessage('');
  };

  const handleSaveClick = async () => {
    setPasswordError('');
    setSuccessMessage('');

    // Validation côté client
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwords_do_not_match'));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t('password_min_length'));
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/${userId}/updatepassword`, // Correction de l'URL
        {
          current_password: currentPassword,
          password: newPassword, // Changé de new_password à password
          password_confirmation: confirmPassword // Changé de new_password_confirmation
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      setSuccessMessage(response.data.message || t('password_updated'));
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password update error:', error);
      
      // Gestion améliorée des erreurs
      let errorMessage = t('error_occurred');
      
      if (error.response?.status === 422) {
        // Erreurs de validation Laravel
        errorMessage = error.response.data.message || errorMessage;
        if (error.response.data.errors?.current_password) {
          errorMessage = error.response.data.errors.current_password[0];
        }
      } else if (error.response?.status === 403) {
        errorMessage = t('unauthorized_action');
      }

      setPasswordError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    if (newPassword.length < 4) return 25;
    if (newPassword.length < 8) return 50;
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return 75;
    return 100;
  };

  const strengthColor = () => {
    const strength = getPasswordStrength();
    if (strength < 50) return 'bg-red-500';
    if (strength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center mb-6">
        <FontAwesomeIcon 
          icon={faShieldAlt} 
          className="text-blue-600 mr-3 text-xl" 
        />
        <h3 className="text-xl font-semibold text-gray-800">
          {t('security_settings')}
        </h3>
      </div>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FontAwesomeIcon icon={faLock} className="mr-2 text-gray-500" />
              {t('password')}
            </label>
            {!isEditingPassword && (
              <button 
                type="button" 
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 flex items-center"
                onClick={handleEditClick}
              >
                <FontAwesomeIcon icon={faEdit} className="mr-1.5" /> 
                {t('edit')}
              </button>
            )}
          </div>
          
          {isEditingPassword ? (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  {t('current_password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder={t('enter_current_password')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  {t('new_password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder={t('enter_new_password')}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  {t('confirm_password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faCheckDouble} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder={t('confirm_new_password')}
                  />
                </div>
              </div>
              
              {newPassword && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      {t('password_strength')}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      {getPasswordStrength()}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${strengthColor()}`} 
                      style={{ width: `${getPasswordStrength()}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {(passwordError || successMessage) && (
                <div className={`text-sm mt-1 ${
                  passwordError ? 'text-red-500' : 'text-green-600'
                }`}>
                  {passwordError || successMessage}
                </div>
              )}
              
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleSaveClick}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center flex-1 disabled:opacity-70"
                >
                  {loading ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  ) : (
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                  )}
                  {t('save_changes')}
                </button>
                <button
                  onClick={handleCancelClick}
                  disabled={loading}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center flex-1"
                >
                  <FontAwesomeIcon icon={faTimes} className="mr-2" /> 
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: '80%' }}></div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{t('strong')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition-colors duration-200">
          <input 
            type="checkbox" 
            id="twoFactor" 
            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
            defaultChecked
          />
          <label htmlFor="twoFactor" className="ml-3 block text-sm font-medium text-gray-700">
            <span className="flex items-center">
              <FontAwesomeIcon icon={faShieldAlt} className="mr-2 text-blue-500" />
              {t('two_factor_auth')}
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                {t('active')}
              </span>
            </span>
            <span className="block text-xs text-gray-500 mt-1">
              {t('two_factor_auth_description')}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;