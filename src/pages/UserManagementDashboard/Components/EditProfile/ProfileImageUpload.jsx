import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSelector } from 'react-redux';
import { 
  faCamera, 
  faCheckCircle, 
  faTimesCircle,
  faSpinner,
  faSave,
  faEdit
} from '@fortawesome/free-solid-svg-icons';

const ProfileImageUpload = () => {
  const { t } = useTranslation();
  const [profileImage, setProfileImage] = useState('https://randomuser.me/api/portraits/women/44.jpg');
  const [newImage, setNewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ show: false, success: null, message: '' });
  
  // Récupération des données utilisateur depuis Redux
  const userId = useSelector(state => state.library.auth.user.id);
  const authToken = useSelector(state => state.library.auth.token);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

  // Masquer le message après 3 secondes
  useEffect(() => {
    if (status.show) {
      const timer = setTimeout(() => {
        setStatus(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status.show]);

  const uploadImageToAPI = async (imageData) => {
    setIsLoading(true);
    
    try {
      // Conversion de l'image en Blob
      const blob = await (await fetch(imageData)).blob();
      if (userId) {
     console.log('Envoi à:', `${API_BASE_URL}/user/${userId}/avatar`);
console.log('User ID:', userId, 'Type:', typeof userId);
console.log('Token:', authToken ? 'Present' : 'Missing');
      }
      // Préparation FormData
      const formData = new FormData();
      formData.append('avatar', blob, 'profile.jpg');
      
      // Appel API avec l'ID dans l'URL
      const response = await fetch(`${API_BASE_URL}/user/${parseInt(userId)}/avatar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });
    
      
      // Gestion des réponses non-OK
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('profile.upload_error'));
      }

      const data = await response.json();
      
      // Mise à jour de l'image
      setProfileImage(data.avatar_url || URL.createObjectURL(blob));
      setNewImage(null);
      
      // Message de succès
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
        message: error.message.includes('Failed to fetch') 
          ? t('profile.connection_error')
          : error.message || t('profile.upload_error')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation du fichier
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      setStatus({
        show: true,
        success: false,
        message: t('profile.invalid_format')
      });
      return;
    }

    if (file.size > maxSize) {
      setStatus({
        show: true,
        success: false,
        message: t('profile.file_too_large')
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (newImage) {
      uploadImageToAPI(newImage);
    }
  };

  return (
    <div className="profile-upload-container mb-6 mx-auto max-w-[200px]">
      <div className="relative w-32 h-32 mx-auto mb-4">
        {/* Image de profil */}
        <img 
          src={newImage || profileImage} 
          alt="Profile" 
          className="w-full h-full rounded-full object-cover border-4 border-blue-100 shadow-md"
        />
        
        {/* Bouton de téléchargement */}
        <label htmlFor="profile-upload" className="block">
          <div className={`absolute bottom-0 right-0 p-2 rounded-full cursor-pointer transition-all  justify-center items-center flex ${
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

      {/* Bouton de sauvegarde conditionnel */}
      {newImage && !isLoading && (
        <button 
          onClick={handleSave}
          className="w-full py-2.5 rounded-lg font-medium
          bg-gradient-to-r from-green-500 to-green-600 
          text-white shadow-md hover:shadow-lg
          transform hover:-translate-y-0.5 transition-all
          flex items-center justify-center"
        >
          <FontAwesomeIcon icon={faSave} className="mr-2" />
          <span>{t('save')}</span>
        </button>
      )}

      {/* Messages de statut */}
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