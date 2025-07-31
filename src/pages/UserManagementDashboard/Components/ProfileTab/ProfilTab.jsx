import React from 'react';
import ProfileInfo from './ProfileInfo';
import UserSkills from './UserSkills';
import ActivityLog from '../ActivityTab/ActivityLog';


const ProfileTab = () => {
  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/3">
          <ProfileInfo />
        </div>
        <div className="lg:w-2/3">
          <ActivityLog />
          <UserSkills />
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;