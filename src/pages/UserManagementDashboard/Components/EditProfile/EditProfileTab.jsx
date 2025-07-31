import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faEdit, faCamera } from '@fortawesome/free-solid-svg-icons';
import ProfileImageUpload from './ProfileImageUpload';
import SecuritySettings from './SecuritySettings';
import ProfileForm from './ProfileForm';

const EditProfileTab = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('edit_profile')}</h2>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            {t('cancel')}
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            {t('save')}
          </button>
        </div>
      </div>

      <form className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/3">
            <ProfileImageUpload />
            <SecuritySettings />
          </div>
          <div className="lg:w-2/3 space-y-6">
            <ProfileForm />
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditProfileTab;