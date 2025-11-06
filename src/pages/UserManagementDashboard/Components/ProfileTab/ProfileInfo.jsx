import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faEnvelope, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useSelector } from 'react-redux';
import LoadingComponent from '../../../../component/loading/LoadingComponent';

const PLACEHOLDER = 'https://randomuser.me/api/portraits/women/44.jpg';

const getTokenGuard = () => {
  try {
    return (sessionStorage?.getItem('tokenGuard')) || (localStorage?.getItem('tokenGuard')) || null;
  } catch { return null; }
};

const ProfileInfo = () => {
  const { t } = useTranslation();
  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [avatarSrc, setAvatarSrc] = useState(PLACEHOLDER);
  const triedAuthFetchRef = useRef(false);

  // éviter double intercepteur
  const axiosInit = useRef(false);
  if (!axiosInit.current) {
    axios.defaults.headers.common['Accept'] = 'application/json';
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    axios.interceptors.request.use((cfg) => {
      const token = getTokenGuard();
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
      return cfg;
    });
    axiosInit.current = true;
  }

  const userId = useSelector((s) => s?.library?.auth?.user?.id);

  const [formData, setFormData] = useState({
    username:'', firstName:'', lastName:'', email:'', phone:'', birthdate:'',
    roles:'', address:'', isActive:false, emailVerified:false,
    avatar_url:'', updated_at:null
  });

  const cleanBase = useMemo(() => (API_BASE_STORAGE || '').replace(/\/+$/,''), [API_BASE_STORAGE]);

  const buildAvatarSrc = useCallback((avatar_url, updatedAt) => {
    const url = avatar_url?.toString()?.trim?.();
    if (!url) return PLACEHOLDER;
    const abs = /^https?:\/\//i.test(url) ? url : `${cleanBase}/storage/${url.replace(/^\/+/, '')}`;
    const cb  = updatedAt ? `&t=${encodeURIComponent(updatedAt)}` : '';
    return `${abs}${abs.includes('?') ? '&' : '?'}cb=${Date.now()}${cb}`;
  }, [cleanBase]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true); setError('');
        // adapte l’URL à ton backend si besoin
        const { data } = await axios.get(`/user/${userId}/profile`);
        const u = data?.user || {};
        setFormData({
          username: u.username || '', firstName: u.first_name || '', lastName: u.last_name || '',
          email: u.email || '', phone: u.phone || '', birthdate: u.birthdate || '',
          roles: (data?.roles?.[0]?.name || '').toString(),
          address: u.address || '', isActive: !!u.is_active,
          emailVerified: u.email_verified_at !== null,
          avatar_url: u.avatar_url || '', updated_at: u.updated_at || null
        });
        setAvatarSrc(buildAvatarSrc(u.avatar_url, u.updated_at));
        triedAuthFetchRef.current = false;
      } catch (e) {
        setError(e?.response?.data?.message || t('fetch_error'));
      } finally { setLoading(false); }
    };
    if (userId) fetchUserProfile();
  }, [userId, t, buildAvatarSrc]);

  const fileRef = useRef(null);
  const pickImage = () => fileRef.current?.click();
  const onUpload = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarSrc(ev.target.result); // preview instant
      triedAuthFetchRef.current = true;
    };
    reader.readAsDataURL(f);
  };

  const onImgError = async () => {
    if (triedAuthFetchRef.current) { setAvatarSrc(PLACEHOLDER); return; }
    triedAuthFetchRef.current = true;
    try {
      const raw = formData.avatar_url?.toString()?.trim?.(); if (!raw) throw new Error();
      const abs = /^https?:\/\//i.test(raw) ? raw : `${cleanBase}/storage/${raw.replace(/^\/+/, '')}`;
      const token = getTokenGuard();
      const { data } = await axios.get(abs, { responseType:'blob', headers: token ? { Authorization:`Bearer ${token}` } : {} });
      const blobUrl = URL.createObjectURL(data);
      setAvatarSrc(blobUrl);
    } catch { setAvatarSrc(PLACEHOLDER); }
  };

  const mailTo = () => {
    const to = (formData.email || '').trim();
    if (!to) return alert(t('no_email_available') || 'Aucun email disponible.');
    const full = `${formData.firstName} ${formData.lastName}`.trim() || formData.username || '';
    const subject = t('email_subject_profile', { name: full }) || `Message pour ${full}`;
    const body = `${t('hello','Bonjour')} ${formData.firstName || full},%0D%0A%0D%0A`;
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="w-full min-h-[220px] grid place-items-center">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      {/* Avatar */}
      <div className="relative mb-4">
        <img
          src={avatarSrc}
          alt={t('profile_picture','Photo de profil')}
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-100 shadow-md"
          onError={onImgError}
          loading="lazy"
          decoding="async"
        />
        <button
          type="button"
          onClick={pickImage}
          className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow"
          title={t('change_avatar') || 'Changer l’avatar'}
          aria-label={t('change_avatar') || 'Changer l’avatar'}
        >
          <FontAwesomeIcon icon={faCamera} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>

      {/* Identité */}
      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
        {(formData.firstName || '').trim()} {(formData.lastName || '').trim()}
      </h2>

      <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
        {!!formData.roles && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{formData.roles}</span>
        )}
        <span
          className={`
            text-xs px-2 py-1 rounded-full inline-flex items-center
            ${formData.isActive ? 'text-green-700 bg-green-100' : 'text-slate-600 bg-slate-100'}
          `}
        >
          <span className={`w-2 h-2 rounded-full mr-1 ${formData.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
          {formData.isActive ? t('active') : t('inactive')}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3 w-full">
        <button
          onClick={mailTo}
          className="h-10 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm"
          title={t('send_email') || 'Envoyer un email'}
          aria-label={t('send_email') || 'Envoyer un email'}
        >
          <FontAwesomeIcon icon={faEnvelope} />
          <span className="font-medium">{t('message')}</span>
        </button>
        <button
          className="h-10 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm"
          title={t('follow') || 'Suivre'}
          aria-label={t('follow') || 'Suivre'}
        >
          <FontAwesomeIcon icon={faUserPlus} />
          <span className="font-medium">{t('follow')}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3 w-full">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold text-blue-600">24</p>
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{t('projects')}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold text-green-600">18</p>
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{t('tasks')}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold text-purple-600">3</p>
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{t('teams')}</p>
        </div>
      </div>

      {/* Infos complémentaires (facultatif) */}
      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 w-full">
          {error}
        </div>
      )}
    </div>
  );
};

export default ProfileInfo;
