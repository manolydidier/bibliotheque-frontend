// components/permissions/PermissionList.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faEdit } from '@fortawesome/free-solid-svg-icons';

const PermissionList = ({ permissions, onEdit, onDelete }) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              {t('name')}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              {t('resource')}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              {t('action')}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              {t('created_at')}
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              {t('actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {permissions.length > 0 ? (
            permissions.map((perm) => (
              <tr key={perm.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{perm.name}</td>
                <td className="px-4 py-3 text-sm">{perm.resource}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {perm.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(perm.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onEdit?.(perm)}
                    className="text-blue-600 hover:text-blue-800 p-1 mr-2"
                    title={t('edit')}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    onClick={() => onDelete?.(perm.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title={t('delete')}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                {t('no_permissions_found')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PermissionList;