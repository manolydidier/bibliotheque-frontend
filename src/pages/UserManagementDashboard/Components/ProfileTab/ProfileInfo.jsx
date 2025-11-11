import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faEnvelope, faUserShield, faKey, faTriangleExclamation, faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import axiosLib from 'axios';
import { useSelector } from 'react-redux';
import LoadingComponent from '../../../../component/loading/LoadingComponent';

/**
 * Dynamic, API‑driven Profile component
 * - Removes static numbers
 * - Pulls user, roles/permissions, and usage stats from your Laravel routes
 * - Supports secure avatar preview + upload (POST /user/{id}/avatar)
 * - Graceful fallbacks + retry
 */

const PLACEHOLDER = 'https://randomuser.me/api/portraits/women/44.jpg';

const getTokenGuard = () => {
  try {
    return (
      sessionStorage?.getItem('tokenGuard') ||
      localStorage?.getItem('tokenGuard') ||
      null
    );
  } catch {
    return null;
  }
};

/**
 * Axios singleton with baseURL + auth header
 */
const axios = (() => {
  const instance = axiosLib.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    headers: {
      Accept: 'application/json',
    },
    withCredentials: true,
  });
  instance.interceptors.request.use((cfg) => {
    const token = getTokenGuard();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });
  return instance;
})();

const ProfileInfo = () => {
  const { t } = useTranslation();
  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE || import.meta.env.VITE_API_BASE_URL || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [avatarSrc, setAvatarSrc] = useState(PLACEHOLDER);
  const triedAuthFetchRef = useRef(false);

  const userId = useSelector((s) => s?.library?.auth?.user?.id);

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthdate: '',
    address: '',
    isActive: false,
    emailVerified: false,
    avatar_url: '',
    updated_at: null,
  });

  const [roleBag, setRoleBag] = useState({ roles: [], permissions: [] });
  const [stats, setStats] = useState({
    articles: null,
    usersTotal: null,
    usersActive: null,
    myNotifications: null,
  });

  const cleanBase = useMemo(() => (API_BASE_STORAGE || '').replace(/\/+$/, ''), [API_BASE_STORAGE]);

  const buildAvatarSrc = useCallback((avatar_url, updatedAt) => {
    const url = avatar_url?.toString()?.trim?.();
    if (!url) return PLACEHOLDER;
    const abs = /^https?:\/\//i.test(url) ? url : `${cleanBase}/storage/${url.replace(/^\/+/, '')}`;
    const cb = updatedAt ? `&t=${encodeURIComponent(updatedAt)}` : '';
    return `${abs}${abs.includes('?') ? '&' : '?'}cb=${Date.now()}${cb}`;
  }, [cleanBase]);

  const fetchEverything = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');

    try {
      const [profileRes, rolePermRes, artCountRes, usersCountRes, usersActiveRes, notifCountRes] = await Promise.allSettled([
        axios.get(`/user/${userId}/profile`),
        axios.get(`/user/${userId}/roles-permissions`),
        axios.get('/stats/articles-count'),
        axios.get('/stats/users-count'),
        axios.get('/stats/active-users'),
        axios.get(`/users/${userId}/activities/count`).catch(() => axios.get(`/users/${userId}/activities`).then(r => ({ data: { count: Array.isArray(r?.data) ? r.data.length : 0 } }))),
      ]);

      if (profileRes.status === 'fulfilled') {
        const data = profileRes.value.data || {};
        const u = data?.user || {};
        setFormData({
          username: u.username || '',
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          email: u.email || '',
          phone: u.phone || '',
          birthdate: u.birthdate || '',
          address: u.address || '',
          isActive: !!u.is_active,
          emailVerified: u.email_verified_at !== null,
          avatar_url: u.avatar_url || '',
          updated_at: u.updated_at || null,
        });
        setAvatarSrc(buildAvatarSrc(u.avatar_url, u.updated_at));
        triedAuthFetchRef.current = false;
      } else {
        throw profileRes.reason;
      }

      if (rolePermRes.status === 'fulfilled') {
        const rp = rolePermRes.value?.data || {};
        setRoleBag({ roles: rp?.roles || [], permissions: rp?.permissions || [] });
      }

      setStats({
        articles: artCountRes.status === 'fulfilled' ? (artCountRes.value?.data?.count ?? null) : null,
        usersTotal: usersCountRes.status === 'fulfilled' ? (usersCountRes.value?.data?.count ?? null) : null,
        usersActive: usersActiveRes.status === 'fulfilled' ? (usersActiveRes.value?.data?.count ?? (Array.isArray(usersActiveRes.value?.data) ? usersActiveRes.value.data.length : null)) : null,
        myNotifications: notifCountRes.status === 'fulfilled' ? (notifCountRes.value?.data?.count ?? null) : null,
      });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || t('fetch_error'));
    } finally {
      setLoading(false);
    }
  }, [userId, t, buildAvatarSrc]);

  useEffect(() => { fetchEverything(); }, [fetchEverything]);

  // Avatar upload (multipart)
  const fileRef = useRef(null);
  const pickImage = () => fileRef.current?.click();
  const onUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Instant preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarSrc(ev.target.result);
      triedAuthFetchRef.current = true;
    };
    reader.readAsDataURL(f);

    // Upload to server
    try {
      const fd = new FormData();
      fd.append('avatar', f);
      await axios.post(`/user/${userId}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      // Refresh profile to get definitive URL
      await fetchEverything();
    } catch (err) {
      setError(err?.response?.data?.message || t('upload_error') || 'Erreur lors du téléversement.');
    }
  };

  // Securely re-fetch private file if <img> fails due to auth
  const onImgError = async () => {
    if (triedAuthFetchRef.current) {
      setAvatarSrc(PLACEHOLDER);
      return;
    }
    triedAuthFetchRef.current = true;
    try {
      const raw = formData.avatar_url?.toString()?.trim?.();
      if (!raw) throw new Error();
      const abs = /^https?:\/\//i.test(raw) ? raw : `${cleanBase}/storage/${raw.replace(/^\/+/, '')}`;
      const token = getTokenGuard();
      const { data } = await axiosLib.get(abs, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blobUrl = URL.createObjectURL(data);
      setAvatarSrc(blobUrl);
    } catch {
      setAvatarSrc(PLACEHOLDER);
    }
  };

  const mailTo = () => {
    const to = (formData.email || '').trim();
    if (!to) return alert(t('no_email_available') || 'Aucun email disponible.');
    const full = `${formData.firstName} ${formData.lastName}`.trim() || formData.username || '';
    const subject = t('email_subject_profile', { name: full }) || `Message pour ${full}`;
    const body = `${t('hello', 'Bonjour')} ${formData.firstName || full},%0D%0A%0D%0A`;
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const resendVerification = async () => {
    try {
      await axios.post('/email/verification/request', { email: formData.email });
      alert(t('verification_sent') || 'E‑mail de vérification envoyé.');
    } catch (e) {
      setError(e?.response?.data?.message || t('verification_error') || 'Erreur envoi e‑mail de vérification');
    }
  };

  const Retry = () => (
    <button
      onClick={fetchEverything}
      className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
    >
      <FontAwesomeIcon icon={faArrowsRotate} /> {t('retry') || 'Réessayer'}
    </button>
  );

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
          alt={t('profile_picture', 'Photo de profil')}
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

      {/* Identity */}
      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
        {(formData.firstName || '').trim()} {(formData.lastName || '').trim()}
      </h2>

      <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
        {roleBag.roles?.length > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full inline-flex items-center gap-1">
            <FontAwesomeIcon icon={faUserShield} /> {roleBag.roles.map(r => r?.name || r).join(', ')}
          </span>
        )}
        <span
          className={`text-xs px-2 py-1 rounded-full inline-flex items-center ${formData.isActive ? 'text-green-700 bg-green-100' : 'text-slate-600 bg-slate-100'}`}
        >
          <span className={`w-2 h-2 rounded-full mr-1 ${formData.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
          {formData.isActive ? t('active') : t('inactive')}
        </span>
        {!formData.emailVerified && (
          <button
            onClick={resendVerification}
            className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1"
            title={t('verify_email') || 'Vérifier l’email'}
          >
            <FontAwesomeIcon icon={faKey} /> {t('verify_email') || 'Vérifier e‑mail'}
          </button>
        )}
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
          <span className="font-medium">{t('message') || 'Message'}</span>
        </button>
        <button
          onClick={fetchEverything}
          className="h-10 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm"
          title={t('refresh') || 'Actualiser'}
          aria-label={t('refresh') || 'Actualiser'}
        >
          <FontAwesomeIcon icon={faArrowsRotate} />
          <span className="font-medium">{t('refresh') || 'Actualiser'}</span>
        </button>
      </div>

      {/* Dynamic stats (no more static numbers) */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full hidden">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold text-blue-600">{stats.articles ?? '—'}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{t('articles') || 'Articles'}</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold text-emerald-600">{stats.usersTotal ?? '—'}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{t('users_total') || 'Utilisateurs'}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold text-purple-600">{stats.usersActive ?? '—'}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{t('users_active') || 'Utilisateurs actifs'}</p>
        </div>
        <div className="bg-amber-50 p-3 rounded-lg text-center">
          <p className="text-lg sm:text-xl font-bold text-amber-600">{stats.myNotifications ?? '—'}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{t('notifications') || 'Notifications'}</p>
        </div>
      </div>

      {/* Error box */}
      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 w-full flex items-start gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
          <div className="flex-1">
            {error}
            <div className="mt-2"><Retry /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileInfo;
