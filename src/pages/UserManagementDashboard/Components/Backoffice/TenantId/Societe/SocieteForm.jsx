// src/pages/societes/SocieteForm.jsx
// ⚠️ adapte les chemins d’import `api` et `backofficeStyles` si besoin

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiEdit3,
  FiSave,
  FiClock,
  FiUsers,
  FiMapPin,
  FiPhone,
  FiMail,
  FiPlay,
  FiImage,
  FiGlobe,
  FiTrash2,
  FiLoader,
  FiArrowLeft,
} from 'react-icons/fi';
import api from '../../../../../../services/api';
import {
  inputBase,
  card,
  sectionTitle,
  hint,
} from '../ui/backofficeStyles';

/* ---------- Helper drapeau pays ---------- */
const getCountryFlag = (country) => {
  if (!country) return '🌍';
  const c = country.toLowerCase();

  if (c.includes('madagascar')) return '🇲🇬';
  if (c.includes('france')) return '🇫🇷';
  if (c.includes('canada')) return '🇨🇦';
  if (
    c.includes('usa') ||
    c.includes('united states') ||
    c.includes('états-unis')
  )
    return '🇺🇸';

  return '🌍';
};

const SocieteForm = ({ initial, onSaved }) => {
  const { id: idParam } = useParams();
  const navigate = useNavigate();

  const isEditFromRoute = Boolean(idParam);
  const [isEdit, setIsEdit] = useState(isEditFromRoute);

  const [model, setModel] = useState(() => ({
    id: null,
    nom: '',
    sigle: '',
    description: '',
    responsable: '',
    telephone: '',
    email: '',
    adresse: '',
    ville: '',
    pays: 'Madagascar',
    primary_color: '',
    website_url: '',
    logo_url: '',
    statut: 'active', // mappé vers is_active côté API
    created_at: '',
    updated_at: '',
    ...(initial || {}),
  }));

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);

  /* ---------- Helpers erreurs ---------- */

  const fieldErrors = (name) => {
    if (!errors) return [];
    if (Array.isArray(errors[name])) return errors[name];

    if (name === 'nom' && Array.isArray(errors.name)) return errors.name;
    if (name === 'sigle' && Array.isArray(errors.slug)) return errors.slug;
    if (name === 'email' && Array.isArray(errors.contact_email))
      return errors.contact_email;
    if (name === 'telephone' && Array.isArray(errors.contact_phone))
      return errors.contact_phone;
    if (name === 'statut' && Array.isArray(errors.is_active))
      return errors.is_active;
    if (name === 'logo_url') {
      if (Array.isArray(errors.logo_url)) return errors.logo_url;
      if (Array.isArray(errors.logo)) return errors.logo;
    }
    if (name === 'website_url' && Array.isArray(errors.website_url))
      return errors.website_url;
    if (name === 'primary_color' && Array.isArray(errors.primary_color))
      return errors.primary_color;

    return [];
  };

  const hasError = (name) => fieldErrors(name).length > 0;

  const inputClass = (name) =>
    `${inputBase} ${
      hasError(name)
        ? 'border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50/50'
        : ''
    }`;

  const FieldError = ({ name }) => (
    <>
      {fieldErrors(name).map((m, i) => (
        <p key={`${name}-${i}`} className="text-xs text-red-600 mt-1">
          {m}
        </p>
      ))}
    </>
  );

  /* ---------- Preview logo (fichier local) ---------- */

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview('');
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  /* ---------- Helper URL logo (depuis la BDD + VITE_API_BASE_STORAGE) ---------- */

  const buildLogoUrl = (value) => {
    if (!value) return '';

    const s = String(value).trim();

    // Si c'est déjà une URL absolue ou un chemin root, on laisse
    if (
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      s.startsWith('/')
    ) {
      return s;
    }

    // Base : VITE_API_BASE_STORAGE (http://127.0.0.1:8000) ou fallback sur VITE_API_BASE_URL
    const storageBase = (
      import.meta.env.VITE_API_BASE_STORAGE ||
      import.meta.env.VITE_API_BASE_URL ||
      ''
    )
      .replace(/\/api\/?$/i, '') // on enlève /api si présent
      .replace(/\/+$/, ''); // et les trailing slash

    // Exemple: http://127.0.0.1:8000/storage/logos/mon-logo.png
    return storageBase ? `${storageBase}/storage/logos/${s}` : '';
  };

  const previewSrc = logoPreview || buildLogoUrl(model.logo_url);

  /* ---------- Chargement en édition ---------- */

  useEffect(() => {
    if (!isEditFromRoute || initial) return;

    (async () => {
      try {
        const res = await api.get(`/societes/${idParam}`);
        const data = res?.data?.data || res?.data || {};

        setModel((prev) => ({
          ...prev,
          ...(data || {}),
          id: data.id ?? prev.id,
          nom: data.nom ?? data.name ?? prev.nom,
          sigle: data.sigle ?? data.slug ?? prev.sigle,
          description: data.description ?? prev.description,
          responsable: data.responsable ?? prev.responsable,
          email: data.contact_email ?? data.email ?? prev.email,
          telephone: data.contact_phone ?? data.telephone ?? prev.telephone,
          adresse: data.adresse ?? prev.adresse,
          ville: data.ville ?? prev.ville,
          pays: data.pays ?? prev.pays,
          primary_color: data.primary_color ?? prev.primary_color,
          website_url: data.website_url ?? prev.website_url,
          logo_url: data.logo_url ?? prev.logo_url,
          statut:
            data.statut ??
            (typeof data.is_active === 'boolean'
              ? data.is_active
                ? 'active'
                : 'inactive'
              : prev.statut),
          created_at: data.created_at ?? prev.created_at,
          updated_at: data.updated_at ?? prev.updated_at,
        }));

        setIsEdit(true);
      } catch (e) {
        console.error('Erreur chargement société', e);
        setGlobalError(
          "Impossible de charger les informations de la société."
        );
      }
    })();
  }, [isEditFromRoute, idParam, initial]);

  /* ---------- Barre de progression ---------- */

  useEffect(() => {
    if (isSubmitting) {
      setProgress(8);
      progressTimerRef.current = setInterval(() => {
        setProgress((p) =>
          p < 90 ? p + Math.max(1, (90 - p) * 0.1) : 90
        );
      }, 250);
    } else {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
      setTimeout(() => setProgress(0), 400);
    }

    return () => {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    };
  }, [isSubmitting]);

  /* ---------- Form helpers ---------- */

  const onChange = (key, value) => {
    setModel((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const isFormValid = Boolean(model.nom.trim());

  const handleBackToList = () => {
    navigate('/societes');
  };

  /* ---------- SAVE (multipart) ---------- */

  const save = async () => {
    setIsSubmitting(true);
    setErrors({});
    setGlobalError('');

    try {
      const payload = {
        name: model.nom,
        slug: model.sigle,
        description: model.description,
        responsable: model.responsable,
        contact_email: model.email,
        contact_phone: model.telephone,
        adresse: model.adresse,
        ville: model.ville,
        pays: model.pays,
        primary_color: model.primary_color,
        website_url: model.website_url,
        // boolean pour Laravel : 1/0
        is_active: model.statut === 'active' ? '1' : '0',
      };

      Object.keys(payload).forEach((k) => {
        if (payload[k] === '' || payload[k] === null) {
          delete payload[k];
        }
      });

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      let res;
      if (isEdit) {
        formData.append('_method', 'PUT');
        res = await api.post(
          `/societes/${model.id || idParam}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );
      } else {
        res = await api.post('/societes', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const out = res?.data?.data || res?.data || {};

      setModel((prev) => ({
        ...prev,
        ...(out || {}),
        id: out.id ?? prev.id,
        nom: out.nom ?? out.name ?? prev.nom,
        sigle: out.sigle ?? out.slug ?? prev.sigle,
        description: out.description ?? prev.description,
        responsable: out.responsable ?? prev.responsable,
        email: out.contact_email ?? out.email ?? prev.email,
        telephone: out.contact_phone ?? out.telephone ?? prev.telephone,
        adresse: out.adresse ?? prev.adresse,
        ville: out.ville ?? prev.ville,
        pays: out.pays ?? prev.pays,
        primary_color: out.primary_color ?? prev.primary_color,
        website_url: out.website_url ?? prev.website_url,
        logo_url: out.logo_url ?? prev.logo_url,
        statut:
          out.statut ??
          (typeof out.is_active === 'boolean'
            ? out.is_active
              ? 'active'
              : 'inactive'
            : prev.statut),
        created_at: out.created_at ?? prev.created_at,
        updated_at: out.updated_at ?? prev.updated_at,
      }));

      setLogoFile(null);
      if (!isEdit) setIsEdit(true);

      setProgress(100);
      setGlobalError('');

      if (typeof onSaved === 'function') {
        onSaved(out);
      }
    } catch (err) {
      console.error('Erreur sauvegarde société', err?.response?.data || err);

      if (err?.response?.status === 422 && err.response.data) {
        const data = err.response.data;
        setErrors(data.errors || {});
        setGlobalError(
          data.message ||
            'Certains champs sont invalides. Merci de vérifier le formulaire.'
        );
      } else {
        setGlobalError(
          err?.response?.data?.message ||
            err.message ||
            'Erreur lors de la sauvegarde de la société.'
        );
      }

      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndActivate = async () => {
    setModel((prev) => ({ ...prev, statut: 'active' }));
    await save();
  };

  /* ---------- Toggle actif/inactif (is_active) ---------- */

  const toggleActive = async () => {
    if (!model.id && !idParam) return;

    setIsTogglingActive(true);
    setGlobalError('');

    try {
      const res = await api.post(
        `/societes/${model.id || idParam}/active`,
        {
          is_active: model.statut === 'active' ? 0 : 1,
        }
      );

      const out = res.data.societe || res.data;

      setModel((prev) => ({
        ...prev,
        ...out,
        statut: out.statut ?? (out.is_active ? 'active' : 'inactive'),
      }));
    } catch (err) {
      console.error('Erreur updateActive', err?.response?.data || err);

      const apiMessage =
        err?.response?.data?.message ||
        (err?.response?.status === 422
          ? 'Les données envoyées pour le statut sont invalides.'
          : "Impossible de mettre à jour le statut de la société.");

      setGlobalError(apiMessage);
    } finally {
      setIsTogglingActive(false);
    }
  };

  /* ---------- Rendu ---------- */

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 overflow-auto">
      {/* Barre de progression top */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1.5 bg-slate-200/60">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Bande erreurs globales */}
      {globalError && (
        <div className="mx-auto max-w-screen-2xl px-4 lg:px-8 pt-16">
          <div className="glitch-box relative overflow-hidden rounded-2xl border border-red-300 bg-red-50/95 px-4 py-3 text-sm text-red-800 shadow-md">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-red-500 text-lg">⚠️</div>
              <div>
                <p className="font-semibold mb-1">
                  Une erreur est survenue
                </p>
                <p>{globalError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-[100] bg-white/70 backdrop-blur-2xl border-b border-slate-200/70 shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Gauche : titre + infos */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-600 hover:bg-slate-50 mr-1"
                title="Retour à la liste des sociétés"
              >
                <FiArrowLeft className="w-4 h-4" />
              </button>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur opacity-40" />
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <FiEdit3 className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">
                  {isEdit ? 'Modifier la société' : 'Nouvelle société'}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <FiClock className="w-3.5 h-3.5" />
                  <span>
                    {isEdit
                      ? `ID #${model.id || idParam || '—'}`
                      : 'Création d’une nouvelle entité'}
                  </span>

                  {model.statut && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        model.statut === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : model.statut === 'archive'
                          ? 'bg-slate-50 text-slate-700 border border-slate-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      Statut&nbsp;: {model.statut}
                    </span>
                  )}

                  {model.pays && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="text-base leading-none">
                        {getCountryFlag(model.pays)}
                      </span>
                      <span className="truncate max-w-[120px]">
                        {model.pays}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Toggle actif / inactif quand la société existe déjà */}
              {isEdit && (
                <button
                  type="button"
                  onClick={toggleActive}
                  disabled={isTogglingActive || isSubmitting}
                  className={`inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border shadow-sm
                    ${
                      model.statut === 'active'
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }
                    ${isTogglingActive ? 'opacity-70 cursor-wait' : ''}
                  `}
                >
                  {isTogglingActive ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiPlay className="w-4 h-4" />
                  )}

                  {model.statut === 'active'
                    ? isTogglingActive
                      ? 'Désactivation…'
                      : 'Mettre en inactif'
                    : isTogglingActive
                    ? 'Activation…'
                    : 'Mettre en actif'}
                </button>
              )}

              {/* Bouton Activer pour la création initiale */}
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleCreateAndActivate}
                  disabled={isSubmitting || !isFormValid}
                  className={`inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-white text-xs md:text-sm font-semibold shadow ${
                    !isFormValid || isSubmitting
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <FiPlay className="w-4 h-4" />
                  Activer
                </button>
              )}

              {/* Bouton Enregistrer */}
              <button
                type="button"
                onClick={save}
                disabled={isSubmitting || !isFormValid}
                className={`inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-white text-xs md:text-sm font-semibold shadow ${
                  !isFormValid || isSubmitting
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <FiSave className="w-4 h-4" />
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-screen-2xl px-4 lg:px-8 py-6 space-y-6 overflow-auto h-[800px] pb-24">
        {/* Identité + logo */}
        <section className={`${card} p-6 md:p-8 space-y-6`}>
          {/* Nom + sigle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={sectionTitle}>
                Nom de la société <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass('nom')}
                value={model.nom}
                onChange={(e) => onChange('nom', e.target.value)}
                placeholder="Nom légal / commercial de la société"
              />
              <FieldError name="nom" />
            </div>

            <div className="space-y-2">
              <label className={sectionTitle}>Sigle</label>
              <input
                className={inputClass('sigle')}
                value={model.sigle || ''}
                onChange={(e) => onChange('sigle', e.target.value)}
                placeholder="Ex : SMMEC, CECAM, ..."
              />
              <FieldError name="sigle" />
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <label className={sectionTitle}>Logo de la société</label>

            <div className="mt-1 grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_1fr] gap-4 md:gap-6 items-start">
              {/* Zone preview */}
              <div
                className={`relative rounded-2xl border-2 ${
                  hasError('logo_url')
                    ? 'border-red-300 bg-red-50/80'
                    : 'border-dashed border-slate-200 bg-slate-50/80'
                } overflow-hidden`}
              >
                <div className="w-full h-40 md:h-48 flex items-center justify-center">
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="Logo société"
                      className="w-full h-full object-contain p-3"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FiImage className="w-10 h-10 mb-2" />
                      <span className="text-xs">
                        Aucun logo sélectionné
                      </span>
                    </div>
                  )}
                </div>

                {/* Bouton choisir fichier */}
                <label
                  htmlFor="societe-logo-file"
                  className="absolute inset-x-3 bottom-3 inline-flex items-center justify-center gap-2
                             px-3 py-2 rounded-xl text-white text-xs font-semibold
                             bg-slate-900/80 hover:bg-slate-900 cursor-pointer"
                >
                  <FiImage className="w-4 h-4" />
                  Choisir une image
                </label>

                {/* Bouton retirer la sélection locale */}
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => setLogoFile(null)}
                    className="absolute top-3 right-3 inline-flex items-center justify-center
                               w-9 h-9 rounded-xl bg-white/90 border border-slate-200 text-slate-700
                               hover:bg-white shadow-sm"
                    title="Retirer la sélection locale"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}

                <input
                  id="societe-logo-file"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setLogoFile(file || null);
                  }}
                />
              </div>

              {/* Infos à droite */}
              <div className="space-y-2 text-xs text-slate-500">
                {model.logo_url && !logoPreview && (
                  <p className="break-all hidden">
                    URL actuelle :{' '}
                    <span className="font-mono text-[11px] text-slate-700">
                      {buildLogoUrl(model.logo_url)}
                    </span>
                  </p>
                )}
                <p>
                  Formats : PNG, JPG, WEBP. Le logo est utilisé dans tout
                  le backoffice.
                </p>
                <FieldError name="logo_url" />
              </div>
            </div>
          </div>

          {/* Couleur + site web */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className={sectionTitle}>
                Couleur principale (primary_color)
              </label>
              <input
                className={inputClass('primary_color')}
                value={model.primary_color || ''}
                onChange={(e) =>
                  onChange('primary_color', e.target.value)
                }
                placeholder="#0f172a ou nom de couleur"
              />
              <FieldError name="primary_color" />
            </div>

            <div className="space-y-2">
              <label className={sectionTitle}>Site web</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <FiGlobe className="w-4 h-4" />
                </span>
                <input
                  className={`${inputClass('website_url')} pl-9`}
                  value={model.website_url || ''}
                  onChange={(e) =>
                    onChange('website_url', e.target.value)
                  }
                  placeholder="https://exemple.com"
                />
              </div>
              <FieldError name="website_url" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 pt-2">
            <label className={sectionTitle}>Description</label>
            <textarea
              rows={3}
              className={`${inputClass(
                'description'
              )} resize-none`}
              value={model.description || ''}
              onChange={(e) =>
                onChange('description', e.target.value)
              }
              placeholder="Présentation courte de l’organisation (mission, activité principale)…"
            />
            <p className={hint}>
              <FiUsers className="w-3.5 h-3.5" />
              Utilisée dans les fiches et éventuellement sur le
              frontend.
            </p>
            <FieldError name="description" />
          </div>
        </section>

        {/* Coordonnées & contact */}
        <section className={`${card} p-6 md:p-8 space-y-6`}>
          <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-3 mb-2">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
              <FiMapPin className="w-4 h-4" />
            </span>
            Coordonnées & contact
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche : contact principal */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contact principal
              </h3>

              <div className="space-y-2">
                <label className={sectionTitle}>
                  Responsable / Référent
                </label>
                <input
                  className={inputClass('responsable')}
                  value={model.responsable || ''}
                  onChange={(e) =>
                    onChange('responsable', e.target.value)
                  }
                  placeholder="Nom du responsable principal"
                />
                <FieldError name="responsable" />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Téléphone</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <FiPhone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    className={`${inputClass('telephone')} pl-9`}
                    value={model.telephone || ''}
                    onChange={(e) =>
                      onChange('telephone', e.target.value)
                    }
                    placeholder="+261 ..."
                  />
                </div>
                <FieldError name="telephone" />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Email</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <FiMail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    className={`${inputClass('email')} pl-9`}
                    value={model.email || ''}
                    onChange={(e) =>
                      onChange('email', e.target.value)
                    }
                    placeholder="contact@exemple.org"
                  />
                </div>
                <FieldError name="email" />
              </div>
            </div>

            {/* Colonne droite : localisation */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Localisation
              </h3>

              <div className="space-y-2">
                <label className={sectionTitle}>Adresse</label>
                <input
                  className={inputClass('adresse')}
                  value={model.adresse || ''}
                  onChange={(e) =>
                    onChange('adresse', e.target.value)
                  }
                  placeholder="Rue, quartier…"
                />
                <FieldError name="adresse" />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Ville</label>
                <input
                  className={inputClass('ville')}
                  value={model.ville || ''}
                  onChange={(e) =>
                    onChange('ville', e.target.value)
                  }
                  placeholder="Mahajanga, Toliara, Antananarivo…"
                />
                <FieldError name="ville" />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Pays</label>
                <input
                  className={inputClass('pays')}
                  value={model.pays || ''}
                  onChange={(e) =>
                    onChange('pays', e.target.value)
                  }
                />
                <FieldError name="pays" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes glitchBox {
          0% { transform: translate(0, 0); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(1px, -1px); }
          60% { transform: translate(-1px, 0); }
          80% { transform: translate(1px, 1px); }
          100% { transform: translate(0, 0); }
        }
        .glitch-box {
          animation: glitchBox 0.18s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default SocieteForm;
