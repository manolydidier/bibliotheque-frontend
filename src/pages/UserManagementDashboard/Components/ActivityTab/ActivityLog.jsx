import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserEdit, faKey, faEllipsisV, faClock, faDownload } from '@fortawesome/free-solid-svg-icons';

const ActivityLog = () => {
  const { t } = useTranslation();
  
  const activities = [
    {
      id: 1,
      icon: faUserEdit,
      iconColor: 'indigo',
      title: t('user_updated_permissions'),
      details: 'articles.delete',
      status: 'enabled',
      time: t('today_at') + ' 10:45'
    },
    // Plus d'activités...
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('activity_log')}</h2>
          <p className="text-gray-500 text-sm">{t('user_actions_history')}</p>
        </div>
        
        <div className="flex space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder={t('filter')}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <FontAwesomeIcon icon={faDownload} className="mr-2" />
            {t('export')}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {activities.map(activity => (
            <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start">
                <div className={`flex-shrink-0 bg-${activity.iconColor}-100 p-2 rounded-full mr-3`}>
                  <FontAwesomeIcon icon={activity.icon} className={`text-${activity.iconColor}-600`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {t('permission')}: {activity.details}
                    </span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      {t(activity.status)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    <FontAwesomeIcon icon={faClock} className="mr-1" />
                    {activity.time}
                  </p>
                </div>
                <button className="text-gray-400 hover:text-gray-600 ml-2">
                  <FontAwesomeIcon icon={faEllipsisV} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;