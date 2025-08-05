import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserSlash, 
  faSpinner, 
  faTimes,
  faTriangleExclamation,
  faBan,
  faUserCheck
} from '@fortawesome/free-solid-svg-icons';

import { refreshListUser } from '../../../../store/slices/Slice';
import { useDispatch } from 'react-redux';
import axios from 'axios';

const DeactivateUserModal = ({ user, isOpen, onClose, onUserDeactivated, onUserActivated }) => {

    const dispatch = useDispatch();

  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const isActive = user?.status === 'Actif';

  const handleToggleStatus = async () => {
    if (!user) return;

    setIsProcessing(true);
    setError('');

    try {
      const endpoint = isActive ? `users/${user.id}/deactivate` : `users/${user.id}/activate`;
      await axios.post(endpoint);
      dispatch(refreshListUser("true"));

      // Notifier le parent selon l'action
      if (isActive && onUserDeactivated) {
        onUserDeactivated(user.id);
      } else if (!isActive && onUserActivated) {
        onUserActivated(user.id);
      }
      
      // Fermer la modal
      onClose();
      
    } catch (error) {
      console.error(`Error ${isActive ? 'deactivating' : 'activating'} user:`, error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError(isActive ? t('error_deactivating_user') : t('error_activating_user'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setError('');
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              isActive ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              <FontAwesomeIcon 
                icon={isActive ? faUserSlash : faUserCheck} 
                className={isActive ? 'text-orange-600' : 'text-green-600'} 
              />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">
              {isActive ? t('deactivate_user') : t('activate_user')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            {isActive 
              ? t('deactivate_user_confirmation', { name: user.name })
              : t('activate_user_confirmation', { name: user.name })
            }
          </p>
          
          {/* Informations utilisateur */}
          <div className="flex items-center p-4 bg-gray-50 rounded-lg mb-4">
            <img
              className="h-12 w-12 rounded-full object-cover"
              src={
                user.avatar_url
                  ? `${import.meta.env.VITE_API_BASE_STORAGE}/storage/${user.avatar_url}`
                  : 'https://www.w3schools.com/howto/img_avatar2.png'
              }
              alt="Avatar"
            />
            <div className="ml-4 flex-1">
              <div className="font-medium text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">{t('current_status')}</div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.status === 'Actif' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.status}
              </span>
            </div>
          </div>

          {/* Message d'information */}
          <div className={`border rounded-lg p-3 mb-4 ${
            isActive 
              ? 'bg-orange-50 border-orange-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-sm ${
              isActive ? 'text-orange-700' : 'text-blue-700'
            }`}>
              <FontAwesomeIcon 
                icon={isActive ? faTriangleExclamation : faUserCheck} 
                className="mr-2" 
              />
              {isActive 
                ? t('deactivate_user_warning')
                : t('activate_user_info')
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
          
          <button
            onClick={handleToggleStatus}
            disabled={isProcessing}
            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] ${
              isActive 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isProcessing ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                {isActive ? t('deactivating') : t('activating')}...
              </>
            ) : (
              <>
                <FontAwesomeIcon 
                  icon={isActive ? faBan : faUserCheck} 
                  className="mr-2" 
                />
                {isActive ? t('deactivate') : t('activate')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook personnalisé pour gérer la désactivation/activation
export const useDeactivateUser = (onUserDeactivated, onUserActivated) => {
  const [deactivateModal, setDeactivateModal] = useState({
    isOpen: false,
    user: null
  });

  const openDeactivateModal = (user) => {
    setDeactivateModal({
      isOpen: true,
      user
    });
  };

  const closeDeactivateModal = () => {
    setDeactivateModal({
      isOpen: false,
      user: null
    });
  };

  const handleUserDeactivated = (userId) => {
    if (onUserDeactivated) {
      onUserDeactivated(userId);
    }
    closeDeactivateModal();
  };

  const handleUserActivated = (userId) => {
    if (onUserActivated) {
      onUserActivated(userId);
    }
    closeDeactivateModal();
  };

  return {
    deactivateModal,
    openDeactivateModal,
    closeDeactivateModal,
    handleUserDeactivated,
    handleUserActivated,
    DeactivateModalComponent: (props) => (
      <DeactivateUserModal
        user={deactivateModal.user}
        isOpen={deactivateModal.isOpen}
        onClose={closeDeactivateModal}
        onUserDeactivated={handleUserDeactivated}
        onUserActivated={handleUserActivated}
        {...props}
      />
    )
  };
};

export default DeactivateUserModal;