import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { updateUser } from '../../../../store/slices/Slice';
import axios from 'axios';
import {
  faUser,
  faEnvelope,
  faPhone,
  faCalendarAlt,
  faMapMarkerAlt,
  faIdBadge,
  faCheck,
  faTimes,
  faExclamationTriangle,
  faEdit,
  faSave,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

const ProfileForm = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthdate: '',
    roles: [],
    address: '',
    isActive: false,
    emailVerified: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // snapshot initial pour Annuler
  const initialFormRef = useRef(null);
  // éviter d’empiler des interceptors
  const interceptorAddedRef = useRef(false);

  const userId = useSelector((state) => state?.library?.auth?.user?.id);

  const normalizeRoles = (roles) => {
    if (!roles) return ['User'];
    if (Array.isArray(roles)) {
      const names = roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean);
      return names.length ? names : ['User'];
    }
    if (typeof roles === 'object') return [roles?.name || 'User'];
    if (typeof roles === 'string') return [roles];
    return ['User'];
  };

  useEffect(() => {
    if (interceptorAddedRef.current) return;
    axios.defaults.headers.common['Accept'] = 'application/json';
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    const id = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );
    interceptorAddedRef.current = true;
    return () => axios.interceptors.request.eject(id);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/user/${userId}/profile`);

        const normalizedRoles = normalizeRoles(
          response?.data?.roles?.[0]?.name || response?.data?.roles || 'User'
        );

        const next = {
          username: response.data.user?.username || '',
          firstName: response.data.user?.first_name || '',
          lastName: response.data.user?.last_name || '',
          email: response.data.user?.email || '',
          phone: response.data.user?.phone || '',
          birthdate: response.data.user?.birthdate || '',
          roles: normalizedRoles,
          address: response.data.user?.address || '',
          isActive: !!response.data.user?.is_active,
          emailVerified: response.data.user?.email_verified_at !== null,
        };

        setFormData(next);
        initialFormRef.current = next;
        dispatch(updateUser(response.data.user));
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || t('fetch_error'));
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchUserProfile();
  }, [userId, t, dispatch]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (validationErrors[id]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    setIsEditing(true);
    setError(null);
    setShowSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setValidationErrors({});
    try {
      await axios.post(`/user/${userId}/edit`, {
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.birthdate,
        address: formData.address,
      });
      setIsEditing(false);
      initialFormRef.current = formData;
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      if (err.response?.status === 422) {
        setValidationErrors(err.response.data.errors || {});
        setError(t('validation_error'));
      } else {
        setError(err.response?.data?.message || t('update_error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setValidationErrors({});
    if (initialFormRef.current) setFormData(initialFormRef.current);
  };

  const getValidationError = (field) =>
    validationErrors?.[field] ? validationErrors[field][0] : null;

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-200 rounded" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
            <div className="h-6 w-24 bg-gray-200 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
          <div className="h-24 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const ReadOnlyClass =
    'border border-gray-100 bg-gray-50 text-gray-700 placeholder-gray-400';
  const EditableBase =
    'border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const LabelColor = isEditing ? 'text-blue-600' : 'text-gray-500';
  const IconColor = isEditing ? 'text-blue-500' : 'text-gray-400';

  return (
    <div className="space-y-6">
      {/* Header : titre + rôles + actions (style d’origine : Annuler/Enregistrer dans le header) */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faUser} className="mr-3 text-blue-600" />
            {t('title')}
          </h2>

          {/* Rôles sous le titre */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {Array.isArray(formData.roles) && formData.roles.length > 0 ? (
              formData.roles.map((role, idx) => (
                <span
                  key={`${role}-${idx}`}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {typeof role === 'object' ? role?.name : role}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                {t('no_roles')}
              </span>
            )}
          </div>

          {/* messages */}
          {showSuccess && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              <span className="text-sm">{t('update_success')}</span>
            </div>
          )}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Actions header : 
            - Non édition -> "Modifier"
            - En édition -> "Annuler" + "Enregistrer" (style d’origine)
        */}
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={handleEditClick}
              className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition shadow-sm"
              disabled={loading}
            >
              <FontAwesomeIcon icon={faEdit} className="mr-2" />
              {t('edit')}
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition shadow-sm disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {t('save')}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`bg-white p-6 rounded-xl shadow-sm border ${isEditing ? 'border-gray-200' : 'border-gray-100'}`}>
        {/* Champs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            id="username"
            icon={faUser}
            label={t('username')}
            value={formData.username}
            onChange={handleInputChange}
            disabled={!isEditing}
            isEditing={isEditing}
            error={getValidationError('username')}
            placeholder={t('username_placeholder')}
          />
          <Field
            id="firstName"
            icon={faUser}
            label={t('first_name')}
            value={formData.firstName}
            onChange={handleInputChange}
            disabled={!isEditing}
            isEditing={isEditing}
            error={getValidationError('firstName')}
            placeholder={t('first_name_placeholder')}
          />
          <Field
            id="lastName"
            icon={faUser}
            label={t('last_name')}
            value={formData.lastName}
            onChange={handleInputChange}
            disabled={!isEditing}
            isEditing={isEditing}
            error={getValidationError('lastName')}
            placeholder={t('last_name_placeholder')}
          />
          <Field
            id="email"
            type="email"
            icon={faEnvelope}
            label={t('email')}
            value={formData.email}
            onChange={handleInputChange}
            disabled={!isEditing}
            isEditing={isEditing}
            error={getValidationError('email')}
            placeholder={t('email_placeholder')}
          />
          <Field
            id="phone"
            type="tel"
            icon={faPhone}
            label={t('phone')}
            value={formData.phone}
            onChange={handleInputChange}
            disabled={!isEditing}
            isEditing={isEditing}
            error={getValidationError('phone')}
            placeholder={t('phone_placeholder')}
          />
          <Field
            id="birthdate"
            type="date"
            icon={faCalendarAlt}
            label={t('birthdate')}
            value={formData.birthdate}
            onChange={handleInputChange}
            disabled={!isEditing}
            isEditing={isEditing}
            error={getValidationError('birthdate')}
          />
        </div>

        {/* Adresse */}
        <div className="mt-6">
          <label
            htmlFor="address"
            className={`block text-sm font-medium mb-2 ${LabelColor}`}
          >
            <FontAwesomeIcon icon={faMapMarkerAlt} className={`mr-2 ${IconColor}`} />
            {t('address')}
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 pointer-events-none">
              <FontAwesomeIcon icon={faMapMarkerAlt} className={`${isEditing ? 'text-gray-400' : 'text-gray-300'}`} />
            </div>
            <textarea
              id="address"
              rows="2"
              value={formData.address}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200 resize-none ${
                isEditing
                  ? `border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${getValidationError('address') ? 'border-red-300' : 'border-gray-300'}`
                  : `${ReadOnlyClass}`
              }`}
              placeholder={isEditing ? t('address_placeholder') : ''}
              aria-invalid={!!getValidationError('address')}
            />
          </div>
          {getValidationError('address') && (
            <p className="text-red-500 text-xs mt-1">{getValidationError('address')}</p>
          )}
        </div>

        {/* Statuts */}
        <div className="mt-8 pt-6 border-top border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faIdBadge} className="mr-2 text-blue-600" />
            {t('account_status')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-3 ${formData.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('account_status')}</p>
                  <p className="text-xs text-gray-600">
                    {formData.isActive ? t('active') : t('inactive')}
                  </p>
                </div>
              </div>
              <FontAwesomeIcon
                icon={formData.isActive ? faCheck : faTimes}
                className={`${formData.isActive ? 'text-green-500' : 'text-red-500'}`}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full mr-3 ${formData.emailVerified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('email_verification')}</p>
                  <p className="text-xs text-gray-600">
                    {formData.emailVerified ? t('verified') : t('not_verified')}
                  </p>
                </div>
              </div>
              <FontAwesomeIcon
                icon={formData.emailVerified ? faCheck : faExclamationTriangle}
                className={`${formData.emailVerified ? 'text-green-500' : 'text-yellow-600'}`}
              />
            </div>
          </div>

          {!formData.emailVerified && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-800">{t('email_not_verified')}</span>
              </div>
              <button className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition">
                {t('resend_email')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Champ réutilisable
const Field = ({
  id,
  label,
  icon,
  value,
  onChange,
  disabled,
  isEditing,
  error,
  type = 'text',
  placeholder = '',
}) => {
  const base = 'w-full pl-10 pr-4 py-2.5 rounded-lg transition-all duration-200';
  const editable = 'border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const readonly = 'border border-gray-100 bg-gray-50 text-gray-700';
  const borderColor = error ? 'border-red-300' : 'border-gray-300';

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className={`block text-sm font-medium mb-1.5 flex items-center ${isEditing ? 'text-blue-600' : 'text-gray-500'}`}
      >
        <FontAwesomeIcon icon={icon} className={`mr-2 ${isEditing ? 'text-blue-500' : 'text-gray-400'}`} />
        <span className={`font-semibold ${isEditing ? 'text-blue-600' : 'text-gray-600'}`}>{label}</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FontAwesomeIcon icon={icon} className={`${isEditing ? 'text-gray-400' : 'text-gray-300'}`} />
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${base} ${disabled ? readonly : `${editable} ${borderColor}`}`}
          placeholder={placeholder}
          aria-invalid={!!error}
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default ProfileForm;
