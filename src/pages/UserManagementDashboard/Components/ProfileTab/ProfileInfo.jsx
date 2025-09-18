import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faEnvelope, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useSelector } from 'react-redux';
import LoadingComponent from '../../../../component/loading/LoadingComponent';

const ProfileInfo = () => {
  const { t } = useTranslation();
  const API_BASE_STORAGE = import.meta.env.VITE_API_BASE_STORAGE;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // image visible dans <img>
  const [avatarSrc, setAvatarSrc] = useState('https://randomuser.me/api/portraits/women/44.jpg');
  const [profileImagePreview, setProfileImagePreview] = useState(null); // preview local si upload

  // éviter plusieurs interceptions axios
  const axiosInitDone = useRef(false);
  if (!axiosInitDone.current) {
    axios.defaults.headers.common['Accept'] = 'application/json';
    axios.defaults.headers.common['Content-Type'] = 'application/json';
    axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (err) => Promise.reject(err)
    );
    axiosInitDone.current = true;
  }

  // Récupération des données utilisateur depuis Redux
  const userId = useSelector((state) => state?.library?.auth?.user?.id);

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthdate: '',
    roles: '', // <— standardisé en string
    address: '',
    isActive: false,
    emailVerified: false,
    avatar_url: '',
    updated_at: null,
  });

  // ------- helpers -------
  const cleanBase = useMemo(() => (API_BASE_STORAGE || '').replace(/\/+$/, ''), [API_BASE_STORAGE]);

  const buildAvatarSrc = useCallback((avatar_url, updatedAt) => {
    const placeHolder = 'https://randomuser.me/api/portraits/women/44.jpg';
    const url = avatar_url?.toString()?.trim?.();
    if (!url) return placeHolder;
    // si l'API renvoie déjà une URL absolue
    const abs = /^https?:\/\//i.test(url) ? url : `${cleanBase}/storage/${url.replace(/^\/+/, '')}`;
    const cacheBust = updatedAt ? `?t=${encodeURIComponent(updatedAt)}` : '';
    return `${abs}${abs.includes('?') ? '&' : '?'}cb=${Date.now()}${cacheBust}`;
  }, [cleanBase]);

  // pour éviter les boucles onError
  const triedAuthFetchRef = useRef(false);

  // ------- chargement profil -------
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/user/${userId}/profile`);
        const u = response?.data?.user || {};

        setFormData({
          username: u.username || '',
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          email: u.email || '',
          phone: u.phone || '',
          birthdate: u.birthdate || '',
          roles: (response?.data?.roles?.[0]?.name || '').toString(),
          address: u.address || '',
          isActive: !!u.is_active,
          emailVerified: u.email_verified_at !== null,
          avatar_url: u.avatar_url || '',
          updated_at: u.updated_at || null,
        });

        // avatar initial
        setAvatarSrc(buildAvatarSrc(u.avatar_url, u.updated_at));
        triedAuthFetchRef.current = false; // reset
      } catch (err) {
        setError(err?.response?.data?.message || t('fetch_error'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchUserProfile();
  }, [userId, t, buildAvatarSrc]);

  // ------- upload local (preview) -------
  const fileInputRef = useRef(null);
  const handleImageButtonClick = () => fileInputRef.current?.click();

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfileImagePreview(event.target.result);
      setAvatarSrc(event.target.result); // montrer preview immédiatement
      triedAuthFetchRef.current = true; // ne pas relancer blob fetch
    };
    reader.readAsDataURL(file);
  };

  // ------- mailto -------
  const handleMessageClick = () => {
    const to = (formData.email || '').trim();
    if (!to) {
      alert(t('no_email_available') || 'Aucun email disponible pour cet utilisateur.');
      return;
    }
    const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || formData.username || '';
    const subject = t('email_subject_profile', { name: fullName }) || `Message pour ${fullName}`;
    const body = `${t('hello', 'Bonjour')} ${formData.firstName || fullName},%0D%0A%0D%0A`;
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.location.href = mailto;
  };

  // ------- onError: tenter un fetch blob avec Authorization si nécessaire -------
  const handleImgError = async () => {
    if (triedAuthFetchRef.current) {
      // Dernier fallback (placeholder)
      setAvatarSrc('https://randomuser.me/api/portraits/women/44.jpg');
      return;
    }
    triedAuthFetchRef.current = true;

    try {
      const rawUrl = formData.avatar_url?.toString()?.trim?.();
      if (!rawUrl) throw new Error('No avatar url');

      const abs = /^https?:\/\//i.test(rawUrl)
        ? rawUrl
        : `${cleanBase}/storage/${rawUrl.replace(/^\/+/, '')}`;

      const { data } = await axios.get(abs, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(data);
      setAvatarSrc(blobUrl);
    } catch (e) {
      // échec → placeholder
      setAvatarSrc('https://randomuser.me/api/portraits/women/44.jpg');
    }
  };

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <LoadingComponent />
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="profile-pic-upload relative mb-4">
            <img
              src={avatarSrc}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-md"
              onError={handleImgError}
            />
            <button
              type="button"
              onClick={handleImageButtonClick}
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
              title={t('change_avatar') || 'Changer l’avatar'}
              aria-label={t('change_avatar') || 'Changer l’avatar'}
            >
              <FontAwesomeIcon icon={faCamera} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <h2 className="text-2xl font-bold text-gray-800">
            {formData.firstName} {formData.lastName}
          </h2>

          <p className="text-gray-500 mb-4 flex items-center">
            {!!formData.roles && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
                {formData.roles}
              </span>
            )}
            <span
              className={`text-xs px-2 py-1 rounded-full flex items-center ${
                formData.isActive ? 'text-green-600 bg-green-100' : 'text-gray-500 bg-gray-100'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-1 ${
                  formData.isActive ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              {formData.isActive ? t('active') : t('inactive')}
            </span>
          </p>

          <div className="flex space-x-3 w-full justify-center">
            <button
              onClick={handleMessageClick}
              className="flex-1 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center"
              title={t('send_email') || 'Envoyer un email'}
              aria-label={t('send_email') || 'Envoyer un email'}
            >
              <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
              {t('message')}
            </button>

            <button className="flex-1 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center">
              <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
              {t('follow')}
            </button>
          </div>

          <div className="w-full mt-6 grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-xl font-bold text-blue-600">24</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('projects')}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <p className="text-xl font-bold text-green-600">18</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('tasks')}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <p className="text-xl font-bold text-purple-600">3</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('teams')}</p>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ProfileInfo;
