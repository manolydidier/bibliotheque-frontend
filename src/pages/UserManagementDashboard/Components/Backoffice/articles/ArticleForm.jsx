// src/pages/articles/ArticleForm.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiCalendar, FiEye, FiEyeOff, FiLock, FiUpload, FiUser, FiTag,
  FiFolder, FiSettings, FiEdit3, FiStar, FiMessageCircle,
  FiShare2, FiThumbsUp, FiBarChart2, FiClock, FiUsers, FiShield, FiSave
} from 'react-icons/fi';

// ✅ Ton éditeur TinyMCE React
import RichTextEditor from './RichTextEditor';

// ✅ Upload helper
import ImageDropPaste from './ImageDropPaste';

// ✅ Client API centralisé (ajuste le chemin selon ton projet)
import api from '../../../../../services/api';

/* ===============================
   Helpers généraux & formulaires
=============================== */

// Champs acceptés par le backend pour create/update
const allowedKeys = [
  // Contenu
  "title", "slug", "excerpt", "content",
  "featured_image_alt",
  // Publication
  "status", "visibility", "password",
  "published_at", "scheduled_at", "expires_at",
  // Options
  "is_featured", "is_sticky", "allow_comments", "allow_sharing", "allow_rating",
  // Auteur
  "author_name", "author_bio", "author_avatar", "author_id",
  // SEO/Meta
  "meta", "seo_data",
  // Taxonomies
  "categories", "tags",
  // Métriques simples (facultatif)
  "reading_time", "word_count", "rating_average", "rating_count",
];

const toFormData = (payload, files = {}) => {
  const fd = new FormData();
  for (const key of allowedKeys) {
    if (!(key in payload)) continue;
    const v = payload[key];
    if (v === undefined || v === null || v === "") continue;

    if (Array.isArray(v)) {
      v.forEach((item) => fd.append(`${key}[]`, item));
    } else if (typeof v === "boolean") {
      fd.append(key, v ? "1" : "0");
    } else if (typeof v === "object") {
      fd.append(key, JSON.stringify(v));
    } else {
      fd.append(key, v);
    }
  }
  if (files.featured instanceof File) fd.append("featured_image_file", files.featured);
  if (files.avatar instanceof File)   fd.append("author_avatar_file",   files.avatar);
  return fd;
};

const ensureNumberArray = (arr) => {
  if (!arr) return [];
  if (Array.isArray(arr))   return arr.map(n => Number(n)).filter(n => !isNaN(n) && n > 0);
  if (typeof arr === 'string') return arr.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n) && n > 0);
  return [];
};

const parseMaybeJSON = (val, fallback = {}) => {
  if (val == null) return fallback;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
  return typeof val === 'object' ? val : fallback;
};

/* ===============================
   Helpers Dates (FR + compat Safari)
=============================== */
const RE_SQL = /^\d{4}-\d{2}-\d{2}(?:[ T])\d{2}:\d{2}:\d{2}$/;

function toDate(val) {
  if (!val) return null;
  if (typeof val === 'string' && RE_SQL.test(val)) return new Date(val.replace(' ', 'T'));
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}
const pad2 = (n) => String(n).padStart(2, '0');

function toInputLocal(val) {
  const d = toDate(val);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}
function toSqlDateTime(inputVal) {
  if (!inputVal) return '';
  if (RE_SQL.test(inputVal)) return inputVal;
  const s = String(inputVal).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s.replace('T', ' ') + ':00';
  const d = toDate(s);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}
function formatDate(d) {
  try { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(d); }
  catch { return d?.toLocaleDateString('fr-FR'); }
}
function formatTime(d) {
  try { return new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(d); }
  catch { return d?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
}
function formatRelative(target) {
  if (!target) return '';
  const rtf = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
  const now = new Date();
  const diffMs = target - now;
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr  = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const month = Math.round(day / 30);
  const year = Math.round(month / 12);
  if (Math.abs(year)  >= 1) return rtf.format(year,  'year');
  if (Math.abs(month) >= 1) return rtf.format(month, 'month');
  if (Math.abs(day)   >= 1) return rtf.format(day,   'day');
  if (Math.abs(hr)    >= 1) return rtf.format(hr,    'hour');
  if (Math.abs(min)   >= 1) return rtf.format(min,   'minute');
  return rtf.format(sec, 'second');
}

/* ===============================
   API helpers spécifiques Article
=============================== */

// ⚠️ adapte si tes endpoints diffèrent
async function listCategories() {
  const res = await api.get('/categories', { params: { per_page: 1000 } });
  return res?.data?.data || res?.data || [];
}
async function listTags() {
  const res = await api.get('/tags', { params: { per_page: 1000 } });
  return res?.data?.data || res?.data || [];
}
async function fetchArticleDirect(idOrSlug) {
  const res = await api.get(`/articles/${encodeURIComponent(idOrSlug)}`, {
    params: { include: 'categories,tags' },
    headers: { 'Cache-Control': 'no-store' },
  });
  const payload = res?.data?.data ?? res?.data ?? res;
  if (payload?.categories && Array.isArray(payload.categories)) {
    payload.categories = ensureNumberArray(payload.categories.map(c => c.id ?? c));
  }
  if (payload?.tags && Array.isArray(payload.tags)) {
    payload.tags = ensureNumberArray(payload.tags.map(t => t.id ?? t));
  }
  return payload;
}
// ✅ déverrouillage d’un article protégé
async function unlockArticleDirect(idOrSlug, password) {
  const res = await api.post(
    `/articles/${encodeURIComponent(idOrSlug)}/unlock`,
    { password },
    { params: { include: 'categories,tags' }, headers: { 'Cache-Control': 'no-store' } }
  );
  const payload = res?.data?.data ?? res?.data ?? res;
  if (payload?.categories && Array.isArray(payload.categories)) {
    payload.categories = ensureNumberArray(payload.categories.map(c => c.id ?? c));
  }
  if (payload?.tags && Array.isArray(payload.tags)) {
    payload.tags = ensureNumberArray(payload.tags.map(t => t.id ?? t));
  }
  return payload;
}
async function createArticleJSON(body) {
  return api.post('/articlesstore', body);
}
async function createArticleWithFiles(fd) {
  return api.post('/articles/with-files', fd);
}
async function updateArticleJSON(id, body) {
  return api.put(`/articles/${id}`, body);
}
async function updateArticleWithFiles(id, fd) {
  return api.post(`/articles/${id}/update-with-files`, fd);
}

/* ===============================
   Composant principal (sans props)
=============================== */
const ArticleForm = () => {
  const navigate = useNavigate();
  const { id: idOrSlug } = useParams(); // p.ex. /articles/:id ou /articles/:slug
  const isEdit = Boolean(idOrSlug);

  // Styles
  const inputBase = [
    'w-full','px-4 py-3','rounded-2xl','border-2 border-slate-200/60',
    'bg-gradient-to-br from-white to-slate-50/30','shadow-sm','backdrop-blur-sm',
    'placeholder:text-slate-400','focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400',
    'hover:border-slate-300','transition-all duration-200'
  ].join(' ');
  const card = [
    'rounded-3xl','bg-white/90','backdrop-blur-xl','border border-slate-200/60',
    'shadow-lg shadow-slate-200/50','hover:shadow-xl hover:shadow-slate-300/50','transition-all duration-300'
  ].join(' ');
  const sectionTitle = 'text-sm font-bold text-slate-800 mb-2 block tracking-tight';
  const hint = 'text-xs text-slate-500 mt-1.5 flex items-center gap-1';

  // Modèle
  const [model, setModel] = useState(() => ({
    id: null, uuid: '', tenant_id: '', title: '', slug: '', excerpt: '', content: '',
    featured_image: '', featured_image_alt: '',
    meta: {}, seo_data: {},
    status: 'draft', visibility: 'public', password: '',
    published_at: '', scheduled_at: '', expires_at: '',
    reading_time: 0, word_count: 0, view_count: 0, share_count: 0,
    comment_count: 0, rating_average: 0, rating_count: 0,
    is_featured: false, is_sticky: false, allow_comments: true, allow_sharing: true, allow_rating: true,
    author_name: '', author_bio: '', author_avatar: '', author_id: '',
    reviewed_by: '', reviewed_at: '', review_notes: '',
    created_at: '', updated_at: '', deleted_at: '',
    categories: [],
    tags: []
  }));

  // États UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('content');

  // Fichiers
  const [featFile, setFeatFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  // PREVIEWS
  const [avatarPreview, setAvatarPreview] = useState('');
  const [featPreview, setFeatPreview] = useState('');

  // Taxonomies
  const [cats, setCats] = useState([]);
  const [tags, setTags] = useState([]);

  // Auteurs (admins)
  const [adminUsers, setAdminUsers] = useState([]);
  const [authorSearch, setAuthorSearch] = useState('');

  // User courant (optionnel si nécessaire)
  const [currentUser, setCurrentUser] = useState(null);

  // Tenant lock
  const [tenantLocked, setTenantLocked] = useState(true);

  /* ---------- ERREURS LARAVEL (422) ---------- */
  const [errors, setErrors] = useState({});
  const totalErrors = useMemo(
    () => Object.values(errors).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0),
    [errors]
  );

  // ⚠️ Ajout de seo_data dans la détection de salissure pour le tab "content"
  const tabFields = {
    content:     ['title','slug','excerpt','content','seo_data'],
    settings:    ['status','visibility','password','published_at','scheduled_at','expires_at'],
    author:      ['author_name','author_bio','author_id','author_avatar_file','author_avatar'],
    taxonomy:    ['categories','tags'],
    media:       ['featured_image_file','featured_image_alt','featured_image'],
    analytics:   ['reading_time','word_count'],
    management:  ['reviewed_by','reviewed_at','review_notes'],
    preview:     []
  };
  const tabErrorCount = useMemo(() => {
    const out = {};
    for (const [tab, fields] of Object.entries(tabFields)) {
      out[tab] = fields.reduce((n, f) => n + ((errors?.[f]?.length || 0)), 0);
    }
    return out;
  }, [errors]);
  const fieldErrors = (name) => Array.isArray(errors?.[name]) ? errors[name] : [];
  const hasError = (name) => fieldErrors(name).length > 0;
  const inputClass = (name) =>
    `${inputBase} ${hasError(name) ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''}`;
  const FieldError = ({ name }) => (
    <>
      {fieldErrors(name).map((m, i) => (
        <p key={`${name}-${i}`} className="text-xs text-red-600 mt-1">{m}</p>
      ))}
    </>
  );

  const filteredAdmins = useMemo(() => {
    if (!authorSearch.trim()) return adminUsers;
    const s = authorSearch.toLowerCase();
    return adminUsers.filter(u =>
      String(u.id).includes(s) || (u.name || '').toLowerCase().includes(s)
    );
  }, [adminUsers, authorSearch]);

  /* ========= Hydratations (chargement direct Laravel) ========== */
  useEffect(() => {
    (async () => {
      try { setCats(await listCategories()); } catch {}
      try { setTags(await listTags()); } catch {}
    })();
  }, []);

  // 🔒 État de verrouillage + déverrouillage
  const [locked, setLocked] = useState({ required: false, reason: '', error: '' });
  const [unlockPwd, setUnlockPwd] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Charger l’article si édition
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const art = await fetchArticleDirect(idOrSlug);
        setModel(m => {
          const meta = parseMaybeJSON(art.meta, {});
          const seo  = parseMaybeJSON(art.seo_data, {});
          return { ...m, ...art, meta, seo_data: seo };
        });
      } catch (e) {
        const status = e?.response?.status;
        const vis = e?.response?.data?.visibility || '';
        const code = e?.response?.data?.code || '';
        if (status === 403 && (vis === 'password_protected' || code === 'password_required')) {
          setLocked({
            required: true,
            reason: e?.response?.data?.message || "Cet article est protégé par mot de passe.",
            error: ''
          });
        } else {
          console.error('Chargement article échoué:', e?.response?.data || e?.message);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, idOrSlug]);

  // (optionnel) Charger le user courant pour pré-remplir
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/user');
        const u = data?.data || data || {};
        const me = {
          id: u.id ?? u.user_id ?? null,
          tenant_id: u.tenant_id ?? null,
          name: u.name || u.username || u.email || (u.id ? `#${u.id}` : ''),
          avatar: u.avatar || u.photo || u.image || null,
        };
        setCurrentUser(me);
        setModel(prev => ({
          ...prev,
          author_id: prev.author_id || me.id || '',
          tenant_id: prev.tenant_id || me.tenant_id || '',
          author_name: prev.author_name || me.name || prev.author_name,
        }));
      } catch {}
    })();
  }, []);

  // (optionnel) Auteurs Admins
  useEffect(() => {
    (async () => {
      try {
        const params = { page: 1, per_page: 100, roles: 'Admin' };
        const out = new Map();
        for (;;) {
          const res = await api.get('/userrole', { params });
          const wrapper = res?.data?.data ?? res?.data ?? {};
          const items = Array.isArray(wrapper?.data) ? wrapper.data : Array.isArray(wrapper) ? wrapper : [];
          for (const ur of items) {
            const id = ur?.user?.id ?? ur?.user_id;
            if (!id) continue;
            const isAdmin = ur?.role?.is_admin === true || String(ur?.role?.name || '').toLowerCase() === 'admin';
            if (!isAdmin) continue;
            const name = ur?.user?.username || ur?.user?.name || ur?.user?.email || `#${id}`;
            if (!out.has(id)) {
              out.set(id, {
                id,
                name,
                tenant_id: ur?.user?.tenant_id ?? null,
                avatar: ur?.user?.avatar || ur?.user?.photo || ur?.user?.image || null,
              });
            }
          }
          const cur = Number(wrapper?.current_page || params.page);
          const last = Number(wrapper?.last_page || cur);
          if (!cur || cur >= last) break;
          params.page = cur + 1;
        }
        setAdminUsers(Array.from(out.values()));
      } catch {
        setAdminUsers([]);
      }
    })();
  }, []);

  // Preview avatar (object URL)
  const lastAvatarUrl = useRef('');
  useEffect(() => {
    if (avatarFile) {
      if (lastAvatarUrl.current) URL.revokeObjectURL(lastAvatarUrl.current);
      const url = URL.createObjectURL(avatarFile);
      lastAvatarUrl.current = url;
      setAvatarPreview(url);
    } else {
      if (lastAvatarUrl.current) {
        URL.revokeObjectURL(lastAvatarUrl.current);
        lastAvatarUrl.current = '';
      }
      setAvatarPreview('');
    }
    return () => {
      if (lastAvatarUrl.current) {
        URL.revokeObjectURL(lastAvatarUrl.current);
        lastAvatarUrl.current = '';
      }
    };
  }, [avatarFile]);

  // Preview featured (object URL)
  const lastFeatUrl = useRef('');
  useEffect(() => {
    if (featFile) {
      if (lastFeatUrl.current) URL.revokeObjectURL(lastFeatUrl.current);
      const url = URL.createObjectURL(featFile);
      lastFeatUrl.current = url;
      setFeatPreview(url);
    } else {
      if (lastFeatUrl.current) {
        URL.revokeObjectURL(lastFeatUrl.current);
        lastFeatUrl.current = '';
      }
      setFeatPreview('');
    }
    return () => {
      if (lastFeatUrl.current) {
        URL.revokeObjectURL(lastFeatUrl.current);
        lastFeatUrl.current = '';
      }
    };
  }, [featFile]);

  // Barre de progression submit (fallback animation)
  useEffect(() => {
    if (isSubmitting) {
      setProgress(8);
      progressTimerRef.current = setInterval(() => {
        setProgress(p => (p < 90 ? p + Math.max(1, (90 - p) * 0.1) : 90));
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

  const onChange = (k, v) => setModel(prev => ({ ...prev, [k]: v }));

  /* ========= Toast de succès ========= */
  const [toast, setToast] = useState({ open: false, msg: '' });
  const toastTimerRef = useRef(null);
  const showSuccess = (msg = 'Enregistré avec succès') => {
    setToast({ open: true, msg });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast({ open: false, msg: '' }), 2600);
  };
  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  /* ========= Dialog post-enregistrement ========= */
  const [postSaveDialog, setPostSaveDialog] = useState({ open: false, urls: null, mode: 'update' });
  const buildUrlsFromArticle = (a) => {
    const id  = a?.id  ?? model?.id;
    const slug = a?.slug ?? model?.slug;
    const viewUrl = slug ? `/articles/${slug}` : (id ? `/articles/${id}` : '#');
    const listUrl = '/articlescontroler';
    const editUrl = id ? `/articles/${id}/edit` : '#';
    return { viewUrl, listUrl, editUrl };
  };

  /* ========= Baseline & Dirty Detection ========= */
  const [baseline, setBaseline] = useState(null);
  const didSetBaselineRef = useRef(false);

  const stableStr = (v) => {
    if (v === undefined || v === null) return '';
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
    return String(v);
  };
  const pickForCompare = (source, fields) => {
    const out = {};
    for (const k of fields) {
      if (k in source) out[k] = source[k];
    }
    return out;
  };
  const areEqualByFields = (a, b, fields) => {
    for (const k of fields) {
      const av = a?.[k];
      const bv = b?.[k];
      if (stableStr(av) !== stableStr(bv)) return false;
    }
    return true;
  };

  const isTabDirty = (tabId) => {
    if (!isEdit) return false;
    const fields = tabFields[tabId] || [];
    if (!baseline) return false;

    if (tabId === 'media'  && featFile)   return true;
    if (tabId === 'author' && avatarFile) return true;

    const currentPick  = pickForCompare(model, fields);
    const baselinePick = pickForCompare(baseline, fields);
    return !areEqualByFields(currentPick, baselinePick, fields);
  };

  const isAnyTabDirty = useMemo(() => {
    if (!isEdit) return false;
    const tabs = Object.keys(tabFields).filter(t => t !== 'preview');
    return tabs.some(t => isTabDirty(t));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, baseline, featFile, avatarFile, isEdit]);

  // Initialise baseline quand l’article est chargé
  useEffect(() => {
    if (isEdit && !didSetBaselineRef.current && model?.id) {
      didSetBaselineRef.current = true;
      setBaseline(prev => ({ ...(prev || {}), ...model }));
    }
  }, [isEdit, model]);

  /* ========= Submit global ========= */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      setErrors({});

      const payload = {
        ...model,
        is_featured: !!model.is_featured,
        is_sticky: !!model.is_sticky,
        allow_comments: !!model.allow_comments,
        allow_sharing: !!model.allow_sharing,
        allow_rating: !!model.allow_rating,

        published_at: model.published_at ? toSqlDateTime(model.published_at) : null,
        scheduled_at: model.scheduled_at ? toSqlDateTime(model.scheduled_at) : null,
        expires_at:   model.expires_at   ? toSqlDateTime(model.expires_at)   : null,
        reviewed_at:  model.reviewed_at  ? toSqlDateTime(model.reviewed_at)  : null,

        author_id:     model.author_id     ? Number(model.author_id)     : null,
        reviewed_by:   model.reviewed_by   ? Number(model.reviewed_by)   : null,
        reading_time:  Number(model.reading_time || 0),
        word_count:    Number(model.word_count   || 0),
        rating_average:Number(model.rating_average || 0),
        rating_count:  Number(model.rating_count   || 0),

        categories: ensureNumberArray(model.categories),
        tags:       ensureNumberArray(model.tags),

        meta:     typeof model.meta     === 'object' ? model.meta     : {},
        seo_data: typeof model.seo_data === 'object' ? model.seo_data : {},
      };

      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === null) delete payload[key];
      });

      const withFiles = !!(featFile || avatarFile);

      let res;
      if (isEdit) {
        if (withFiles) {
          const fd = toFormData(payload, { featured: featFile || null, avatar: avatarFile || null });
          res = await updateArticleWithFiles(model.id, fd);
        } else {
          res = await updateArticleJSON(model.id, payload);
        }
      } else {
        if (withFiles) {
          const fd = toFormData(payload, { featured: featFile || null, avatar: avatarFile || null });
          res = await createArticleWithFiles(fd);
        } else {
          res = await createArticleJSON(payload);
        }
      }

      setProgress(100);
      setErrors({});
      const data = res?.data?.data || res?.data || res;
      setModel(prev => ({ ...prev, ...(data || {}) }));
      if (isEdit) setBaseline(data || {});

      showSuccess(isEdit ? 'Article mis à jour ✅' : 'Article créé ✅');

      setPostSaveDialog({
        open: true,
        urls: buildUrlsFromArticle(data),
        mode: isEdit ? 'update' : 'create'
      });

      if (!isEdit && data?.id) {
        navigate(`/articles/${data.id}/edit`);
      }
    } catch (err) {
      console.error('Erreur de soumission:', err?.response?.data || err?.message);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const e = err.response.data.errors || {};
        setErrors(e);
        const firstTabWithErrors = Object.entries(tabFields)
          .find(([, fields]) => fields.some((f) => Array.isArray(e[f]) && e[f].length > 0));
        if (firstTabWithErrors) setActiveTab(firstTabWithErrors[0]);
        const errorMessages = Object.entries(e)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        alert(`Erreurs de validation:\n${errorMessages}`);
      } else {
        alert(err?.response?.data?.message || err.message || 'Erreur lors de l\'enregistrement');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ========= Sauvegarde partielle par onglet ========= */
  const savePartial = async (tabId) => {
    if (!isEdit || !model.id) return;
    const fields = tabFields[tabId] || [];
    if (fields.length === 0 && tabId !== 'media' && tabId !== 'author') return;

    const wantsFiles = (tabId === 'media' && !!featFile) || (tabId === 'author' && !!avatarFile);

    const partial = {};
    for (const k of fields) {
      if (k in model) partial[k] = model[k];
    }

    if (tabId === 'settings') {
      if ('published_at' in partial) partial.published_at = partial.published_at ? toSqlDateTime(partial.published_at) : null;
      if ('scheduled_at' in partial) partial.scheduled_at = partial.scheduled_at ? toSqlDateTime(partial.scheduled_at) : null;
      if ('expires_at'   in partial) partial.expires_at   = partial.expires_at   ? toSqlDateTime(partial.expires_at)   : null;
    }
    if (tabId === 'management') {
      if ('reviewed_at' in partial) partial.reviewed_at = partial.reviewed_at ? toSqlDateTime(partial.reviewed_at) : null;
      if ('reviewed_by' in partial) partial.reviewed_by = partial.reviewed_by ? Number(partial.reviewed_by) : null;
    }
    if (tabId === 'analytics') {
      if ('reading_time' in partial) partial.reading_time = Number(partial.reading_time || 0);
      if ('word_count'   in partial) partial.word_count   = Number(partial.word_count || 0);
    }
    if (tabId === 'taxonomy') {
      if ('categories' in partial) partial.categories = ensureNumberArray(partial.categories);
      if ('tags'       in partial) partial.tags       = ensureNumberArray(partial.tags);
    }
    if (tabId === 'author') {
      if ('author_id' in partial) partial.author_id = partial.author_id ? Number(partial.author_id) : null;
    }

    Object.keys(partial).forEach(key => {
      const v = partial[key];
      if (v === '' || v === null) delete partial[key];
    });

    try {
      setIsSubmitting(true);
      setErrors({});

      let res;
      if (wantsFiles) {
        const files = {
          featured: tabId === 'media'  ? (featFile || null)   : null,
          avatar:   tabId === 'author' ? (avatarFile || null) : null,
        };
        const fd = toFormData(partial, files);
        res = await updateArticleWithFiles(model.id, fd);
      } else {
        res = await updateArticleJSON(model.id, partial);
      }

      const updated = res?.data?.data || res?.data || res;
      setModel(prev => ({ ...prev, ...(updated || {}) }));

      setBaseline(prev => {
        const next = { ...(prev || {}) };
        const src = (updated && typeof updated === 'object') ? updated : model;
        for (const k of fields) {
          if (k in src) next[k] = src[k];
        }
        return next;
      });

      if (tabId === 'media')  { setFeatFile(null); setFeatPreview(''); }
      if (tabId === 'author') { setAvatarFile(null); setAvatarPreview(''); }

      showSuccess('Onglet enregistré ✅');
    } catch (err) {
      console.error('Erreur de sauvegarde partielle:', err?.response?.data || err?.message);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const e = err.response.data.errors || {};
        setErrors(e);
        const errorMessages = Object.entries(e)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        alert(`Erreurs de validation:\n${errorMessages}`);
      } else {
        alert(err?.response?.data?.message || err.message || 'Erreur lors de l\'enregistrement de l’onglet');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabLabelMap = {
    content: 'Contenu',
    settings: 'Paramètres',
    author: 'Auteur',
    taxonomy: 'Taxonomie',
    media: 'Médias',
    analytics: 'Stats',
    management: 'Gestion',
    preview: 'Aperçu'
  };
  const handleSaveActiveTab = () => savePartial(activeTab);

  const isCreateValid = !isEdit && Boolean(String(model.title || '').trim()) && Boolean(String(model.content || '').trim());

  const statusConfig = {
    draft: { bg: 'bg-gradient-to-r from-amber-50 to-yellow-50', text: 'text-amber-700', border: 'border-amber-200', icon: '📝' },
    published: { bg: 'bg-gradient-to-r from-emerald-50 to-green-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓' },
    archived: { bg: 'bg-gradient-to-r from-slate-50 to-gray-50', text: 'text-slate-600', border: 'border-slate-200', icon: '📦' }
  };
  const currentStatus = statusConfig[model.status] || statusConfig.draft;

  const visibilityConfig = {
    public: { icon: <FiEye className="w-4 h-4" />, label: 'Public', color: 'text-blue-600' },
    private: { icon: <FiEyeOff className="w-4 h-4" />, label: 'Privé', color: 'text-slate-600' },
    password_protected: { icon: <FiLock className="w-4 h-4" />, label: 'Protégé', color: 'text-orange-600' }
  };
  const currentVisibility = visibilityConfig[model.visibility] || visibilityConfig.public;

  // ======== SEO clean (sans keywords, sans JSON) ========
  const seoObj = parseMaybeJSON(model?.seo_data, {});
  const metaTitle = (seoObj?.meta_title ?? model.title ?? '').toString();
  const metaDescription = (seoObj?.meta_description ?? model.excerpt ?? '').toString();
  const canonicalUrl = (seoObj?.canonical_url ?? '').toString();
  const robotsIndex = typeof seoObj?.robots?.index === 'boolean' ? seoObj.robots.index
                     : (typeof seoObj?.robots_index === 'boolean' ? seoObj.robots_index : true);
  const robotsFollow = typeof seoObj?.robots?.follow === 'boolean' ? seoObj.robots.follow
                      : (typeof seoObj?.robots_follow === 'boolean' ? seoObj.robots_follow : true);

  const setSeo = (patch) =>
    setModel(prev => {
      const cur = parseMaybeJSON(prev.seo_data, {});
      const next = { ...cur, ...patch };
      // normaliser robots en objet {index, follow}
      if ('robots_index' in next || 'robots_follow' in next) {
        next.robots = {
          index: ('robots_index' in next) ? !!next.robots_index : (cur?.robots?.index ?? true),
          follow: ('robots_follow' in next) ? !!next.robots_follow : (cur?.robots?.follow ?? true),
        };
        delete next.robots_index;
        delete next.robots_follow;
      }
      return { ...prev, seo_data: next };
    });

  const titleMax = 60;
  const descMax = 160;
  const titleCount = metaTitle.length;
  const descCount = metaDescription.length;

  const robotsLabel = `${robotsIndex ? 'index' : 'noindex'}, ${robotsFollow ? 'follow' : 'nofollow'}`;
  const previewUrl = canonicalUrl || `https://map.tld/${model.slug || 'slug-de-article'}`;

  const selectedAuthor = useMemo(
    () => adminUsers.find(u => Number(u.id) === Number(model.author_id)) || null,
    [adminUsers, model.author_id]
  );

  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = isEditorModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isEditorModalOpen]);

  // 🔓 Déverrouillage action
  const handleUnlock = async (e) => {
    e?.preventDefault?.();
    if (!unlockPwd.trim()) {
      setLocked(l => ({ ...l, error: "Saisissez le mot de passe." }));
      return;
    }
    try {
      setUnlocking(true);
      setLocked(l => ({ ...l, error: '' }));

      const art = await unlockArticleDirect(idOrSlug, unlockPwd);

      setModel(m => {
        const meta = parseMaybeJSON(art.meta, {});
        const seo  = parseMaybeJSON(art.seo_data, {});
        return { ...m, ...art, meta, seo_data: seo };
      });

      setBaseline(prev => ({ ...(prev || {}), ...art }));
      setLocked({ required: false, reason: '', error: '' });
      setUnlockPwd('');
      showSuccess('Article déverrouillé ✅');
    } catch (err) {
      if (err?.response?.status === 403) {
        setLocked(l => ({
          ...l,
          error: err?.response?.data?.message || "Mot de passe incorrect."
        }));
      } else {
        alert(err?.response?.data?.message || err.message || "Échec du déverrouillage");
      }
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 relative overflow-hidden">
      {/* Barre de progression */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1.5 bg-slate-200/60">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Toast succès */}
      <div
        className={`fixed right-4 top-4 z-[10000] transition-all duration-300 ${toast.open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-lg">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-slate-200/70 shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur opacity-40" />
                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <FiEdit3 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isEdit ? "Modifier l'article" : 'Nouvel article'}
                </h1>
              </div>
            </div>
            <div className="hidden xl:flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border} flex items-center gap-2 shadow-sm`}>
                <span>{currentStatus.icon}</span>
                {model.status === 'draft' && 'Brouillon'}
                {model.status === 'published' && 'Publié'}
                {model.status === 'archived' && 'Archivé'}
              </span>
              <span className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border-2 border-slate-200 text-sm font-medium ${currentVisibility.color} shadow-sm`}>
                {currentVisibility.icon}
                <span>{currentVisibility.label}</span>
              </span>
            </div>
          </div>

          {/* Bandeau global erreurs */}
          {totalErrors > 0 && (
            <div className="mt-3">
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {totalErrors} erreur{totalErrors>1?'s':''} à corriger. Les onglets affichent un badge rouge.
              </div>
            </div>
          )}

          {/* Tabs */}
          <nav className="overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0 mt-4 h-14 flex">
            <ul className="flex items-center gap-2 min-w-max">
              {[
                { id: 'content', label: 'Contenu', icon: <FiEdit3 className="w-4 h-4" />, color: 'from-blue-500 to-cyan-500' },
                { id: 'settings', label: 'Paramètres', icon: <FiSettings className="w-4 h-4" />, color: 'from-violet-500 to-purple-500' },
                { id: 'author', label: 'Auteur', icon: <FiUser className="w-4 h-4" />, color: 'from-pink-500 to-rose-500' },
                { id: 'taxonomy', label: 'Taxonomie', icon: <FiTag className="w-4 h-4" />, color: 'from-green-500 to-emerald-500' },
                { id: 'media', label: 'Médias', icon: <FiUpload className="w-4 h-4" />, color: 'from-orange-500 to-amber-500' },
                { id: 'analytics', label: 'Stats', icon: <FiBarChart2 className="w-4 h-4" />, color: 'from-indigo-500 to-blue-500' },
                { id: 'management', label: 'Gestion', icon: <FiShield className="w-4 h-4" />, color: 'from-red-500 to-pink-500' },
                { id: 'preview', label: 'Aperçu', icon: <FiEye className="w-4 h-4" />, color: 'from-emerald-500 to-teal-500' }
              ].map(tab => (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-2xl border-2 transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r ' + tab.color + ' text-white border-transparent shadow-lg scale-105'
                        : 'bg-white/60 text-slate-700 border-slate-200/70 hover:border-slate-300 hover:bg-white hover:shadow-md'
                    }`}
                  >
                    {activeTab === tab.id && <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse" />}
                    <span className={`relative transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                      {tab.icon}
                    </span>
                    <span className="relative">{tab.label}</span>
                    {tabErrorCount[tab.id] > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                        {tabErrorCount[tab.id]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* BARRE DE SAUVEGARDE D’ONGLET */}
        {isEdit && isTabDirty(activeTab) && (
          <div className="border-t border-slate-200 bg-white/80 backdrop-blur sticky top-[72px] z-40">
            <div className="mx-auto max-w-screen-2xl px-6 lg:px-8 py-3 flex items-center justify-between">
              <div className="text-sm text-slate-700">
                Des modifications non enregistrées dans <span className="font-semibold">« {tabLabelMap[activeTab] || 'Onglet'} »</span>.
              </div>
              <button
                type="button"
                onClick={handleSaveActiveTab}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold shadow bg-emerald-600 hover:bg-emerald-700"
              >
                <FiSave className="w-4 h-4" />
                Enregistrer cet onglet
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="mx-auto max-w-screen-2xl px-6 lg:px-8 py-8 relative z-10">
        {/* CONTENT */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className={`${card} p-8 space-y-6`}>
              <div className="space-y-3">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <span className="text-red-500">*</span>
                    Titre de l'article
                  </span>
                </label>
                <input
                  className={inputClass('title')}
                  value={model.title}
                  onChange={e => onChange('title', e.target.value)}
                  required
                  placeholder="Un titre captivant pour votre article..."
                />
                <FieldError name="title" />
              </div>

              <div className="space-y-3">
                <label className={sectionTitle}>Slug (URL)</label>
                <input
                  className={inputClass('slug')}
                  value={model.slug || ''}
                  onChange={e => onChange('slug', e.target.value)}
                  placeholder="url-conviviale-de-votre-article"
                />
                <p className={hint}>
                  <FiClock className="w-3.5 h-3.5" />
                  Généré automatiquement si laissé vide
                </p>
                <FieldError name="slug" />
              </div>

              {/* Tenant ID (optionnel) */}
              <div className="space-y-2">
                <label className={sectionTitle}>Tenant ID</label>
                <div className="flex gap-2 items-center">
                  <input
                    className={inputBase + ' ' + (tenantLocked ? 'bg-slate-50 cursor-not-allowed' : '')}
                    value={model.tenant_id || ''}
                    onChange={e => onChange('tenant_id', e.target.value)}
                    placeholder="tenant-123"
                    readOnly={tenantLocked}
                  />
                  <button
                    type="button"
                    onClick={() => setTenantLocked(v => !v)}
                    className="px-3 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-xs"
                    title={tenantLocked ? 'Déverrouiller pour modifier' : 'Reverrouiller'}
                  >
                    {tenantLocked ? 'Déverrouiller' : 'Reverrouiller'}
                  </button>
                </div>
              </div>
            </section>

            <section className={`${card} p-8 space-y-3`}>
              <label className={sectionTitle}>Extrait</label>
              <textarea
                rows={8}
                className={`${inputClass('excerpt')} resize-none`}
                value={model.excerpt || ''}
                onChange={e => onChange('excerpt', e.target.value)}
                placeholder="Un résumé engageant de votre article..."
              />
              <p className={hint}>
                <FiUsers className="w-3.5 h-3.5" />
                Idéal pour les aperçus et le référencement
              </p>
              <FieldError name="excerpt" />
            </section>

            <div className={`${card} p-8 space-y-3 w-[205%]`}>
              <div className="flex items-center justify-between">
                <label className={sectionTitle}>Contenu de l'article</label>

                {/* Bouton plein écran (ouvre un MODAL) */}
                <button
                  type="button"
                  onClick={() => setIsEditorModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50"
                  title="Éditer en plein écran"
                >
                  ⤢ Plein écran
                </button>
              </div>

              {/* Éditeur en ligne */}
              <RichTextEditor
                value={model.content || ""}
                onChange={(html) => onChange("content", html)}
                height={520}
              />

              <p className={hint}>
                <FiMessageCircle className="w-3.5 h-3.5" />
                Vous pouvez coller depuis Microsoft Word — la mise en forme utile est conservée.
              </p>

              <FieldError name="content" />
            </div>

            {/* MODAL plein écran */}
            {isEditorModalOpen && (
              <div className="fixed inset-0 z-[10000] bg-slate-900/70 backdrop-blur-sm">
                <div className="absolute inset-0 p-4 md:p-6 flex flex-col">
                  <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/90 border border-slate-200 shadow">
                    <div className="text-sm font-semibold text-slate-800">Édition en plein écran</div>
                    <button
                      type="button"
                      onClick={() => setIsEditorModalOpen(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50"
                      title="Fermer"
                    >
                      ✕ Fermer
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 mt-3 rounded-2xl bg-white border border-slate-200 overflow-hidden">
                    <RichTextEditor
                      value={model.content || ""}
                      onChange={(html) => onChange("content", html)}
                      height={Math.max(360, (typeof window !== 'undefined' ? window.innerHeight : 800) - 160)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEO — version propre et minimale */}
            <section className={`${card} p-8 lg:col-span-2`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                  <FiBarChart2 className="w-4 h-4" />
                </span>
                Optimisation SEO (propre)
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                  {/* Meta Title */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Meta title</label>
                    <input
                      className={inputBase}
                      value={metaTitle}
                      onChange={(e) => setSeo({ meta_title: e.target.value })}
                      placeholder="Titre SEO (≈ 50–60 caractères)"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Affiché comme balise &lt;title&gt;</span>
                      <span className={`text-xs font-semibold ${titleCount > titleMax ? 'text-red-600' : (titleCount >= 50 ? 'text-emerald-600' : 'text-slate-500')}`}>
                        {titleCount}/{titleMax}
                      </span>
                    </div>
                  </div>

                  {/* Meta Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Meta description</label>
                    <textarea
                      rows={5}
                      className={inputBase}
                      value={metaDescription}
                      onChange={(e) => setSeo({ meta_description: e.target.value })}
                      placeholder="Description concise (≈ 150–160 caractères)"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Résumé pour les moteurs de recherche</span>
                      <span className={`text-xs font-semibold ${descCount > descMax ? 'text-red-600' : (descCount >= 140 ? 'text-emerald-600' : 'text-slate-500')}`}>
                        {descCount}/{descMax}
                      </span>
                    </div>
                  </div>

                  {/* Canonical + Robots */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Canonical URL (optionnel)</label>
                      <input
                        className={inputBase}
                        value={canonicalUrl}
                        onChange={(e) => setSeo({ canonical_url: e.target.value })}
                        placeholder="https://exemple.com/chemin-canonique"
                      />
                      <span className="text-xs text-slate-500">Évite le contenu dupliqué</span>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Robots</label>
                      <div className="flex gap-2">
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={robotsIndex}
                            onChange={(e) => setSeo({ robots_index: e.target.checked })}
                          />
                          <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${robotsIndex ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${robotsIndex ? 'translate-x-4' : 'translate-x-0'}`} />
                          </span>
                          index
                        </label>
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={robotsFollow}
                            onChange={(e) => setSeo({ robots_follow: e.target.checked })}
                          />
                          <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${robotsFollow ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${robotsFollow ? 'translate-x-4' : 'translate-x-0'}`} />
                          </span>
                          follow
                        </label>
                      </div>
                      <span className="text-xs text-slate-500">Balise <code>robots</code> : {robotsLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Aside tips + mini aperçu */}
                <aside className="lg:col-span-1 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    Conseils : concentre le *meta title* (≤60) sur l’intention de recherche, garde une *meta description* claire (≤160), et définis une URL canonique si nécessaire.
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-400 mb-2">Aperçu Google (mini)</div>
                    <div className="max-w-xs">
                      <div className="text-[#1a0dab] text-sm leading-5 truncate">
                        {metaTitle || model.title || 'Titre de l’article'}
                      </div>
                      <div className="text-[#006621] text-xs truncate">
                        {previewUrl}
                      </div>
                      <div className="text-[#545454] text-xs line-clamp-2">
                        {metaDescription || model.excerpt || 'La description s’affichera ici.'}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 gap-6">
            <section className={`${card} p-8`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className={sectionTitle}>Statut de publication</label>
                  <select className={`${inputClass('status')} cursor-pointer`} value={model.status || 'draft'} onChange={e => onChange('status', e.target.value)}>
                    <option value="draft">📝 Brouillon</option>
                    <option value="published">✓ Publié</option>
                    <option value="archived">📦 Archivé</option>
                  </select>
                  <FieldError name="status" />
                </div>
                <div className="space-y-3">
                  <label className={sectionTitle}>Visibilité</label>
                  <select className={`${inputClass('visibility')} cursor-pointer`} value={model.visibility || 'public'} onChange={e => onChange('visibility', e.target.value)}>
                    <option value="public">👁️ Publique</option>
                    <option value="private">🔒 Privée</option>
                    <option value="password_protected">🔐 Protégée</option>
                  </select>
                  <FieldError name="visibility" />
                </div>
                {model.visibility === 'password_protected' && (
                  <div className="space-y-3">
                    <label className={sectionTitle}>Mot de passe</label>
                    <input
                      type="password"
                      className={inputClass('password')}
                      value={model.password || ''}
                      onChange={e => onChange('password', e.target.value)}
                      placeholder="Mot de passe requis"
                    />
                    <FieldError name="password" />
                  </div>
                )}
              </div>
            </section>

            <section className={`${card} p-8`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                  <FiCalendar className="w-4 h-4" />
                </span>
                Planification temporelle
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Date de publication</label>
                  <input
                    type="datetime-local"
                    className={inputClass('published_at')}
                    value={toInputLocal(model.published_at)}
                    onChange={e => onChange('published_at', toSqlDateTime(e.target.value))}
                  />
                  <p className="text-xs text-slate-500">
                    {toDate(model.published_at) ? `${formatDate(toDate(model.published_at))} • ${formatTime(toDate(model.published_at))}` : '—'}
                  </p>
                  <FieldError name="published_at" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Publication programmée</label>
                  <input
                    type="datetime-local"
                    className={inputClass('scheduled_at')}
                    value={toInputLocal(model.scheduled_at)}
                    onChange={e => onChange('scheduled_at', toSqlDateTime(e.target.value))}
                  />
                  <p className="text-xs text-slate-500">
                    {toDate(model.scheduled_at) ? `${formatDate(toDate(model.scheduled_at))} • ${formatTime(toDate(model.scheduled_at))}` : '—'}
                  </p>
                  <FieldError name="scheduled_at" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Date d'expiration</label>
                  <input
                    type="datetime-local"
                    className={inputClass('expires_at')}
                    value={toInputLocal(model.expires_at)}
                    onChange={e => onChange('expires_at', toSqlDateTime(e.target.value))}
                  />
                  <p className="text-xs text-slate-500">
                    {toDate(model.expires_at) ? `${formatDate(toDate(model.expires_at))} • ${formatTime(toDate(model.expires_at))}` : '—'}
                  </p>
                  <FieldError name="expires_at" />
                </div>
              </div>
            </section>

            <section className={`${card} p-6`}>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Options d'interaction</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'is_featured', label: 'À la Une', icon: <FiStar className="w-4 h-4" /> },
                  { key: 'is_sticky', label: 'Épinglé', icon: '📌' },
                  { key: 'allow_comments', label: 'Commentaires', icon: <FiMessageCircle className="w-4 h-4" /> },
                  { key: 'allow_sharing', label: 'Partage', icon: <FiShare2 className="w-4 h-4" /> },
                  { key: 'allow_rating', label: 'Notation', icon: <FiThumbsUp className="w-4 h-4" /> }
                ].map(option => {
                  const checked = !!model[option.key];
                  return (
                    <label
                      key={option.key}
                      className={`group flex items-center justify-between gap-3 p-3 rounded-lg border bg-white/60
                                  border-slate-200 hover:bg-white hover:border-slate-300
                                  transition-all duration-150 shadow-none hover:shadow-sm
                                  flex-1 min-w-[150px] sm:min-w-[180px] lg:min-w-[200px]
                                  focus-within:ring-2 focus-within:ring-blue-500/40`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-slate-500">{option.icon}</span>
                        <span className="text-xs font-medium text-slate-800 truncate leading-none">{option.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => onChange(option.key, e.target.checked)}
                        className="sr-only"
                        role="switch"
                        aria-checked={checked}
                        aria-label={option.label}
                      />
                      <span
                        aria-hidden="true"
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                                  ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow
                                      transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* AUTHOR */}
        {activeTab === 'author' && (
          <div className="grid grid-cols-1 gap-6">
            <section className={`${card} p-8`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg">
                  <FiUser className="w-4 h-4" />
                </span>
                Informations de l'auteur (admins uniquement)
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6 lg:col-span-2">
                  <div className="space-y-3">
                    <label className={sectionTitle}>Recherche d'un auteur admin</label>
                    <div className="relative">
                      <input
                        className={`${inputBase} pl-9`}
                        placeholder="Rechercher un auteur admin…"
                        value={authorSearch}
                        onChange={(e) => setAuthorSearch(e.target.value)}
                      />
                      <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none">
                        <path d="M21 21l-4.3-4.3m1.6-5.3a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={sectionTitle}>Auteur (admin)</label>
                    <select
                      className={inputClass('author_id')}
                      value={model.author_id || ''}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : '';
                        const picked = adminUsers.find(u => Number(u.id) === Number(id));
                        setModel(prev => ({
                          ...prev,
                          author_id: id,
                          author_name: picked?.name || prev.author_name,
                          tenant_id: tenantLocked ? (picked?.tenant_id ?? prev.tenant_id) : prev.tenant_id,
                          author_avatar: picked?.avatar || prev.author_avatar,
                        }));
                      }}
                    >
                      <option value="">— Sélectionner —</option>
                      {filteredAdmins.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.tenant_id ? `• T#${u.tenant_id}` : ''}
                        </option>
                      ))}
                    </select>
                    <FieldError name="author_id" />

                    {selectedAuthor && (
                      <div className="mt-3 flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-white/70">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                          {model.author_avatar || selectedAuthor.avatar ? (
                            <img src={model.author_avatar || selectedAuthor.avatar} alt={selectedAuthor.name} className="w-full h-full object-cover" />
                          ) : (
                            (selectedAuthor.name || '#').split(' ').map(p => p[0]).join('').slice(0,2)
                          )}
                        </div>
                        <div className="text-sm">
                          <div className="font-semibold text-slate-800">{selectedAuthor.name}</div>
                          <div className="text-slate-500">ID: {selectedAuthor.id}{selectedAuthor.tenant_id ? ` • Tenant: ${selectedAuthor.tenant_id}` : ''}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar auteur : upload + preview */}
                <div className="space-y-3 lg:col-span-1">
                  <label className={sectionTitle}>Avatar de l'auteur</label>

                  <ImageDropPaste
                    id="author-avatar"
                    label="Choisir / déposer / coller un avatar"
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    file={avatarFile}
                    previewUrl={avatarPreview}
                    existingUrl={model.author_avatar || ''}  // si édition, on l’affiche
                    onPickFile={(f) => {
                      setAvatarFile(f);
                    }}
                    alt=""
                    showAlt={false}
                    errorNode={<FieldError name="author_avatar_file" />}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAXONOMY */}
        {activeTab === 'taxonomy' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className={`${card} p-8 space-y-4`}>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg">
                  <FiFolder className="w-4 h-4" />
                </span>
                Catégories
              </h3>
              {cats?.length ? (
                <select
                  multiple
                  className={`${inputClass('categories')} h-48`}
                  value={model.categories}
                  onChange={(e) => {
                    const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                    onChange('categories', vals);
                  }}
                >
                  {cats.map(c => (
                    <option key={c.id ?? c.value ?? c} value={c.id ?? c.value ?? c} className="py-2">
                      {c.name || c.title || `#${c.id ?? c}`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass('categories')}
                  placeholder="IDs séparés par des virgules (ex: 1,2,3)"
                  value={Array.isArray(model.categories) ? model.categories.join(',') : ''}
                  onChange={e => onChange('categories', e.target.value.split(',').map(v => Number(v.trim())).filter(Boolean))}
                />
              )}
              <p className={hint}>
                <FiFolder className="w-3.5 h-3.5" />
                La première catégorie sera définie comme primaire
              </p>
              <FieldError name="categories" />
            </section>

            <section className={`${card} p-8 space-y-4`}>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 text-white shadow-lg">
                  <FiTag className="w-4 h-4" />
                </span>
                Tags
              </h3>
              {tags?.length ? (
                <select
                  multiple
                  className={`${inputClass('tags')} h-48`}
                  value={model.tags}
                  onChange={(e) => {
                    const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                    onChange('tags', vals);
                  }}
                >
                  {tags.map(t => (
                    <option key={t.id ?? t.value ?? t} value={t.id ?? t.value ?? t} className="py-2">
                      {t.name || t.title || `#${t.id ?? t}`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass('tags')}
                  placeholder="IDs séparés par des virgules (ex: 5,12,18)"
                  value={Array.isArray(model.tags) ? model.tags.join(',') : ''}
                  onChange={e => onChange('tags', e.target.value.split(',').map(v => Number(v.trim())).filter(Boolean))}
                />
              )}
              <p className={hint}>
                <FiTag className="w-3.5 h-3.5" />
                Sélectionnez plusieurs tags pertinents
              </p>
              <FieldError name="tags" />
            </section>
          </div>
        )}

        {/* MEDIA */}
        {activeTab === 'media' && (
          <div className="flex gap-6 w-full flex-col lg:flex-row items-center justify-center">
            <section className={`${card} p-8 space-y-4 w-full`}>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg">
                  <FiUpload className="w-4 h-4" />
                </span>
                Image à la Une
              </h3>

              <ImageDropPaste
                id="featured-image"
                label="Télécharger / déposer / coller l'image principale"
                accept="image/png, image/jpeg, image/webp, image/gif"
                file={featFile}
                previewUrl={featPreview}
                existingUrl={model.featured_image || ''} // URL backend si édition
                alt={model.featured_image_alt || ''}
                showAlt
                inputClass={inputClass('featured_image_alt')}
                onPickFile={(f) => setFeatFile(f)}
                onChangeAlt={(val) => onChange('featured_image_alt', val)}
                helperNode={<p className={hint}>Important pour le SEO et l'accessibilité</p>}
                errorNode={
                  <>
                    <FieldError name="featured_image_file" />
                    <FieldError name="featured_image_alt" />
                  </>
                }
              />
            </section>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 gap-6">
            <section className={`${card} p-8`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg">
                  <FiBarChart2 className="w-4 h-4" />
                </span>
                Métriques de performance
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="relative group">
                  <div className="relative space-y-3">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <FiClock className="w-4 h-4 text-blue-600" />
                      Temps de lecture
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={`${inputClass('reading_time')} text-center text-lg font-bold`}
                      value={model.reading_time || 0}
                      onChange={e => onChange('reading_time', parseInt(e.target.value, 10) || 0)}
                      placeholder="5"
                    />
                    <p className="text-xs text-slate-500 text-center">minutes</p>
                    <FieldError name="reading_time" />
                  </div>
                </div>

                <div className="relative group">
                  <div className="relative space-y-3">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <FiEdit3 className="w-4 h-4 text-purple-600" />
                      Nombre de mots
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={`${inputClass('word_count')} text-center text-lg font-bold`}
                      value={model.word_count || 0}
                      onChange={e => onChange('word_count', parseInt(e.target.value, 10) || 0)}
                      placeholder="1500"
                    />
                    <p className="text-xs text-slate-500 text-center">mots</p>
                    <FieldError name="word_count" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* MANAGEMENT */}
        {activeTab === 'management' && (
          <div className="grid grid-cols-1 gap-6">
            <section className={`${card} p-8`}>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-lg">
                  <FiShield className="w-4 h-4" />
                </span>
                Gestion & révision
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className={sectionTitle}>Révisé par (ID utilisateur)</label>
                    <input className={inputClass('reviewed_by')} value={model.reviewed_by || ''} onChange={e => onChange('reviewed_by', e.target.value)} placeholder="ID du réviseur" />
                    <FieldError name="reviewed_by" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className={sectionTitle}>Date de révision</label>
                    <input
                      type="datetime-local"
                      className={inputClass('reviewed_at')}
                      value={toInputLocal(model.reviewed_at)}
                      onChange={e => onChange('reviewed_at', toSqlDateTime(e.target.value))}
                    />
                    <p className="text-xs text-slate-500">
                      {toDate(model.reviewed_at) ? `${formatDate(toDate(model.reviewed_at))} • ${formatTime(toDate(model.reviewed_at))}` : '—'}
                    </p>
                    <FieldError name="reviewed_at" />
                  </div>
                  <div className="space-y-3">
                    <label className={sectionTitle}>Notes de révision</label>
                    <textarea rows={6} className={inputClass('review_notes')} value={model.review_notes || ''} onChange={e => onChange('review_notes', e.target.value)} placeholder="Commentaires, suggestions d'amélioration..." />
                    <FieldError name="review_notes" />
                  </div>
                </div>
              </div>
            </section>

            <section className={`${card} p-8`}>
              <h4 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                <FiClock className="w-4 h-4 text-slate-600" />
                Horodatage système (lecture seule)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600">Créé le</label>
                  <input type="datetime-local" className={`${inputBase} bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 cursor-not-allowed`} value={toInputLocal(model.created_at)} readOnly />
                  <div className="text-xs text-slate-500">
                    {toDate(model.created_at) ? `${formatDate(toDate(model.created_at))} • ${formatTime(toDate(model.created_at))} (${formatRelative(toDate(model.created_at))})` : '—'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600">Modifié le</label>
                  <input type="datetime-local" className={`${inputBase} bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 cursor-not-allowed`} value={toInputLocal(model.updated_at)} readOnly />
                  <div className="text-xs text-slate-500">
                    {toDate(model.updated_at) ? `${formatDate(toDate(model.updated_at))} • ${formatTime(toDate(model.updated_at))} (${formatRelative(toDate(model.updated_at))})` : '—'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600">Supprimé le</label>
                  <input type="datetime-local" className={`${inputBase} bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 cursor-not-allowed`} value={toInputLocal(model.deleted_at)} readOnly />
                  <div className="text-xs text-slate-500">
                    {toDate(model.deleted_at) ? `${formatDate(toDate(model.deleted_at))} • ${formatTime(toDate(model.deleted_at))} (${formatRelative(toDate(model.deleted_at))})` : '—'}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* PREVIEW */}
        {activeTab === 'preview' && (
          <section className={`${card} p-8`}>
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                <FiEye className="w-4 h-4" />
              </span>
              Aperçu de la saisie
            </h3>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-400 mb-2">Aperçu Google</div>
              <div className="max-w-2xl">
                <div className="text-[#1a0dab] text-lg leading-6 truncate">
                  {metaTitle || model.title || 'Titre de l’article'}
                </div>
                <div className="text-[#006621] text-sm truncate">
                  {previewUrl}
                </div>
                <div className="text-[#545454] text-sm line-clamp-2">
                  {metaDescription || model.excerpt || 'La description s’affichera ici.'}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer actions */}
      <footer className="sticky bottom-0 z-40 bg-white/80 backdrop-blur-xl border-t border-slate-200">
        <div className="mx-auto max-w-screen-2xl px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isEdit ? `Édition de l’article #${model.id ?? ''}` : 'Création d’un nouvel article'}
          </div>

          <div className="flex items-center gap-3">
            {isEdit ? (
              isAnyTabDirty ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold shadow
                    ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <FiSave className="w-4 h-4" />
                  {isSubmitting ? 'Enregistrement…' : 'Mettre à jour'}
                </button>
              ) : null
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !isCreateValid}
                title={!isCreateValid ? 'Renseignez au moins le titre et le contenu' : undefined}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold shadow
                  ${(!isCreateValid || isSubmitting) ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <FiSave className="w-4 h-4" />
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Dialog post-save */}
      {postSaveDialog.open && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setPostSaveDialog(d => ({ ...d, open: false }))}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {postSaveDialog.mode === 'create' ? 'Article créé' : 'Modifications enregistrées'}
              </h3>
              <p className="text-sm text-slate-600 mt-1">Que souhaitez-vous faire maintenant&nbsp;?</p>
            </div>
            <div className="p-6 space-y-3">
              <a
                className="flex items-center justify-between w-full px-4 py-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold"
                href={postSaveDialog.urls?.viewUrl || '#'}
                target="_blank"
                rel="noreferrer"
              >
                <span>👁️ Visualiser l’article (nouvel onglet)</span>
                <span className="text-xs font-bold">Ouvrir</span>
              </a>
              <a
                className="flex items-center justify-between w-full px-4 py-3 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold"
                href={postSaveDialog.urls?.listUrl || '#'}
              >
                <span>📚 Revenir à la liste des articles</span>
                <span className="text-xs font-bold">Aller</span>
              </a>
              <a
                className="flex items-center justify-between w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold"
                href={postSaveDialog.urls?.editUrl || '#'}
              >
                <span>✏️ Rester sur la page de modification</span>
                <span className="text-xs font-bold">Continuer</span>
              </a>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setPostSaveDialog(d => ({ ...d, open: false }))}
                className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 Modal de mot de passe pour article protégé */}
      {locked.required && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUnlock}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow">
                <FiLock className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Article protégé</h3>
                <p className="text-sm text-slate-600">
                  {locked.reason || "Saisissez le mot de passe pour éditer cet article."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                value={unlockPwd}
                onChange={(e) => setUnlockPwd(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
              {locked.error && <p className="text-xs text-red-600">{locked.error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/articlescontroler'))}
                className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={unlocking}
                className={`px-4 py-2 rounded-xl text-white font-semibold shadow
                  ${unlocking ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {unlocking ? 'Déverrouillage…' : 'Déverrouiller'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ArticleForm;
