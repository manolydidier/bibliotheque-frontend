// components/permissions/RoleModal.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSave,
  faEdit,
  faPlus,
  faSignature,
  faAlignLeft,
  faExclamationCircle,
  faSpinner,
  faSearch,
  faBroom,
  faListCheck,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { toast } from '../../../../component/toast/toast';
import { useDispatch } from 'react-redux';
import { refreshListUser } from '../../../../store/slices/Slice';

const extractArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  if (payload?.data?.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
};

const RoleModal = ({ show, onClose, initialData = null }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const nameInputRef = useRef(null);
  const modalRef = useRef(null);
  const backdropRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // ---------- axios isolé ----------
  const axiosClient = useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE_URL,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      timeout: 20000,
    });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return instance;
  }, [API_BASE_URL]);

  // ---------- Form ----------
  const initialForm = useMemo(() => ({
    name:        initialData?.name || '',
    description: initialData?.description || '',
    is_active:   initialData?.is_active ?? false,
    is_admin:    initialData?.is_admin ?? false,
    // on conserve le format "noms/slugs" tel que ton front l’utilise déjà
    permissions: (initialData?.permissions || []).map(p => p?.name ?? p).filter(Boolean),
  }), [initialData]);

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---------- Permissions OPTIONNELLES ----------
  const defaultEnablePerms = Boolean(initialData?.permissions?.length);
  const [enablePerms, setEnablePerms] = useState(defaultEnablePerms);

  // catalogue des permissions (chargé uniquement si enablePerms = true)
  const [allPermissions, setAllPermissions] = useState([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permError, setPermError] = useState('');
  const [permSearch, setPermSearch] = useState('');

  // ---------- UX ----------
  const [confirmCloseNeeded, setConfirmCloseNeeded] = useState(false);

  // a11y id
  const nameId = useId();
  const descriptionId = useId();

  // Re-init quand la modale s’ouvre / change d’item
  useEffect(() => {
    if (!show) return;
    setFormData(initialForm);
    setErrors({});
    setServerError('');
    setEnablePerms(Boolean(initialData?.permissions?.length));   // reset du toggle optionnel
    setTimeout(() => nameInputRef.current?.focus(), 150);
  }, [show, initialForm, initialData]);

  // Charger /permissions UNIQUEMENT si enablePerms = true
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!show || !enablePerms) return;
      setPermLoading(true);
      setPermError('');
      try {
        const res = await axiosClient.get('/permissions');
        const list = extractArray(res.data);
        const norm = list
          .map(p => ({
            name: p?.name ?? p?.action ?? p?.key ?? '',
            description: p?.description ?? '',
            resource: p?.resource ?? (p?.action ? String(p.action).split('.')[0] : ''),
            action: p?.action ?? '',
          }))
          .filter(p => p.name);
        if (!cancelled) setAllPermissions(norm);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setPermError(t('failed_to_load_permissions') || 'Impossible de charger les permissions.');
        }
      } finally {
        if (!cancelled) setPermLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [show, enablePerms, axiosClient, t]);

  // Focus trap + raccourcis
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') attemptClose();

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if ((isCmdOrCtrl && (e.key.toLowerCase() === 's' || e.key === 'Enter'))) {
        e.preventDefault();
        submitForm();
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show]); // eslint-disable-line

  // Backdrop click avec garde
  useEffect(() => {
    if (!show) return;
    const onMouseDown = (e) => {
      if (backdropRef.current && e.target === backdropRef.current) attemptClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [show]); // eslint-disable-line

  // Dirty check
  const isDirty = useMemo(() => {
    const a = initialForm, b = formData;
    const same =
      a.name === b.name &&
      a.description === b.description &&
      a.is_active === b.is_active &&
      a.is_admin === b.is_admin &&
      JSON.stringify([...new Set(a.permissions)].sort()) ===
      JSON.stringify([...new Set(b.permissions)].sort()) &&
      Boolean(initialData?.permissions?.length) === enablePerms;
    return !same;
  }, [initialForm, formData, enablePerms, initialData]);

  const attemptClose = useCallback(() => {
    if (isSubmitting) return;
    if (isDirty) { setConfirmCloseNeeded(true); return; }
    onClose();
  }, [isSubmitting, isDirty, onClose]);

  // Handlers champs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setServerError('');
    if (name === 'permissions') {
      setFormData((prev) => {
        const set = new Set(prev.permissions);
        if (checked) set.add(value);
        else set.delete(value);
        return { ...prev, permissions: Array.from(set) };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('name_required') || 'Le nom est requis.';
    else if (formData.name.length > 50) newErrors.name = t('name_too_long', { max: 50 }) || 'Nom trop long (50 max).';
    if (formData.description.length > 500) newErrors.description = t('description_too_long', { max: 500 }) || 'Description trop longue (500 max).';
    if (typeof formData.is_active !== 'boolean') newErrors.is_active = t('is_active_required') || 'Champ requis.';
    if (typeof formData.is_admin !== 'boolean') newErrors.is_admin = t('is_admin_required') || 'Champ requis.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Payload + submit
  const submitForm = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});
    setServerError('');

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      is_active: !!formData.is_active,
      is_admin:  !!formData.is_admin,
    };

    // ✅ Permissions vraiment optionnelles : uniquement si toggle ON ET non vide
    if (enablePerms && formData.permissions?.length) {
      payload.permissions = formData.permissions; // noms/slugs selon ton API
    }

    try {
      if (initialData?.id) {
        // update
        await axiosClient.put(`/roles/${initialData.id}`, payload);
        toast.success(t('role_updated') || 'Rôle mis à jour.');
      } else {
        // create (ton API semble utiliser /roles/insert)
        await axiosClient.post('/roles/insert', payload);
        toast.success(t('role_created') || 'Rôle créé.');
      }
      dispatch(refreshListUser('true'));
      onClose();
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data?.errors || {});
      } else {
        console.error('Erreur réseau/serveur :', error);
        setServerError(t('error_occurred') || 'Une erreur est survenue.');
        toast.error(t('error_occurred') || 'Une erreur est survenue.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); submitForm(); };

  const resetToInitial = () => {
    setFormData(initialForm);
    setEnablePerms(Boolean(initialData?.permissions?.length));
    setErrors({});
    setServerError('');
  };

  // Filtre permissions (quand activé)
  const filteredPermissions = useMemo(() => {
    if (!enablePerms) return [];
    const term = permSearch.trim().toLowerCase();
    if (!term) return allPermissions;
    return allPermissions.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      (p.resource || '').toLowerCase().includes(term) ||
      (p.action || '').toLowerCase().includes(term)
    );
  }, [enablePerms, allPermissions, permSearch]);

  const selectedSet = useMemo(() => new Set(formData.permissions), [formData.permissions]);

  const toggleAllFiltered = (selectAll) => {
    if (!enablePerms) return;
    if (selectAll) {
      const merged = new Set(formData.permissions);
      filteredPermissions.forEach(p => merged.add(p.name));
      setFormData(prev => ({ ...prev, permissions: Array.from(merged) }));
    } else {
      const filteredNames = new Set(filteredPermissions.map(p => p.name));
      const kept = formData.permissions.filter(n => !filteredNames.has(n));
      setFormData(prev => ({ ...prev, permissions: kept }));
    }
  };

  // ---------- Render ----------
  if (!show) return null;

  const title = initialData ? (t('edit_role') || 'Modifier le rôle') : (t('create_role') || 'Créer un rôle');
  const icon  = initialData ? faEdit : faPlus;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-scale-in overflow-hidden"
      >
        {/* Header (bleu) */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center space-x-3">
            <span className="bg-white/20 p-2 rounded-full">
              <FontAwesomeIcon icon={icon} className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-semibold">{title}</h3>
          </div>
          <button onClick={attemptClose} aria-label={t('close') || 'Fermer'} className="text-white hover:text-gray-200">
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
        </div>

        {/* Erreur serveur */}
        {serverError && (
          <div className="px-6 py-3 bg-red-50 text-red-700 border-b border-red-200 text-sm flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Nom */}
          <div>
            <label htmlFor={nameId} className="block text-sm font-medium text-gray-800 mb-2">
              {t('role_name') || 'Nom du rôle'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSignature} className={`w-5 h-5 ${errors.name ? 'text-red-400' : 'text-gray-400'}`} />
              </div>
              <input
                type="text"
                id={nameId}
                name="name"
                ref={nameInputRef}
                value={formData.name}
                onChange={handleChange}
                maxLength={50}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder={t('enter_role_name') || 'Saisir le nom du rôle'}
              />
              {errors.name && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <FontAwesomeIcon icon={faExclamationCircle} className="w-5 h-5 text-red-500" />
                </div>
              )}
            </div>
            {errors.name && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <FontAwesomeIcon icon={faExclamationCircle} className="w-3 h-3 mr-1" /> {errors.name}
              </p>
            )}
            <div className="mt-1 text-right text-xs text-gray-500">
              {formData.name.length}/50 {t('characters') || 'caractères'}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor={descriptionId} className="block text-sm font-medium text-gray-800 mb-2">
              {t('description') || 'Description'}
            </label>
            <div className="relative">
              <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                <FontAwesomeIcon icon={faAlignLeft} className={`w-5 h-5 ${errors.description ? 'text-red-400' : 'text-gray-400'}`} />
              </div>
              <textarea
                id={descriptionId}
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                maxLength={500}
                className={`w-full pl-10 pr-4 py-3 pt-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('enter_description_optional') || 'Saisir une description (optionnel)'}
              />
            </div>
            {errors.description && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <FontAwesomeIcon icon={faExclamationCircle} className="w-3 h-3 mr-1" /> {errors.description}
              </p>
            )}
            <div className="mt-1 text-right text-xs text-gray-500">
              {formData.description.length}/500 {t('characters') || 'caractères'}
            </div>
          </div>

          {/* Switchs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Actif */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label htmlFor="is_active" className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-gray-800">{t('active_role') || 'Rôle actif'}</span>
                  <p className="text-xs text-gray-500 mt-1">{t('active_role_hint') || 'Si désactivé, le rôle ne peut pas être attribué.'}</p>
                </div>
                <div className="relative inline-block w-12 align-middle select-none">
                  <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} className="sr-only" />
                  <div className={`block w-12 h-6 rounded-full transition-colors duration-200 ${formData.is_active ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform ${formData.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </label>
              {errors.is_active && <p className="mt-2 text-xs text-red-600">{errors.is_active}</p>}
            </div>

            {/* Admin */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label htmlFor="is_admin" className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-blue-900">{t('admin_role') || 'Rôle administrateur'}</span>
                  <p className="text-xs text-blue-700 mt-1">{t('admin_role_hint') || 'Accès étendus. À utiliser avec précaution.'}</p>
                </div>
                <div className="relative inline-block w-12 align-middle select-none">
                  <input type="checkbox" id="is_admin" name="is_admin" checked={formData.is_admin} onChange={handleChange} className="sr-only" />
                  <div className={`block w-12 h-6 rounded-full transition-colors duration-200 ${formData.is_admin ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform ${formData.is_admin ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </label>
              {errors.is_admin && <p className="mt-2 text-xs text-red-600">{errors.is_admin}</p>}
            </div>
          </div>

          {/* Toggle "Permissions (optionnel)" */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label htmlFor="enablePerms" className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {t('configure_permissions_optional') || 'Configurer les permissions (optionnel)'}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {t('configure_permissions_hint') || 'Active pour attribuer des permissions maintenant. Tu pourras aussi le faire plus tard.'}
                </p>
              </div>
              <div className="relative inline-block w-12 align-middle select-none">
                <input
                  type="checkbox"
                  id="enablePerms"
                  checked={enablePerms}
                  onChange={(e) => setEnablePerms(e.target.checked)}
                  className="sr-only"
                />
                <div className={`block w-12 h-6 rounded-full transition-colors duration-200 ${enablePerms ? 'bg-blue-600' : 'bg-gray-300'}`} />
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform ${enablePerms ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>
          </div>

          {/* Permissions picker — visible seulement si activé */}
          {enablePerms && (
            <div className="p-4 border rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-gray-800">{t('permissions') || 'Permissions'}</div>
                <div className="text-xs text-gray-500">{formData.permissions.length} {t('selected') || 'sélectionnée(s)'}</div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('search_permissions') || 'Rechercher une permission…'}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggleAllFiltered(true)} className="px-3 py-2 text-xs rounded-lg border bg-white hover:bg-gray-50">
                    <FontAwesomeIcon icon={faListCheck} className="mr-1" /> {t('select_all') || 'Tout sélectionner'}
                  </button>
                  <button type="button" onClick={() => toggleAllFiltered(false)} className="px-3 py-2 text-xs rounded-lg border bg-white hover:bg-gray-50">
                    <FontAwesomeIcon icon={faBroom} className="mr-1" /> {t('clear_filtered') || 'Effacer (filtrées)'}
                  </button>
                </div>
              </div>

              {permError && (
                <div className="text-sm text-red-600 mb-2 flex items-center gap-2">
                  <FontAwesomeIcon icon={faExclamationCircle} /> {permError}
                </div>
              )}

              <div className="h-48 overflow-auto border rounded-lg p-3 bg-gray-50">
                {permLoading ? (
                  <div className="flex items-center justify-center py-8 text-blue-600">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    {t('loading') || 'Chargement...'}
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-6">
                    {t('no_permissions_found') || 'Aucune permission trouvée.'}
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredPermissions.map((p) => {
                      const checked = selectedSet.has(p.name);
                      return (
                        <li key={p.name} className="bg-white rounded-lg border hover:border-blue-300 transition-colors">
                          <label className="flex items-start gap-3 px-3 py-2 cursor-pointer">
                            <input
                              type="checkbox"
                              name="permissions"
                              value={p.name}
                              checked={checked}
                              onChange={handleChange}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {p.name}
                                {checked && <FontAwesomeIcon icon={faCheck} className="ml-2 text-green-600" />}
                              </div>
                              {(p.description || p.resource) && (
                                <div className="text-xs text-gray-500">
                                  {p.description || `${p.resource}${p.action ? ` • ${p.action}` : ''}`}
                                </div>
                              )}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Chips */}
              {formData.permissions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.permissions.slice(0, 20).map((name) => (
                    <span key={name} className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                      {name}
                      <button
                        type="button"
                        className="ml-1 hover:text-blue-900"
                        onClick={() =>
                          setFormData(prev => ({ ...prev, permissions: prev.permissions.filter(n => n !== name) }))
                        }
                        aria-label={t('remove') || 'Retirer'}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </span>
                  ))}
                  {formData.permissions.length > 20 && (
                    <span className="text-xs text-gray-500">+{formData.permissions.length - 20}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Boutons */}
          <div className="flex flex-wrap justify-between items-center gap-3 pt-5 border-t border-gray-200">
            <button
              type="button"
              onClick={resetToInitial}
              disabled={isSubmitting || !isDirty}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              title={t('reset') || 'Réinitialiser'}
            >
              <FontAwesomeIcon icon={faBroom} className="mr-2" />
              {t('reset') || 'Réinitialiser'}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={attemptClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {t('cancel') || 'Annuler'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className={`flex items-center px-5 py-2.5 rounded-lg font-medium text-white transition-all shadow-sm ${
                  isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                title="Ctrl/Cmd+S"
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 mr-2 animate-spin" />
                    {t('saving') || 'Enregistrement...'}
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="w-4 h-4 mr-2" />
                    {initialData ? (t('update') || 'Mettre à jour') : (t('create') || 'Créer')}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirme fermeture si non enregistré */}
      {confirmCloseNeeded && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3 bg-blue-600 text-white font-medium">
              {t('unsaved_changes') || 'Modifications non enregistrées'}
            </div>
            <div className="p-5 text-gray-700">
              {t('unsaved_changes_prompt') || 'Vous avez des modifications non enregistrées. Voulez-vous vraiment fermer cette fenêtre ?'}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border hover:bg-gray-50" onClick={() => setConfirmCloseNeeded(false)}>
                {t('continue_editing') || 'Continuer la modification'}
              </button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={() => { setConfirmCloseNeeded(false); onClose(); }}>
                {t('discard') || 'Fermer sans enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleModal;
