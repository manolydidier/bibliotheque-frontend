import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

const UserSkills = () => {
  const { t } = useTranslation();
  const [skills, setSkills] = useState(['Gestion', 'Marketing', 'Développement', 'Design']);
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    const newSkills = [...skills];
    newSkills.splice(index, 1);
    setSkills(newSkills);
  };

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2 flex items-center">
        <FontAwesomeIcon icon={faPlus} className="text-blue-500 mr-2" />
        {t('skills')}
      </h3>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {skills.map((skill, index) => (
          <span key={index} className="skill-tag bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
            {skill}
            <button
              type="button"
              className="ml-1 text-blue-600 hover:text-blue-800"
              onClick={() => removeSkill(index)}
            >
              <FontAwesomeIcon icon={faTimes} className="text-xs" />
            </button>
          </span>
        ))}
      </div>
      
      <div className="flex">
        <input
          type="text"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addSkill()}
          placeholder={t('add_skill')}
          className="flex-1 px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addSkill}
          className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </div>
  );
};

export default UserSkills;