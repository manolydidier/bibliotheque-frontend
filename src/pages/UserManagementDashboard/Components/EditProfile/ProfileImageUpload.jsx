import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faSave,
  faEdit
} from '@fortawesome/free-solid-svg-icons';

const ProfileImageUpload = () => {
  const { t } = useTranslation();
  
  const DEFAULT_AVATAR = "https://avatars.githubusercontent.com/u/583231?v=4";
  
  const [profileImage, setProfileImage] = useState(DEFAULT_AVATAR);
  const [newFile, setNewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ show: false, success: null, message: '' });

  const userId = useSelector(state => state?.library?.auth?.user?.id);
  const authToken = useSelector(state => state?.library?.auth?.token);
  const userAvatarUrl = useSelector(state => state?.library?.auth?.user?.avatar_url);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;

  // Charger l'avatar existant au montage
  useEffect(() => {
    const loadInitialAvatar = () => {
      try {
        // 1. Vérifier l'avatar dans le state Redux
        if (userAvatarUrl) {
          const fullUrl = userAvatarUrl.startsWith('http') 
            ? userAvatarUrl 
            : `${API_BASE_STORAGE}/storage/${userAvatarUrl}`;
          setProfileImage(fullUrl);
          return;
        }

        // 2. Fallback sur le localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const userLogin = JSON.parse(userData);
          if (userLogin?.user?.avatar_url) {
            const avatar = userLogin.user.avatar_url;
            const fullAvatarUrl = avatar.startsWith('http')
              ? avatar
              : `${API_BASE_STORAGE}/storage/${avatar}`;
            setProfileImage(fullAvatarUrl);
          }
        }
      } catch (error) {
        console.error('Error loading avatar:', error);
      }
    };

    loadInitialAvatar();
  }, [userAvatarUrl, API_BASE_STORAGE]);

  useEffect(() => {
    if (status.show) {
      const timer = setTimeout(() => {
        setStatus(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status.show]);

  const uploadImageToAPI = async () => {
    if (!newFile) return;

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('avatar_url', newFile);
      
      // Utilisation de POST comme dans la version précédente
      const { data } = await axios.post(
        `${API_BASE_URL}/user/${parseInt(userId)}/avatar`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Mise à jour de l'image avec la méthode qui fonctionnait
      const userLogin = JSON.parse(localStorage.getItem('user'));
      if (userLogin?.user?.avatar_url) {
        const avatar = data.avatar_url || userLogin.user.avatar_url;
        const fullAvatarUrl = avatar.startsWith('http')
          ? avatar
          : `${API_BASE_STORAGE}/storage/${avatar}`;
        setProfileImage(fullAvatarUrl);
      }

      setNewFile(null);
      setPreviewUrl(null);

      setStatus({
        show: true,
        success: true,
        message: t('profile.upload_success')
      });

    } catch (error) {
      console.error('Erreur upload:', error);
      
      setStatus({
        show: true,
        success: false,
        message: error?.response?.data?.message ||
          (error.message.includes('Network') ? t('profile.connection_error') : error.message || t('profile.upload_error'))
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 2 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      setStatus({ show: true, success: false, message: t('profile.invalid_format') });
      return;
    }

    if (file.size > maxSize) {
      setStatus({ show: true, success: false, message: t('profile.file_too_large') });
      return;
    }

    setNewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div className="profile-upload-container mb-6 mx-auto max-w-[200px]">
      <div className="relative w-32 h-32 mx-auto mb-4">
        <img
          src={previewUrl || profileImage}
          alt="Profile"
          className="w-full h-full rounded-full object-cover border-4 border-blue-100 shadow-md"
          onError={(e) => {
            e.target.src = DEFAULT_AVATAR;
          }}
        />

        <label htmlFor="profile-upload" className="block">
          <div className={`absolute bottom-0 right-0 p-2 rounded-full cursor-pointer transition-all justify-center items-center flex ${
            isLoading ? 'bg-white' : 'bg-white hover:bg-gray-100'
          }`}>
            {isLoading ? (
              <FontAwesomeIcon icon={faSpinner} className="text-blue-500 animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faEdit} className="text-blue-500 hover:scale-125" />
            )}
          </div>
          <input
            id="profile-upload"
            type="file"
            accept="image/jpeg, image/png, image/gif"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isLoading}
          />
        </label>
      </div>

      {previewUrl && !isLoading && (
        <button
          onClick={uploadImageToAPI}
          className="w-full py-2.5 rounded-lg font-medium bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center"
        >
          <FontAwesomeIcon icon={faSave} className="mr-2" />
          <span>{t('save')}</span>
        </button>
      )}

      {status.show && (
        <div className={`mt-3 text-center text-sm rounded-lg p-2 animate-fadeIn ${
          status.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center justify-center">
            {status.success ? (
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
            ) : (
              <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
            )}
            {status.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileImageUpload;