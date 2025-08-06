import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { refreshListUser } from '../../../../store/slices/Slice';
import {
  faTimes,
  faSave,
  faEdit,
  faPlus,
  faSignature,
  faAlignLeft,
  faExclamationCircle,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { toast } from '../../../../component/toast/toast';
import { useDispatch } from 'react-redux';

const RoleModal = ({ show, onClose, initialData = null }) => {
  const { t } = useTranslation();
  const nameInputRef = useRef(null);
  const modalRef = useRef();
  const dispatch = useDispatch();

  // Liste des permissions (à charger dynamiquement si possible)
  const allPermissions = [
    'user.view',
    'user.create',
    'user.edit',
    'user.delete',
    'role.view',
    'role.create',
    'role.edit',
    'role.delete',
    'permission.manage',
  ];

  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: false,
    is_admin: false,
    permissions: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Configuration Axios
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = API_BASE_URL;
  }, []);

  // Remplissage des données en mode édition
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        is_active: initialData.is_active ?? false,
        is_admin: initialData.is_admin ?? false,
        permissions: initialData.permissions?.map(p => p.name) || [], // Ajuste selon ton API
      });
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: false,
        is_admin: false,
        permissions: [],
      });
    }
    setErrors({});
  }, [initialData, show]);

  // Focus automatique
  useEffect(() => {
    if (show && nameInputRef.current) {
      const timer = setTimeout(() => nameInputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [show]);

  // Échap pour fermer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (show) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  // Clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (show) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'permissions') {
      setFormData((prev) => ({
        ...prev,
        permissions: checked
          ? [...prev.permissions, value]
          : prev.permissions.filter((p) => p !== value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('name_required');
    } else if (formData.name.length > 50) {
      newErrors.name = t('name_too_long', { max: 50 });
    }
    if (formData.description.length > 500) {
      newErrors.description = t('description_too_long', { max: 500 });
    }
    if (typeof formData.is_active !== 'boolean') {
      newErrors.is_active = t('is_active_required');
    }
    if (typeof formData.is_admin !== 'boolean') {
      newErrors.is_admin = t('is_admin_required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        is_admin: formData.is_admin,
        permissions: formData.permissions, // Envoie la liste des permissions
      };

      if (initialData) {
        await axios.put(`/roles/${initialData.id}`, payload);
        toast.success(t('role_updated'));
      } else {
        await axios.post('/roles/insert', payload);
        toast.success(t('role_created'));
      }

      dispatch(refreshListUser("true"));
      onClose();
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || {});
      } else {
        console.error('Erreur réseau ou serveur :', error);
        toast.error(t('error_occurred'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  const title = initialData ? t('edit_role') : t('create_role');
  const icon = initialData ? faEdit : faPlus;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center space-x-3">
            <span className="bg-white bg-opacity-20 p-2 rounded-full">
              <FontAwesomeIcon icon={icon} className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="text-white hover:text-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Nom du rôle */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-800 mb-2">
              {t('role_name')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon
                  icon={faSignature}
                  className={`w-5 h-5 ${errors.name ? 'text-red-400' : 'text-gray-400'}`}
                />
              </div>
              <input
                type="text"
                id="name"
                name="name"
                ref={nameInputRef}
                value={formData.name}
                onChange={handleChange}
                maxLength={50}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.name
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder={t('enter_role_name')}
              />
              {errors.name && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <FontAwesomeIcon icon={faExclamationCircle} className="w-5 h-5 text-red-500" />
                </div>
              )}
            </div>
            {errors.name && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <FontAwesomeIcon icon={faExclamationCircle} className="w-3 h-3 mr-1" />
                {errors.name}
              </p>
            )}
            <div className="mt-1 text-right text-xs text-gray-500">
              {formData.name.length}/50 {t('characters')}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-800 mb-2">
              {t('description')}
            </label>
            <div className="relative">
              <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                <FontAwesomeIcon
                  icon={faAlignLeft}
                  className={`w-5 h-5 ${errors.description ? 'text-red-400' : 'text-gray-400'}`}
                />
              </div>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                maxLength={500}
                className={`w-full pl-10 pr-4 py-3 pt-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('enter_description_optional')}
              />
            </div>
            {errors.description && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <FontAwesomeIcon icon={faExclamationCircle} className="w-3 h-3 mr-1" />
                {errors.description}
              </p>
            )}
            <div className="mt-1 text-right text-xs text-gray-500">
              {formData.description.length}/500 {t('characters')}
            </div>
          </div>

          {/* Statut Actif/Inactif */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label
              htmlFor="is_active"
              className="flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="text-sm font-medium text-gray-800">{t('active_role')}</span>
                <p className="text-xs text-gray-500 mt-1">{t('active_role_hint')}</p>
              </div>
              <div className="relative inline-block w-12 align-middle select-none">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div
                  className={`block w-12 h-6 rounded-full transition-colors duration-200 ${
                    formData.is_active ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                ></div>
                <div
                  className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform ${
                    formData.is_active ? 'translate-x-6' : 'translate-x-0'
                  }`}
                ></div>
              </div>
            </label>
            {errors.is_active && (
              <p className="mt-2 text-xs text-red-600">{errors.is_active}</p>
            )}
          </div>

          {/* Rôle Administrateur */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <label
              htmlFor="is_admin"
              className="flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="text-sm font-medium text-purple-800">{t('admin_role')}</span>
                <p className="text-xs text-purple-600 mt-1">{t('admin_role_hint')}</p>
              </div>
              <div className="relative inline-block w-12 align-middle select-none">
                <input
                  type="checkbox"
                  id="is_admin"
                  name="is_admin"
                  checked={formData.is_admin}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div
                  className={`block w-12 h-6 rounded-full transition-colors duration-200 ${
                    formData.is_admin ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                ></div>
                <div
                  className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform ${
                    formData.is_admin ? 'translate-x-6' : 'translate-x-0'
                  }`}
                ></div>
              </div>
            </label>
            {errors.is_admin && (
              <p className="mt-2 text-xs text-red-600">{errors.is_admin}</p>
            )}
          </div>

         

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className={`flex items-center px-5 py-2.5 rounded-lg font-medium text-white transition-all duration-150 shadow-sm ${
                isSubmitting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="w-4 h-4 mr-2" />
                  {initialData ? t('update') : t('create')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;