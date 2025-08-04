import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faEnvelope, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useSelector } from 'react-redux';

const ProfileInfo = () => {
 const [loading, setLoading] = useState(true);
  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;

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
       emailVerified: false,
       avatar_url: ''
     });
  
  const [error, setError] = useState(null);

  const { t } = useTranslation();
  const [profileImage, setProfileImage] = useState('https://randomuser.me/api/portraits/women/44.jpg');

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
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
          emailVerified: response.data.user.email_verified_at !== null,
          avatar_url: response.data.user.avatar_url 
        });
        
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
  return (
    <div className="flex flex-col items-center">
      <div className="profile-pic-upload relative mb-4">
        <img
          src={`${API_BASE_STORAGE}/storage/${formData.avatar_url}`|| profileImage}
          alt="Profile"
          className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-md"
        />
        <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
          <FontAwesomeIcon icon={faCamera} />
          <input type="file" className="hidden" onChange={handleImageUpload} />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800">{formData.firstName} {formData.lastName}</h2>
      <p className="text-gray-500 mb-4 flex items-center">
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
          {t('administrator')}?
        </span>
        <span
          className={`text-xs px-2 py-1 rounded-full flex items-center
            ${formData.isActive 
              ? 'text-green-600 bg-green-100' 
              : 'text-gray-500 bg-gray-100'}
          `}
        >
          <span
            className={`w-2 h-2 rounded-full mr-1 
              ${formData.isActive 
                ? 'bg-green-500' 
                : 'bg-gray-400'}
            `}
          ></span>
          {formData.isActive ? t('active') : t('inactive')}
        </span>
      </p>
      
      <div className="flex space-x-3 w-full justify-center">
        <button className="flex-1 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center">
          <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
          {t('message')}
        </button>
        <button className="flex-1 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center">
          <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
          {t('follow')}
        </button>
      </div>
      
      <div className="w-full mt-6 grid grid-cols-3 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-blue-600">24</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('projects')}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-green-600">18</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('tasks')}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <p className="text-xl font-bold text-purple-600">3</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('teams')}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileInfo;