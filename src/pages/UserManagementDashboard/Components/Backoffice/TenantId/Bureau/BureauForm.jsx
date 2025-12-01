// src/pages/bureaux/BureauForm.jsx
// ⚠️ adapte les chemins d’import si besoin

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiSave,
  FiClock,
  FiUsers,
  FiMapPin,
  FiPhone,
  FiMail,
  FiLayers,
  FiImage,
  FiArrowLeft,
  FiPlay,
  FiLoader,
  FiX,
  FiMaximize2,
} from 'react-icons/fi';
import api from '../../../../../../services/api';
import {
  inputBase,
  card,
  sectionTitle,
  hint,
} from '../ui/backofficeStyles';

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

/* ---------- Fix icône Leaflet (sinon marqueur invisible) ---------- */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ---------- Helpers ---------- */

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

// même logique que SocieteForm pour construire l’URL du logo
const buildSocieteLogoUrl = (value) => {
  if (!value) return '';

  const s = String(value).trim();

  if (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('/')
  ) {
    return s;
  }

  const storageBase = (
    import.meta.env.VITE_API_BASE_STORAGE ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  )
    .replace(/\/api\/?$/i, '')
    .replace(/\/+$/, '');

  return storageBase ? `${storageBase}/storage/logos/${s}` : '';
};

// pour l’image du bureau (dossier à adapter côté Laravel)
const buildImageUrl = (value) => {
  if (!value) return '';

  const s = String(value).trim();

  if (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('/')
  ) {
    return s;
  }

  const storageBase = (
    import.meta.env.VITE_API_BASE_STORAGE ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  )
    .replace(/\/api\/?$/i, '')
    .replace(/\/+$/, '');

  // ⚠️ adapte le chemin "bureaux" si tu utilises un autre dossier
  return storageBase ? `${storageBase}/storage/bureaux/${s}` : '';
};

/* ---------- Leaflet : clic sur la carte ---------- */

const LocationClickHandler = ({ onPick }) => {
  useMapEvents({
    click(e) {
      if (typeof onPick === 'function') {
        onPick(e.latlng);
      }
    },
  });
  return null;
};

/* ---------- Formulaire Bureau / Lieu ---------- */

const BureauForm = ({ initial, onSaved }) => {
  const { id: idParam } = useParams();
  const navigate = useNavigate();

  const isEditFromRoute = Boolean(idParam);
  const [isEdit, setIsEdit] = useState(isEditFromRoute);

  const [model, setModel] = useState(() => ({
    id: null,
    societe_id: '',
    name: '',
    type: '',
    city: '',
    country: 'Madagascar',
    address: '',
    latitude: null,
    longitude: null,
    phone: '',
    email: '',
    image_url: '',
    is_primary: false,
    is_active: true,
    created_at: '',
    updated_at: '',
    ...(initial || {}),
  }));

  const [societes, setSocietes] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);

  const [isSocieteOpen, setIsSocieteOpen] = useState(false);

  // 👉 nouvel état pour la vue carte plein écran
  const [isMapFull, setIsMapFull] = useState(false);

  /* ---------- Helpers erreurs ---------- */

  const fieldErrors = (name) => {
    if (!errors) return [];

    if (Array.isArray(errors[name])) return errors[name];

    // mappings possibles entre champs front et clés Laravel
    if (name === 'societe_id' && Array.isArray(errors.societe_id))
      return errors.societe_id;
    if (name === 'name' && Array.isArray(errors.name)) return errors.name;
    if (name === 'type' && Array.isArray(errors.type)) return errors.type;
    if (name === 'city' && Array.isArray(errors.city)) return errors.city;
    if (name === 'country' && Array.isArray(errors.country))
      return errors.country;
    if (name === 'address' && Array.isArray(errors.address))
      return errors.address;
    if (name === 'latitude' && Array.isArray(errors.latitude))
      return errors.latitude;
    if (name === 'longitude' && Array.isArray(errors.longitude))
      return errors.longitude;
    if (name === 'phone' && Array.isArray(errors.phone)) return errors.phone;
    if (name === 'email' && Array.isArray(errors.email)) return errors.email;

    if (name === 'image_url') {
      if (Array.isArray(errors.image_url)) return errors.image_url;
      if (Array.isArray(errors.image)) return errors.image; // cas upload
    }

    if (name === 'is_primary' && Array.isArray(errors.is_primary))
      return errors.is_primary;
    if (name === 'is_active' && Array.isArray(errors.is_active))
      return errors.is_active;

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

  /* ---------- Preview image local ---------- */

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const previewSrc = imagePreview || buildImageUrl(model.image_url);

  /* ---------- Chargement des sociétés ---------- */

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/societes');
        const raw = res?.data?.data || res?.data || [];

        const list = (Array.isArray(raw) ? raw : []).map((s) => ({
          ...s,
          nom: s.nom ?? s.name ?? '',
          sigle: s.sigle ?? s.slug ?? '',
          telephone: s.telephone ?? s.contact_phone ?? '',
          email: s.email ?? s.contact_email ?? '',
          adresse: s.adresse ?? '',
          ville: s.ville ?? '',
          pays: s.pays ?? '',
        }));

        setSocietes(list);
      } catch (e) {
        console.error('Erreur chargement sociétés pour bureau', e);
      }
    })();
  }, []);

  const selectedSociete = societes.find(
    (s) => String(s.id) === String(model.societe_id || '')
  );

  /* ---------- Chargement bureau en édition ---------- */

  useEffect(() => {
    if (!isEditFromRoute || initial) return;

    (async () => {
      try {
        const res = await api.get(`/bureaux/${idParam}`);
        const data = res?.data?.data || res?.data || {};

        setModel((prev) => ({
          ...prev,
          ...(data || {}),
          id: data.id ?? prev.id,
          societe_id: data.societe_id ?? prev.societe_id,
          name: data.name ?? prev.name,
          type: data.type ?? prev.type,
          city: data.city ?? prev.city,
          country: data.country ?? prev.country,
          address: data.address ?? prev.address,
          latitude: data.latitude ?? prev.latitude,
          longitude: data.longitude ?? prev.longitude,
          phone: data.phone ?? prev.phone,
          email: data.email ?? prev.email,
          image_url: data.image_url ?? prev.image_url,
          is_primary:
            typeof data.is_primary === 'boolean'
              ? data.is_primary
              : !!prev.is_primary,
          is_active:
            typeof data.is_active === 'boolean'
              ? data.is_active
              : !!prev.is_active,
          created_at: data.created_at ?? prev.created_at,
          updated_at: data.updated_at ?? prev.updated_at,
        }));

        setIsEdit(true);
      } catch (e) {
        console.error('Erreur chargement bureau', e);
        setGlobalError("Impossible de charger les informations du lieu.");
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

  /* ---------- Helpers formulaire ---------- */

  const onChange = (key, value) => {
    setModel((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleBackToList = () => {
    navigate('/bureaux');
  };

  const isActive =
    model.is_active === true ||
    model.is_active === 1 ||
    model.is_active === '1';

  const isPrimary =
    model.is_primary === true ||
    model.is_primary === 1 ||
    model.is_primary === '1';

  const isFormValid =
    Boolean(String(model.societe_id).trim()) &&
    Boolean(model.name.trim()) &&
    Boolean((model.city || '').trim());

  /* ---------- Save (multipart, style SocieteForm) ---------- */

  const save = async () => {
    setIsSubmitting(true);
    setErrors({});
    setGlobalError('');

    try {
      const payload = {
        societe_id: model.societe_id,
        name: model.name,
        type: model.type,
        city: model.city,
        country: model.country,
        address: model.address,
        latitude: model.latitude,
        longitude: model.longitude,
        phone: model.phone,
        email: model.email,
        image_url: model.image_url,
        is_primary: isPrimary ? '1' : '0',
        is_active: isActive ? '1' : '0',
      };

      Object.keys(payload).forEach((k) => {
        if (payload[k] === '' || payload[k] === null) {
          if (payload[k] !== false && payload[k] !== 0) {
            delete payload[k];
          }
        }
      });

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (imageFile) {
        formData.append('image', imageFile);
      }

      let res;
      if (isEdit) {
        formData.append('_method', 'PUT');
        res = await api.post(
          `/bureaux/${model.id || idParam}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );
      } else {
        res = await api.post('/bureaux', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const out = res?.data?.data || res?.data || {};

      setModel((prev) => ({
        ...prev,
        ...(out || {}),
        id: out.id ?? prev.id,
        societe_id: out.societe_id ?? prev.societe_id,
        name: out.name ?? prev.name,
        type: out.type ?? prev.type,
        city: out.city ?? prev.city,
        country: out.country ?? prev.country,
        address: out.address ?? prev.address,
        latitude: out.latitude ?? prev.latitude,
        longitude: out.longitude ?? prev.longitude,
        phone: out.phone ?? prev.phone,
        email: out.email ?? prev.email,
        image_url: out.image_url ?? prev.image_url,
        is_primary:
          typeof out.is_primary === 'boolean'
            ? out.is_primary
            : prev.is_primary,
        is_active:
          typeof out.is_active === 'boolean'
            ? out.is_active
            : prev.is_active,
        created_at: out.created_at ?? prev.created_at,
        updated_at: out.updated_at ?? prev.updated_at,
      }));

      setImageFile(null);
      if (!isEdit) setIsEdit(true);

      setProgress(100);
      setGlobalError('');

      if (typeof onSaved === 'function') {
        onSaved(out);
      }
    } catch (err) {
      console.error('Erreur sauvegarde bureau', err?.response?.data || err);

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
            'Erreur lors de la sauvegarde du lieu / bureau.'
        );
      }

      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- Toggle actif/inactif (style updateActive) ---------- */

  const toggleActive = async () => {
    if (!model.id && !idParam) return;

    setIsTogglingActive(true);
    setGlobalError('');

    try {
      const res = await api.post(
        `/bureaux/${model.id || idParam}/active`,
        {
          is_active: isActive ? 0 : 1,
        }
      );

      const out = res.data.bureau || res.data;

      setModel((prev) => ({
        ...prev,
        ...out,
        is_active:
          typeof out.is_active === 'boolean'
            ? out.is_active
            : !isActive,
      }));
    } catch (err) {
      console.error('Erreur updateActive bureau', err?.response?.data || err);

      const apiMessage =
        err?.response?.data?.message ||
        (err?.response?.status === 422
          ? 'Les données envoyées pour le statut sont invalides.'
          : "Impossible de mettre à jour le statut du lieu.");

      setGlobalError(apiMessage);
    } finally {
      setIsTogglingActive(false);
    }
  };

  /* ---------- Coordonnées / Carte ---------- */

  const centerLat =
    model.latitude != null && model.latitude !== ''
      ? Number(model.latitude)
      : -18.9; // centre Madagascar
  const centerLng =
    model.longitude != null && model.longitude !== ''
      ? Number(model.longitude)
      : 47.5;

  const handlePickLocation = (latlng) => {
    onChange('latitude', latlng.lat);
    onChange('longitude', latlng.lng);
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

      {/* Erreur globale */}
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
            {/* Gauche : titre */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-600 hover:bg-slate-50 mr-1"
                title="Retour à la liste des bureaux"
              >
                <FiArrowLeft className="w-4 h-4" />
              </button>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-sky-600 rounded-2xl blur opacity-40" />
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white shadow-lg">
                  <FiHome className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">
                  {isEdit ? 'Modifier un lieu / bureau' : 'Nouveau lieu / bureau'}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <FiClock className="w-3.5 h-3.5" />
                  <span>
                    {isEdit
                      ? `ID #${model.id || idParam || '—'}`
                      : 'Création d’un nouveau point géolocalisé'}
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Statut&nbsp;: {isActive ? 'Actif' : 'Inactif'}
                  </span>

                  {isPrimary && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Principal
                    </span>
                  )}

                  {model.country && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="text-base leading-none">
                        {getCountryFlag(model.country)}
                      </span>
                      <span className="truncate max-w-[120px]">
                        {model.country}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {isEdit && (
                <button
                  type="button"
                  onClick={toggleActive}
                  disabled={isTogglingActive || isSubmitting}
                  className={`inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border shadow-sm
                    ${
                      isActive
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

                  {isActive
                    ? isTogglingActive
                      ? 'Désactivation…'
                      : 'Mettre en inactif'
                    : isTogglingActive
                    ? 'Activation…'
                    : 'Mettre en actif'}
                </button>
              )}

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
        {/* Société liée + infos de base + image */}
        <section className={`${card} p-6 md:p-8 space-y-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Société liée */}
            <div className="space-y-2">
              <label className={sectionTitle}>
                Société liée <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <FiLayers className="w-4 h-4" />
                </span>

                <button
                  type="button"
                  onClick={() => setIsSocieteOpen((o) => !o)}
                  className={`w-full text-left pl-9 pr-9 py-2.5 rounded-xl border bg-white/90 shadow-sm flex items-center justify-between gap-3 ${
                    hasError('societe_id')
                      ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                      : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedSociete && selectedSociete.logo_url ? (
                      <img
                        src={buildSocieteLogoUrl(selectedSociete.logo_url)}
                        alt={selectedSociete.nom || selectedSociete.name}
                        className="w-8 h-8 rounded-xl object-cover border border-slate-200/80 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 border border-slate-200/70 flex-shrink-0">
                        Logo
                      </div>
                    )}

                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1">
                        {selectedSociete
                          ? selectedSociete.nom || selectedSociete.name
                          : 'Sélectionner une société…'}
                        {selectedSociete?.pays && (
                          <span className="text-base">
                            {getCountryFlag(selectedSociete.pays)}
                          </span>
                        )}
                      </span>
                      {selectedSociete && (
                        <span className="text-[11px] text-slate-500 truncate">
                          {selectedSociete.sigle && (
                            <span className="font-medium">
                              {selectedSociete.sigle}
                            </span>
                          )}
                          {(selectedSociete.ville || selectedSociete.pays) && (
                            <>
                              {selectedSociete.sigle ? ' · ' : ''}
                              {selectedSociete.ville
                                ? selectedSociete.ville
                                : ''}
                              {selectedSociete.ville &&
                              selectedSociete.pays
                                ? ' · '
                                : ''}
                              {selectedSociete.pays || ''}
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="ml-2 text-slate-400 text-xs">
                    {isSocieteOpen ? '▲' : '▼'}
                  </span>
                </button>

                {isSocieteOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-2xl bg-white shadow-xl border border-slate-200/80 max-h-72 overflow-auto">
                    {societes.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        Aucune société trouvée.
                      </div>
                    )}
                    {societes.map((s) => {
                      const logoUrl = s.logo_url
                        ? buildSocieteLogoUrl(s.logo_url)
                        : '';
                      const active =
                        String(s.id) === String(model.societe_id || '');
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            onChange('societe_id', s.id);
                            setIsSocieteOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 text-left text-sm ${
                            active
                              ? 'bg-indigo-50'
                              : 'hover:bg-slate-50 transition-colors'
                          }`}
                        >
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={s.nom || s.name}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200/80 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 border border-slate-200/70 flex-shrink-0">
                              Logo
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 truncate flex items-center gap-1">
                              {s.nom || s.name}
                              {s.pays && (
                                <span className="text-base">
                                  {getCountryFlag(s.pays)}
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate">
                              {s.sigle && (
                                <span className="font-medium">{s.sigle}</span>
                              )}
                              {(s.ville || s.pays) && (
                                <>
                                  {s.sigle ? ' · ' : ''}
                                  {s.ville ? s.ville : ''}
                                  {s.ville && s.pays ? ' · ' : ''}
                                  {s.pays || ''}
                                </>
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <FieldError name="societe_id" />
            </div>

            {/* Nom du lieu */}
            <div className="space-y-2">
              <label className={sectionTitle}>
                Nom du lieu / bureau <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass('name')}
                value={model.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="Ex : Agence Mahajanga, Siège Antaninarenina…"
              />
              <FieldError name="name" />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className={sectionTitle}>Type</label>
              <input
                className={inputClass('type')}
                value={model.type || ''}
                onChange={(e) => onChange('type', e.target.value)}
                placeholder="Ex : Siège, Agence, Antenne…"
              />
              <FieldError name="type" />
            </div>

            {/* Image URL / upload */}
            <div className="space-y-2">
              <label className={sectionTitle}>Image (URL ou upload)</label>

              <div className="mt-1 grid grid-cols-1 gap-4">
                <div
                  className={`relative rounded-2xl border-2 ${
                    hasError('image_url')
                      ? 'border-red-300 bg-red-50/80'
                      : 'border-dashed border-slate-200 bg-slate-50/80'
                  } overflow-hidden`}
                >
                  <div className="w-full h-40 md:h-48 flex items-center justify-center">
                    {previewSrc ? (
                      <img
                        src={previewSrc}
                        alt="Image du lieu"
                        className="w-full h-full object-contain p-3"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <FiImage className="w-10 h-10 mb-2" />
                        <span className="text-xs">
                          Aucune image sélectionnée
                        </span>
                      </div>
                    )}
                  </div>

                  <label
                    htmlFor="bureau-image-file"
                    className="absolute inset-x-3 bottom-3 inline-flex items-center justify-center gap-2
                               px-3 py-2 rounded-xl text-white text-xs font-semibold
                               bg-slate-900/80 hover:bg-slate-900 cursor-pointer"
                  >
                    <FiImage className="w-4 h-4" />
                    Choisir une image
                  </label>

                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="absolute top-3 right-3 inline-flex items-center justify-center
                                 w-9 h-9 rounded-xl bg-white/90 border border-slate-200 text-slate-700
                                 hover:bg-white shadow-sm"
                      title="Retirer la sélection locale"
                    >
                      ✕
                    </button>
                  )}

                  <input
                    id="bureau-image-file"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setImageFile(file || null);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <input
                    className={inputClass('image_url')}
                    value={model.image_url || ''}
                    onChange={(e) => onChange('image_url', e.target.value)}
                    placeholder="https://… ou nom de fichier stocké"
                  />
                  <FieldError name="image_url" />
                  <p className="text-[11px] text-slate-500">
                    Tu peux soit uploader un fichier (champ <code>image</code>),
                    soit renseigner un <code>image_url</code> déjà présent dans
                    le storage.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Toggles is_primary / is_active */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange('is_primary', !isPrimary)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                  isPrimary
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-slate-200 border-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    isPrimary ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800">
                  Point principal
                </span>
                <span className="text-xs text-slate-500">
                  Indique si ce lieu est le bureau principal de la société.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange('is_active', !isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                  isActive
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'bg-slate-200 border-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    isActive ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800">
                  Lieu actif
                </span>
                <span className="text-xs text-slate-500">
                  Désactiver pour masquer ce point dans les filtres / rapports.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Localisation & contact + carte Leaflet */}
        <section className={`${card} p-6 md:p-8 space-y-6`}>
          <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-3 mb-2">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
              <FiMapPin className="w-4 h-4" />
            </span>
            Localisation & contact
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Adresse / ville / pays */}
            <div className="space-y-3">
              <div className="space-y-2">
                <label className={sectionTitle}>Adresse</label>
                <input
                  className={inputClass('address')}
                  value={model.address || ''}
                  onChange={(e) => onChange('address', e.target.value)}
                  placeholder="Rue, quartier…"
                />
                <FieldError name="address" />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Ville</label>
                <input
                  className={inputClass('city')}
                  value={model.city || ''}
                  onChange={(e) => onChange('city', e.target.value)}
                  placeholder="Mahajanga, Toliara, ..."
                />
                <FieldError name="city" />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Pays</label>
                <input
                  className={inputClass('country')}
                  value={model.country || ''}
                  onChange={(e) => onChange('country', e.target.value)}
                />
                <FieldError name="country" />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Téléphone</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <FiPhone className="w-4 h-4" />
                  </span>
                  <input
                    className={`${inputClass('phone')} pl-9`}
                    value={model.phone || ''}
                    onChange={(e) => onChange('phone', e.target.value)}
                    placeholder="+261 ..."
                  />
                </div>
                <FieldError name="phone" />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Email</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <FiMail className="w-4 h-4" />
                  </span>
                </div>
                <input
                  type="email"
                  className={`${inputClass('email')} pl-9`}
                  value={model.email || ''}
                  onChange={(e) => onChange('email', e.target.value)}
                  placeholder="contact@exemple.org"
                />
                <FieldError name="email" />
              </div>
            </div>

            {/* Latitude / longitude + carte */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className={sectionTitle}>Latitude</label>
                  <input
                    className={inputClass('latitude')}
                    value={model.latitude ?? ''}
                    onChange={(e) => onChange('latitude', e.target.value)}
                    placeholder="-18.90…"
                  />
                  <FieldError name="latitude" />
                </div>
                <div className="space-y-2">
                  <label className={sectionTitle}>Longitude</label>
                  <input
                    className={inputClass('longitude')}
                    value={model.longitude ?? ''}
                    onChange={(e) => onChange('longitude', e.target.value)}
                    placeholder="47.50…"
                  />
                  <FieldError name="longitude" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500">
                  Tu peux saisir les coordonnées manuellement ou simplement
                  cliquer sur la carte pour les remplir automatiquement.
                </p>

                {/* 👉 bouton agrandir la carte */}
                <button
                  type="button"
                  onClick={() => setIsMapFull(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <FiMaximize2 className="w-3.5 h-3.5" />
                  Agrandir la carte
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <MapContainer
                  center={[centerLat, centerLng]}
                  zoom={6}
                  scrollWheelZoom={true}
                  className="w-full h-[340px]" // 👉 carte plus grande
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationClickHandler onPick={handlePickLocation} />
                  {model.latitude != null &&
                    model.latitude !== '' &&
                    model.longitude != null &&
                    model.longitude !== '' && (
                      <Marker
                        position={[
                          Number(model.latitude),
                          Number(model.longitude),
                        ]}
                      />
                    )}
                </MapContainer>
              </div>
            </div>
          </div>

          <p className={hint}>
            <FiUsers className="w-3.5 h-3.5" />
            Les coordonnées GPS permettent d’utiliser ce lieu dans des cartes,
            itinéraires, et rapports géographiques.
          </p>
        </section>
      </main>

      {/* 👉 Modale carte plein écran */}
      {isMapFull && (
        <div className="fixed inset-0 z-[2000] bg-black/70 flex items-center justify-center px-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
            {/* Header modale */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-600 text-white shadow">
                  <FiMapPin className="w-4 h-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">
                    Carte du lieu / bureau
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Clique sur la carte pour ajuster précisément la latitude et
                    la longitude.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMapFull(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <FiX className="w-4 h-4" />
                Fermer
              </button>
            </div>

            {/* Carte plein écran */}
            <div className="flex-1">
              <MapContainer
                center={[centerLat, centerLng]}
                zoom={7}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationClickHandler onPick={handlePickLocation} />
                {model.latitude != null &&
                  model.latitude !== '' &&
                  model.longitude != null &&
                  model.longitude !== '' && (
                    <Marker
                      position={[
                        Number(model.latitude),
                        Number(model.longitude),
                      ]}
                    />
                  )}
              </MapContainer>
            </div>

            {/* Coordonnées en bas de la modale */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold">Latitude&nbsp;:</span>{' '}
                {model.latitude ?? '—'}
                <span className="ml-3 font-semibold">
                  Longitude&nbsp;:
                </span>{' '}
                {model.longitude ?? '—'}
              </div>
              <div className="text-[10px] text-slate-500">
                Les valeurs sont mises à jour en direct dans le formulaire.
              </div>
            </div>
          </div>
        </div>
      )}

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

export default BureauForm;
