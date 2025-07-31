import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faEnvelope, faUserPlus } from '@fortawesome/free-solid-svg-icons';

const ProfileInfo = () => {
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

  return (
    <div className="flex flex-col items-center">
      <div className="profile-pic-upload relative mb-4">
        <img
          src={profileImage}
          alt="Profile"
          className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-md"
        />
        <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
          <FontAwesomeIcon icon={faCamera} />
          <input type="file" className="hidden" onChange={handleImageUpload} />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800">Sophie Martin</h2>
      <p className="text-gray-500 mb-4 flex items-center">
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
          {t('administrator')}
        </span>
        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
          {t('active')}
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