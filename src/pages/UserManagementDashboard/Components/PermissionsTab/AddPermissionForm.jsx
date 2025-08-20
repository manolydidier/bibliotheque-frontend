// components/permissions/AddPermissionForm.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faCheckCircle, faTable, faBolt, faTag, faAlignLeft, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const AddPermissionForm = ({ onClose, onPermissionAdded }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    resource: '',
    action: '',
  });

  // Actions CRUD disponibles avec traductions
  const crudActions = [
    { value: 'create', label: t('action_create'), color: 'text-green-600' },
    { value: 'read', label: t('action_read'), color: 'text-blue-600' },
    { value: 'update', label: t('action_update'), color: 'text-yellow-600' },
    { value: 'delete', label: t('action_delete'), color: 'text-red-600' }
  ];

  // Charger les tables au montage
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoadingTables(true);
        const response = await axios.get('/tables');
        if (response.data.success && Array.isArray(response.data.tables)) {
          setTables(response.data.tables);
        } else {
          throw new Error(t('failed_to_load_tables'));
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
          t('failed_to_load_tables') ||
          'Échec du chargement des tables'
        );
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTables();
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Générer les options d'actions basées sur la table
  const generatedActions = formData.resource
    ? crudActions.map(action => ({
        value: `${formData.resource}.${action.value}`,
        label: `${action.label} (${formData.resource})`,
        color: action.color
      }))
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.resource || !formData.action) {
      setError(t('fill_required_fields') || 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/permissions', formData);

      if (response.data.status === 'success') {
        setSuccess(t('permission_created_success') || 'Permission créée avec succès');
        onPermissionAdded?.(response.data.data);
        setTimeout(() => onClose(), 1500);
      } else {
        throw new Error(response.data.message || 'Erreur inconnue');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        t('failed_to_create_permission') ||
        'Échec de création de la permission'
      );
    } finally {
      setSubmitting(false);
    }
  };

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
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
          <p className="text-blue-100 mt-2 text-sm">
            {t('permission_form_description') || 'Créez une nouvelle permission pour contrôler l\'accès aux ressources'}
          </p>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Messages d'alerte */}
          {error && (
            <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg flex items-center border border-red-200">
              <FontAwesomeIcon icon={faTimes} className="mr-3 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 mb-4 bg-green-50 text-green-700 rounded-lg flex items-center border border-green-200">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-3 text-green-500" />
              <span>{success}</span>
            </div>
          )}

          {/* Formulaire */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FontAwesomeIcon icon={faTag} className="mr-2 text-gray-400" />
                  {t('name')} <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder={t('permission_name_placeholder') || 'ex: Gestion des utilisateurs'}
                />
              </div>

              {/* Resource (table) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FontAwesomeIcon icon={faTable} className="mr-2 text-gray-400" />
                  {t('resource')} <span className="text-red-500 ml-1">*</span>
                </label>
                {loadingTables ? (
                  <div className="flex items-center text-gray-500 text-sm p-3 bg-gray-50 rounded-lg">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    {t('loading_tables')}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      name="resource"
                      value={formData.resource}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-3 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pr-10"
                      disabled={submitting}
                    >
                      <option value="">{t('select_table')}</option>
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
              </div>

              {/* Action (liste déroulante dynamique) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
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
                      name="action"
                      value={formData.action}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-3 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pr-10"
                      disabled={submitting}
                    >
                      <option value="">{t('select_action')}</option>
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
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FontAwesomeIcon icon={faAlignLeft} className="mr-2 text-gray-400" />
                  {t('description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder={t('optional_description_placeholder') || 'Description optionnelle de cette permission...'}
                />
              </div>

              {/* Boutons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.resource || !formData.action}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 disabled:opacity-70 transition flex items-center shadow-md hover:shadow-lg"
                >
                  {submitting && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
                  {t('create_permission')}
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