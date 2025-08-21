// components/permissions/RolePermissionMatrix.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEye,
  faEdit,
  faTrash,
  faDatabase,
  faChevronDown,
  faChevronRight,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faExclamationCircle,
  faShieldAlt,
  faFilter,
  faTimes,
  faSearch,
  faExpandAlt,
  faCompressAlt,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const RolePermissionMatrix = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState({});
  const [expandedResource, setExpandedResource] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [allExpanded, setAllExpanded] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Config Axios
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = API_BASE_URL;
  }, [API_BASE_URL]);

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [rolesRes, permissionsRes, rpRes] = await Promise.all([
          axios.get('/roles'),
          axios.get('/permissions'),
          axios.get('/role-permissions'),
        ]);

        const rolesData = rolesRes.data.data || rolesRes.data || [];
        const permissionsData = permissionsRes.data.data?.data || permissionsRes.data || [];
        const rpData = rpRes.data.data?.data || rpRes.data.data || [];

        setRoles(rolesData);
        setPermissions(permissionsData);

        // Extraire les resources uniques
        const uniqueResources = [...new Set(permissionsData.map(p => p.resource).filter(Boolean))];
        setResources(uniqueResources);

        setRolePermissions(
          rpData.map(rp => ({
            role_id: rp.role_id,
            permission_id: rp.permission_id,
          }))
        );
      } catch (err) {
        console.error('Erreur chargement:', err);
        setError(t('failed_to_load_permissions_matrix') || 'Échec du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t]);

  // Filtrer les ressources basé sur la recherche
  const filteredResources = useMemo(() => {
    if (!searchTerm) return resources;
    return resources.filter(resource => 
      resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t(resource, resource).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [resources, searchTerm, t]);

  // Actions CRUD
  const actions = [
    { key: 'create', label: t('create'), icon: faPlus, color: 'text-green-600' },
    { key: 'read', label: t('read'), icon: faEye, color: 'text-blue-600' },
    { key: 'update', label: t('edit'), icon: faEdit, color: 'text-yellow-600' },
    { key: 'delete', label: t('delete'), icon: faTrash, color: 'text-red-600' },
  ];

  const getPermission = (resource, action) => {
    return permissions.find(p => p.action === `${resource}.${action}`);
  };

  const hasPermission = (roleId, resource, action) => {
    const perm = getPermission(resource, action);
    if (!perm) return false;
    return rolePermissions.some(rp => rp.role_id === roleId && rp.permission_id === perm.id);
  };

  const togglePermission = async (roleId, resource, action) => {
    const key = `${roleId}-${resource}-${action}`;
    if (pending[key]) return;

    const perm = getPermission(resource, action);
    if (!perm) {
      alert(t('permission_not_found', { action, resource }));
      return;
    }

    const has = hasPermission(roleId, resource, action);
    const newHas = !has;

    // Optimistic update
    setPending(prev => ({ ...prev, [key]: true }));
    setRolePermissions(prev => {
      if (newHas) {
        return [...prev, { role_id: roleId, permission_id: perm.id }];
      } else {
        return prev.filter(rp => !(rp.role_id === roleId && rp.permission_id === perm.id));
      }
    });

    try {
      if (newHas) {
        await axios.post('/role-permissions', { role_id: roleId, permission_id: perm.id });
      } else {
        await axios.delete(`/role-permissions/${roleId}/${perm.id}`);
      }
    } catch (err) {
      // Rollback
      setRolePermissions(prev => {
        if (has) {
          return [...prev, { role_id: roleId, permission_id: perm.id }];
        } else {
          return prev.filter(rp => !(rp.role_id === roleId && rp.permission_id === perm.id));
        }
      });
      console.error('Erreur API:', err);
      alert(t('update_permission_error') || 'Impossible de mettre à jour la permission.');
    } finally {
      setPending(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const toggleResourceExpansion = (resource) => {
    setExpandedResource(expandedResource === resource ? null : resource);
  };

  const toggleAllExpansion = () => {
    if (allExpanded) {
      setExpandedResource(null);
    } else {
      // Développer la première ressource filtrée ou la première tout court
      setExpandedResource(filteredResources[0] || resources[0]);
    }
    setAllExpanded(!allExpanded);
  };

  const toggleRoleSelection = (roleId) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const clearSelection = () => setSelectedRoles([]);
  const selectAll = () => setSelectedRoles(roles.map(r => r.id));

  // Rôles affichés
  const displayedRoles = selectedRoles.length === 0 ? roles : roles.filter(r => selectedRoles.includes(r.id));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl mb-3 text-blue-600" />
        <p className="text-lg">{t('loading')}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg flex items-center gap-2 mb-6">
        <FontAwesomeIcon icon={faExclamationCircle} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-30 p-2 rounded-lg">
              <FontAwesomeIcon icon={faShieldAlt} className="text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('permissions_management')}</h3>
              <p className="text-sm opacity-90">{t('click_resource_to_manage')}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t('search_resources')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            
            <button
              onClick={toggleAllExpansion}
              className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FontAwesomeIcon icon={allExpanded ? faCompressAlt : faExpandAlt} />
              <span className="text-sm">{allExpanded ? t('collapse_all') : t('expand_all')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtre des rôles */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 shrink-0">
            <FontAwesomeIcon icon={faFilter} />
            {t('filter_roles')}:
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={selectAll}
              className={`text-xs px-3 py-1 rounded-full ${selectedRoles.length === roles.length ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              {t('all')}
            </button>

            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => toggleRoleSelection(role.id)}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                  selectedRoles.includes(role.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {role.name}
                {selectedRoles.includes(role.id) && (
                  <FontAwesomeIcon icon={faTimes} className="ml-1 w-3 h-3" />
                )}
              </button>
            ))}

            {selectedRoles.length > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs text-red-600 hover:text-red-800 px-2"
              >
                {t('clear_selection')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto relative">
        {/* Indicateur de scroll pour mobile */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 md:hidden"></div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50 z-20"
                style={{ minWidth: '200px' }}
              >
                {t('resource')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                {t('action')}
              </th>
              {displayedRoles.map((role) => (
                <th
                  key={role.id}
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-700"
                  style={{ minWidth: '120px' }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="whitespace-nowrap">{role.name}</span>
                    <span className="text-xs text-gray-500">
                      {actions.filter(a => hasPermission(role.id, role.resource, a.key)).length}/{actions.length}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResources.length === 0 ? (
              <tr>
                <td colSpan={displayedRoles.length + 2} className="p-8 text-center text-gray-500">
                  <FontAwesomeIcon icon={faDatabase} size="3x" className="opacity-30 mb-4" />
                  <p className="text-lg">{t('no_resources_found')}</p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {t('clear_search')}
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredResources.map((resource) => (
                <React.Fragment key={resource}>
                  {/* Ligne de ressource */}
                  <tr
                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                    onClick={() => toggleResourceExpansion(resource)}
                  >
                    <td 
                      className="px-4 py-3 sticky left-0 bg-white group-hover:bg-blue-50 z-10"
                      style={{ minWidth: '200px' }}
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon
                          icon={expandedResource === resource ? faChevronDown : faChevronRight}
                          className="text-gray-400 transition-transform"
                        />
                        <FontAwesomeIcon icon={faDatabase} className="text-blue-600" />
                        <span className="font-medium text-gray-900 whitespace-nowrap">
                          {t(resource, resource)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {expandedResource === resource
                        ? t('tap_to_collapse')
                        : t('tap_to_configure')}
                    </td>
                    {displayedRoles.map((role) => {
                      const granted = actions.filter(a => hasPermission(role.id, resource, a.key)).length;
                      const total = actions.length;
                      const percent = Math.round((granted / total) * 100);

                      return (
                        <td key={role.id} className="px-4 py-3 text-center">
                          <div 
                            className="flex flex-col items-center gap-1 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleResourceExpansion(resource);
                            }}
                          >
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  percent === 100 
                                    ? 'bg-green-500' 
                                    : percent > 0 
                                      ? 'bg-blue-500' 
                                      : 'bg-gray-200'
                                }`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 whitespace-nowrap">
                              {granted}/{total}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Actions détaillées */}
                  {expandedResource === resource &&
                    actions.map((action) => (
                      <tr key={action.key} className="hover:bg-gray-50">
                        <td 
                          className="px-4 py-2 sticky left-0 bg-white hover:bg-gray-50 z-10"
                          style={{ minWidth: '200px' }}
                        ></td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                            <FontAwesomeIcon icon={action.icon} className={action.color} />
                            {action.label}
                          </div>
                        </td>
                        {displayedRoles.map((role) => {
                          const has = hasPermission(role.id, resource, action.key);
                          const isPending = pending[`${role.id}-${resource}-${action.key}`];

                          return (
                            <td key={role.id} className="px-4 py-2 text-center">
                              {isPending ? (
                                <div className="flex justify-center">
                                  <FontAwesomeIcon
                                    icon={faSpinner}
                                    className="animate-spin text-blue-600"
                                  />
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePermission(role.id, resource, action.key);
                                  }}
                                  className={`relative w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center text-white font-medium text-sm ${
                                    has
                                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg'
                                      : 'bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600'
                                  }`}
                                  title={has ? t('revoke_permission') : t('grant_permission')}
                                  aria-label={`${has ? t('revoke') : t('grant')} ${action.label} ${t('permission_for')} ${role.name}`}
                                >
                                  {has ? (
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                  ) : (
                                    <FontAwesomeIcon icon={faPlus} />
                                  )}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Légende et informations */}
      <div className="px-6 py-3 bg-gray-50 text-xs text-gray-600 border-t">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              {t('all_permissions_granted')}
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              {t('some_permissions_granted')}
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-300"></div>
              {t('no_permissions_granted')}
            </span>
          </div>
          
          <div className="text-gray-500">
            {t('showing')} {filteredResources.length} {t('of')} {resources.length} {t('resources')}
            {searchTerm && ` (${t('filtered')})`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionMatrix;