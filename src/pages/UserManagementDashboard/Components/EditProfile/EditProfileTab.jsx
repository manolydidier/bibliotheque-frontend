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
      
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/3">
            <ProfileImageUpload />
            <SecuritySettings />
          </div>
          <div className="lg:w-2/3 space-y-6">
            <ProfileForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileTab;