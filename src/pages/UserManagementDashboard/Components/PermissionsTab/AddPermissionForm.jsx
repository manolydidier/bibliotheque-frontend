// components/permissions/AddPermissionForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faCheckCircle,
  faTable,
  faBolt,
  faTag,
  faAlignLeft,
  faChevronDown,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const AddPermissionForm = ({ onClose, onPermissionAdded }) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  // Messages
  const [topErrors, setTopErrors] = useState([]);     // liste de messages globaux (bannière)
  const [fieldErrors, setFieldErrors] = useState({}); // { name: '...', resource: '...', action: '...' }
  const [success, setSuccess] = useState('');

  // Tables
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    resource: '',
    action: '',
  });

  // CRUD de base
  const crudActions = useMemo(
    () => [
      { value: 'create', label: t('action_create') || 'Create', color: 'text-green-600' },
      { value: 'read',   label: t('action_read')   || 'Read',   color: 'text-blue-600' },
      { value: 'update', label: t('action_update') || 'Update', color: 'text-yellow-600' },
      { value: 'delete', label: t('action_delete') || 'Delete', color: 'text-red-600'   },
      { value: 'CRUD', label: t('action_crud') || 'crud', color: 'text-red-600'   },
      
    ],
    [t]
  );

  // Charger les tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoadingTables(true);
        const response = await axios.get('/tables');
        if (response.data?.success && Array.isArray(response.data.tables)) {
          setTables(response.data.tables);
        } else if (Array.isArray(response.data)) {
          setTables(response.data);
        } else if (Array.isArray(response.data?.tables)) {
          setTables(response.data.tables);
        } else {
          throw new Error();
        }
      } catch {
        setTopErrors([t('failed_to_load_tables') || 'Échec du chargement des tables']);
      } finally {
        setLoadingTables(false);
      }
    };
    fetchTables();
  }, [t]);

  // Helpers erreurs
  const clearAllErrors = () => { setTopErrors([]); setFieldErrors({}); };
  const setFieldError = (field, message) => setFieldErrors(prev => ({ ...prev, [field]: message }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    // En changeant de ressource on reset l'action
    if (name === 'resource') {
      setFormData(prev => ({ ...prev, resource: value, action: '' }));
      // on efface l'erreur liée à resource et action
      setFieldErrors(prev => {
        const n = { ...prev };
        delete n.resource;
        delete n.action;
        return n;
      });
      setTopErrors([]);
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    // effacer l'erreur du champ modifié
    setFieldErrors(prev => {
      if (!prev[name]) return prev;
      const n = { ...prev };
      delete n[name];
      return n;
    });
    setTopErrors([]);
  };

  // Détection ressources spéciales
  const res = (formData.resource || '').toLowerCase();
  const isComments = ['commentaire', 'commentaires', 'comment', 'comments'].includes(res);
  const isArticles = ['article', 'articles', 'post', 'posts'].includes(res);

  // Actions générées dynamiquement
  const generatedActions = formData.resource
    ? [
        ...crudActions.map(action => ({
          value: `${formData.resource}.${action.value}`,
          label: `${action.label} (${formData.resource})`,
          color: action.color,
        })),
        ...(isComments
          ? [{
              value: `${formData.resource}.moderator`,
              label: `${t('action_moderate','Moderate')} (${formData.resource})`,
              color: 'text-purple-600',
            }]
          : []),
        ...(isArticles
          ? [{
              value: `${formData.resource}.read_private`,
              label: `${t('action_read_private','Read private')} (${formData.resource})`,
              color: 'text-indigo-600',
            }]
          : []),
      ]
    : [];

  // Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAllErrors();
    setSuccess('');

    // Validation minimale côté client
    const localErrors = {};
    if (!formData.name) localErrors.name = t('validation_name_required') || 'Le nom est obligatoire.';
    if (!formData.resource) localErrors.resource = t('validation_resource_required') || 'La ressource est obligatoire.';
    if (!formData.action) localErrors.action = t('validation_action_required') || 'L’action est obligatoire.';
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setTopErrors([t('fill_required_fields') || 'Veuillez remplir tous les champs obligatoires.']);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        resource: formData.resource,
        action: formData.action,
      };
      const response = await axios.post('/permissions', payload);

      if (response.data?.status === 'success' || response.status === 201) {
        setSuccess(t('permission_created_success') || 'Permission créée avec succès');
        onPermissionAdded?.(response.data?.data || payload);
        setTimeout(() => onClose?.(), 1200);
      } else {
        // Cas rare : backend renvoie une autre forme
        const msg = response.data?.message || 'Erreur inconnue';
        setTopErrors([msg]);
      }
    } catch (err) {
      // ----- Gestion PROPRE des erreurs 422 Laravel -----
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 422 && data) {
        const backendMsg = data.message;               // ex: "validation.failed"
        const backendErrors = data.errors || {};       // ex: { name: ["The name has already been taken."] }
        const newFieldErrors = {};
        const topList = [];

        // Mapper chaque champ
        Object.entries(backendErrors).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages[0] : String(messages || '');
          newFieldErrors[field] = msg || t('validation_error') || 'Champ invalide.';
          topList.push(`${field}: ${newFieldErrors[field]}`);
        });

        // Si pas d'erreurs champ, montrer message générique
        if (topList.length === 0 && backendMsg) topList.push(backendMsg);

        setFieldErrors(newFieldErrors);
        setTopErrors(topList.length ? topList : [t('failed_to_create_permission') || 'Échec de création de la permission']);
      } else {
        // Autres erreurs (500, 403, réseau…)
        const fallback =
          err?.response?.data?.message ||
          err?.message ||
          (t('failed_to_create_permission') || 'Échec de création de la permission');
        setTopErrors([fallback]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Rendu d’un message d’erreur sous champ
  const FieldError = ({ name }) => {
    const msg = fieldErrors?.[name];
    if (!msg) return null;
    return (
      <p className="mt-1 text-sm text-red-600" id={`${name}-error`}>
        {msg}
      </p>
    );
  };

  // Styles conditionnels d’input
  const inputClass = (hasError) =>
    `w-full border rounded-lg p-3 transition focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      hasError ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">{t('add_new_permission')}</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
              aria-label={t('close') || 'Fermer'}
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
          <p className="text-blue-100 mt-2 text-sm">
            {t('permission_form_description') || 'Créez une nouvelle permission pour contrôler l\'accès aux ressources'}
          </p>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Bannière d’erreurs globales */}
          {topErrors.length > 0 && (
            <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              <div className="flex items-start gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 text-red-500" />
                <div className="space-y-1">
                  {topErrors.map((msg, i) => (
                    <div key={i} className="text-sm">{msg}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Succès */}
          {success && (
            <div className="p-3 mb-4 bg-green-50 text-green-700 rounded-lg flex items-center border border-green-200">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-3 text-green-500" />
              <span>{success}</span>
            </div>
          )}

          {/* Formulaire */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Nom */}
              <div>
                <label htmlFor="perm-name" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FontAwesomeIcon icon={faTag} className="mr-2 text-gray-400" />
                  {t('name')} <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  id="perm-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputClass(!!fieldErrors.name)}
                  placeholder={t('permission_name_placeholder') || 'ex: Gestion des utilisateurs'}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  disabled={submitting}
                />
                <FieldError name="name" />
              </div>

              {/* Resource (table) */}
              <div>
                <label htmlFor="perm-resource" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FontAwesomeIcon icon={faTable} className="mr-2 text-gray-400" />
                  {t('resource')} <span className="text-red-500 ml-1">*</span>
                </label>
                {loadingTables ? (
                  <div className="flex items-center text-gray-500 text-sm p-3 bg-gray-50 rounded-lg">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    {t('loading_tables') || 'Chargement des tables...'}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id="perm-resource"
                      name="resource"
                      value={formData.resource}
                      onChange={handleChange}
                      className={`${inputClass(!!fieldErrors.resource)} appearance-none pr-10`}
                      aria-invalid={!!fieldErrors.resource}
                      aria-describedby={fieldErrors.resource ? 'resource-error' : undefined}
                      disabled={submitting}
                    >
                      <option value="">{t('select_table') || 'Sélectionnez une table'}</option>
                      {tables.map((table, index) => (
                        <option key={index} value={table}>
                          {table}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <FontAwesomeIcon icon={faChevronDown} className="h-4 w-4" />
                    </div>
                  </div>
                )}
                <FieldError name="resource" />
              </div>

              {/* Action */}
              <div>
                <label htmlFor="perm-action" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FontAwesomeIcon icon={faBolt} className="mr-2 text-gray-400" />
                  {t('action')} <span className="text-red-500 ml-1">*</span>
                </label>
                {!formData.resource ? (
                  <div className="text-gray-400 text-sm italic p-3 bg-gray-50 rounded-lg">
                    {t('select_table_first_to_see_actions') || 'Sélectionnez une table pour voir les actions disponibles'}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id="perm-action"
                      name="action"
                      value={formData.action}
                      onChange={handleChange}
                      className={`${inputClass(!!fieldErrors.action)} appearance-none pr-10`}
                      aria-invalid={!!fieldErrors.action}
                      aria-describedby={fieldErrors.action ? 'action-error' : undefined}
                      disabled={submitting}
                    >
                      <option value="">{t('select_action') || 'Sélectionnez une action'}</option>
                      {generatedActions.map((action, index) => (
                        <option key={index} value={action.value}>
                          {action.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <FontAwesomeIcon icon={faChevronDown} className="h-4 w-4" />
                    </div>
                  </div>
                )}
                <FieldError name="action" />
                {(isComments || isArticles) && (
                  <p className="mt-2 text-xs text-gray-500">
                    {isComments && (t('hint_comments_special', 'Action spéciale disponible : modération des commentaires.'))}
                    {isComments && isArticles && ' • '}
                    {isArticles && (t('hint_articles_private', 'Action spéciale disponible : lecture des articles privés.'))}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="perm-description" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FontAwesomeIcon icon={faAlignLeft} className="mr-2 text-gray-400" />
                  {t('description')}
                </label>
                <textarea
                  id="perm-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className={inputClass(!!fieldErrors.description)}
                  placeholder={t('optional_description_placeholder') || 'Description optionnelle de cette permission...'}
                  disabled={submitting}
                />
                <FieldError name="description" />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  {t('cancel') || 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.resource || !formData.action}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 disabled:opacity-70 transition flex items-center shadow-md hover:shadow-lg"
                >
                  {submitting && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
                  {t('create_permission') || 'Créer la permission'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPermissionForm;
