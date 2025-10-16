// src/pages/articles/ArticleMediaManager.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  FiUpload, FiEdit3, FiTrash2, FiImage, FiRefreshCw, FiStar,
  FiToggleLeft, FiToggleRight, FiAlertTriangle, FiX,
  FiChevronDown, FiChevronUp, FiGrid, FiList, FiRotateCw, FiCornerUpLeft
} from "react-icons/fi";

/* =========================================================
   AXIOS LOCAL
   ========================================================= */
const API_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
  '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tokenGuard");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers["Content-Type"];
  else if (!config.headers["Content-Type"]) config.headers["Content-Type"] = "application/json";
  config.headers.Accept = "application/json";
  return config;
});

const ROUTES = {
  byArticle: (articleId) => `/article-media/by-article/${articleId}`,
  upload: `/article-media/upload`,
  update: (id) => `/article-media/${id}`,
  destroy: (id) => `/article-media/${id}`,
  toggleActive: (id) => `/article-media/${id}/toggle-active`,
  toggleFeatured: (id) => `/article-media/${id}/toggle-featured`,
  restore: (id) => `/article-media/${id}/restore`,
  forceDelete: (id) => `/article-media/${id}/force`,
};

const http = {
  async listByArticle(articleId, params = {}) {
    return api.get(ROUTES.byArticle(articleId), { params });
  },
  async upload(fd, onProgress) {
    return api.post(ROUTES.upload, fd, { onUploadProgress: onProgress });
  },
  async update(id, payload) {
    return api.put(ROUTES.update(id), payload);
  },
  async destroy(id) {
    return api.delete(ROUTES.destroy(id));
  },
  async toggleActive(id) {
    return api.post(ROUTES.toggleActive(id));
  },
  async toggleFeatured(id) {
    return api.post(ROUTES.toggleFeatured(id));
  },
  async restore(id) {
    return api.post(ROUTES.restore(id));
  },
  async forceDelete(id) {
    return api.delete(ROUTES.forceDelete(id));
  },
};

/* =========================================================
   UI Utils
   ========================================================= */
const fmtBytes = (b = 0) => {
  const n = Number(b) || 0;
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} Mo`;
  return `${(n / 1024 ** 3).toFixed(1)} Go`;
};

const Badge = ({ children, className = "" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${className}`}>
    {children}
  </span>
);

const IconBtn = ({ title, onClick, children, variant = "blue", disabled }) => {
  const palette = variant === "red"
    ? "border-rose-300 text-rose-700 hover:bg-rose-50"
    : variant === "amber"
    ? "border-amber-300 text-amber-700 hover:bg-amber-50"
    : "border-blue-300 text-blue-700 hover:bg-blue-50";
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 bg-white transition ${palette} disabled:opacity-50`}
    >
      {children}
    </button>
  );
};

const Toast = ({ open, kind = "success", msg = "" }) => {
  const color =
    kind === "error"
      ? "bg-rose-600"
      : kind === "warn"
      ? "bg-amber-600"
      : "bg-emerald-600";
  return (
    <div
      className={`fixed right-4 top-4 z-[10000] transition-all duration-300 ${
        open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${color} text-white shadow-lg`}>
        {kind === "error" ? <FiX className="w-5 h-5" /> : <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span>}
        <span className="text-sm font-semibold">{msg}</span>
      </div>
    </div>
  );
};

/* =========================================================
   Confirm Dialog
   ========================================================= */
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, danger = false }) => {
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflowY;
    html.style.overflowY = "hidden";
    return () => { html.style.overflowY = prev; };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" aria-modal="true" role="alertdialog">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative z-[100001] w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${danger ? "bg-rose-100" : "bg-blue-100"}`}>
              {danger ? <FiAlertTriangle className="w-6 h-6 text-rose-600" /> : <FiImage className="w-6 h-6 text-blue-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onCancel} className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold">Annuler</button>
            <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-white font-semibold shadow ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}>Confirmer</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

/* =========================================================
   Lightbox
   ========================================================= */
const Lightbox = ({ open, src, alt, onClose }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10050] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-4 right-0 translate-y-[-100%] px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 text-slate-900 font-semibold shadow">Fermer</button>
        <img src={src} alt={alt || "Image"} className="w-full h-auto rounded-2xl shadow-2xl" />
      </div>
    </div>
  );
};

/* =========================================================
   Upload Modal
   ========================================================= */
const UploadModal = ({ open, onClose, onUploaded, articleId }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");

  const dropRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflowY;
    html.style.overflowY = "hidden";
    return () => { html.style.overflowY = prev; };
  }, [open]);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const drop = (e) => {
      prevent(e);
      const f = e.dataTransfer?.files?.[0];
      if (f) onPick(f);
    };
    ["dragenter","dragover","dragleave","drop"].forEach((evt) => el.addEventListener(evt, prevent));
    el.addEventListener("drop", drop);
    return () => {
      ["dragenter","dragover","dragleave","drop"].forEach((evt) => el.removeEventListener(evt, prevent));
      el.removeEventListener("drop", drop);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setFile(null); setPreview(""); setName(""); setAlt(""); setCaption("");
      setIsFeatured(false); setSubmitting(false); setProgress(0); setErr("");
    }
  }, [open]);

  const onPick = (f) => {
    const maxSize = 100 * 1024 * 1024;
    if (f.size > maxSize) {
      setErr(`Fichier trop volumineux (${fmtBytes(f.size)}). Maximum: 100 MB`);
      return;
    }
    setFile(f);
    setErr("");
    try { setName((v) => v || f.name.replace(/\.[^.]+$/, "")); } catch {}
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    setErr("");
    if (!file) { setErr("Choisissez un fichier."); return; }

    try {
      setSubmitting(true);
      setProgress(0);
      const fd = new FormData();
      fd.append("file", file, file.name);
      fd.append("article_id", String(articleId));
      fd.append("name", name || file.name);
      if (alt) fd.append("alt_text[fr]", alt);
      if (caption) fd.append("caption[fr]", caption);
      fd.append("is_featured", isFeatured ? "1" : "0");

      const res = await http.upload(fd, (prog) => {
        const p = Math.round((prog.loaded * 100) / (prog.total || 1));
        setProgress(p);
      });
      onUploaded?.(res?.data?.data || res?.data);
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur lors du téléchargement";
      setErr(msg);
    } finally { setSubmitting(false); setProgress(0); }
  };

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" aria-modal="true" role="dialog">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />
        <div className="relative z-[100001] w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Ajouter un média</h3>
            <button onClick={onClose} disabled={submitting} className="px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-50">Fermer</button>
          </div>

          <div ref={dropRef} className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-slate-50/60 text-center">
            {preview ? (
              <img src={preview} alt="Preview" className="mx-auto max-h-64 rounded-xl" />
            ) : (
              <div className="text-slate-600">
                <FiUpload className="w-8 h-8 mx-auto mb-3" />
                <div className="font-semibold">Déposez un fichier ici</div>
                <div className="text-xs mt-1 text-slate-500">Max: 100 MB</div>
              </div>
            )}
            <div className="mt-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold cursor-pointer">
                <FiUpload />
                Choisir un fichier
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,application/pdf"
                  className="sr-only"
                  disabled={submitting}
                  onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nom</label>
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 disabled:bg-slate-50" placeholder="Nom interne" />
              <label className="text-sm font-semibold text-slate-700">Texte alternatif (FR)</label>
              <input value={alt} onChange={(e) => setAlt(e.target.value)} disabled={submitting} className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 disabled:bg-slate-50" />
              <label className="text-sm font-semibold text-slate-700">Légende (FR)</label>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} disabled={submitting} className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 disabled:bg-slate-50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Options</label>
              <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white cursor-pointer text-sm">
                <span className="flex items-center gap-2"><FiStar className="text-amber-500" /> Vedette</span>
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} disabled={submitting} className="sr-only" />
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${isFeatured ? "bg-blue-600" : "bg-slate-300"}`}>
                  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isFeatured ? "translate-x-4" : "translate-x-0"}`} />
                </span>
              </label>
              {file && (
                <div className="text-xs text-slate-600 mt-2 p-2 bg-slate-50 rounded-lg">
                  <div className="font-semibold">{file.name}</div>
                  <div className="text-slate-500 mt-1">{fmtBytes(file.size)}</div>
                </div>
              )}
            </div>
          </div>

          {submitting && progress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Téléversement en cours...</span>
                <span className="font-semibold text-blue-600">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {err && <p className="text-sm text-rose-600 flex items-center gap-2"><FiAlertTriangle className="w-4 h-4" />{err}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-50">Annuler</button>
            <button onClick={submit} disabled={submitting || !file} className={`px-4 py-2 rounded-xl text-white font-semibold shadow ${submitting || !file ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {submitting ? `Envoi... ${progress}%` : "Téléverser"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

/* =========================================================
   Edit Modal
   ========================================================= */
const EditModal = ({ open, media, onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflowY;
    html.style.overflowY = "hidden";
    return () => { html.style.overflowY = prev; };
  }, [open]);

  useEffect(() => {
    if (open && media) {
      setName(media.name || "");
      setAlt((media.alt_text?.fr ?? media.alt_text?.[0] ?? "") || "");
      setCaption((media.caption?.fr ?? media.caption?.[0] ?? "") || "");
      setSortOrder(media.sort_order ?? 0);
      setIsActive(Boolean(media.is_active));
      setIsFeatured(Boolean(media.is_featured));
      setErr("");
    }
  }, [open, media]);

  const submit = async () => {
    if (!media) return;
    try {
      setSaving(true);
      setErr("");
      const body = {
        name,
        sort_order: Number(sortOrder) || 0,
        is_active: !!isActive,
        is_featured: !!isFeatured,
        alt_text: alt ? { fr: alt } : {},
        caption: caption ? { fr: caption } : {},
      };
      const res = await http.update(media.id, body);
      onSaved?.(res?.data?.data || res?.data);
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur lors de la mise à jour";
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !media) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" aria-modal="true" role="dialog">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-[100001] w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Modifier le média</h3>
            <button onClick={onClose} className="px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold">Fermer</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <img src={media.thumbnail_url || media.url} alt={media.alt_text?.fr || media.alt_text?.[0] || media.name} className="w-full h-auto rounded-xl border" />
              <div className="text-xs text-slate-500 mt-2">{media.mime_type} • {fmtBytes(media.size)}</div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nom</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Texte alternatif (FR)</label>
                  <input value={alt} onChange={(e) => setAlt(e.target.value)} className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Légende (FR)</label>
                  <input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Ordre</label>
                  <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
                </div>
                <label className="flex items-center justify-between gap-2 mt-6 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white cursor-pointer text-sm">
                  <span className="flex items-center gap-2">{isActive ? <FiToggleRight className="text-blue-600" /> : <FiToggleLeft className="text-slate-500" />} Actif</span>
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only" />
                  <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${isActive ? "bg-blue-600" : "bg-slate-300"}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </label>
                <label className="flex items-center justify-between gap-2 mt-6 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white cursor-pointer text-sm">
                  <span className="flex items-center gap-2"><FiStar className="text-amber-500" /> Vedette</span>
                  <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="sr-only" />
                  <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${isFeatured ? "bg-blue-600" : "bg-slate-300"}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isFeatured ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </label>
              </div>
            </div>
          </div>

          {err && <p className="text-sm text-rose-600">{err}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold">Annuler</button>
            <button onClick={submit} disabled={saving} className={`px-4 py-2 rounded-xl text-white font-semibold shadow ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

/* =========================================================
   Composant principal
   ========================================================= */
const ArticleMediaManager = ({ articleId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [lightboxAlt, setLightboxAlt] = useState("");

  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null, danger: false });

  const [toast, setToast] = useState({ open: false, kind: "success", msg: "" });
  const toastTimer = useRef(null);
  const showToast = (msg, kind = "success") => {
    setToast({ open: true, kind, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ open: false, kind, msg: "" }), 2600);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  // Filtres / vue
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [type, setType] = useState("");            // image|video|audio|document
  const [isActive, setIsActive] = useState("");    // "", "1", "0"
  const [isFeatured, setIsFeatured] = useState(""); // "", "1", "0"
  const [sortBy, setSortBy] = useState("sort_order");
  const [sortDir, setSortDir] = useState("asc");
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [inTrash, setInTrash] = useState(false);    // Vue corbeille

  const load = async () => {
    if (!articleId) return;
    try {
      setLoading(true);
      setErr("");

      // ✅ type en minuscule (conforme à l'Enum backend)
      const params = {
        ...(type ? { type } : {}),
        ...(isActive !== "" ? { is_active: isActive === "1" } : {}),
        ...(isFeatured !== "" ? { is_featured: isFeatured === "1" } : {}),
        sort_by: sortBy,
        sort_dir: sortDir,
        per_page: 9999,
        // ✅ gestion corbeille
        ...(inTrash ? { trashed: "only" } : {}),
      };

      const res = await http.listByArticle(articleId, params);
      const data = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);

      // Garde-fou si l’API n’applique pas trashed=only : on re-filtre localement.
      const safe = inTrash ? data.filter(x => !!x.deleted_at) : data.filter(x => !x.deleted_at);
      setItems(safe);
    } catch (e) {
      const msg = e?.response?.status === 403
        ? "Non autorisé (403). Vérifie l'authentification/Policy."
        : (e?.response?.data?.message || e?.message || "Erreur de chargement");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [articleId, refreshKey, type, isActive, isFeatured, sortBy, sortDir, inTrash]);

  const onUploaded = () => { showToast("Média téléversé ✅"); setRefreshKey((k) => k + 1); };

  const openEdit = (m) => {
    setConfirmDialog({
      open: true,
      title: "Modifier le média",
      message: `Voulez-vous modifier "${m.name}" ?`,
      danger: false,
      onConfirm: () => {
        setCurrent(m);
        setEditOpen(true);
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  const onSaved = () => { showToast("Média mis à jour ✅"); setRefreshKey((k) => k + 1); };

  const onDelete = (m) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer le média",
      message: `Êtes-vous sûr de vouloir supprimer "${m.name}" ? Cette action est réversible (corbeille).`,
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          await http.destroy(m.id);
          showToast("Média supprimé ✅");
          setItems((arr) => arr.filter((x) => x.id !== m.id));
        } catch (e) {
          const msg = e?.response?.data?.message || e?.message || "Suppression impossible";
          showToast(msg, "error");
        }
      }
    });
  };

  const onRestore = (m) => {
    setConfirmDialog({
      open: true,
      title: "Restaurer le média",
      message: `Restaurer "${m.name}" de la corbeille ?`,
      danger: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          await http.restore(m.id);
          showToast("Média restauré ✅");
          setRefreshKey(k => k + 1);
        } catch {
          showToast("Erreur de restauration", "error");
        }
      }
    });
  };

  const onForceDelete = (m) => {
    setConfirmDialog({
      open: true,
      title: "Suppression définitive",
      message: `Supprimer définitivement "${m.name}" ? Cette action est irréversible.`,
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          await http.forceDelete(m.id);
          showToast("Média supprimé définitivement ✅");
          setRefreshKey(k => k + 1);
        } catch {
          showToast("Erreur suppression définitive", "error");
        }
      }
    });
  };

  const toggleActive = (m) => {
    const newStatus = !m.is_active;
    setConfirmDialog({
      open: true,
      title: newStatus ? "Activer le média" : "Désactiver le média",
      message: `Voulez-vous ${newStatus ? "activer" : "désactiver"} "${m.name}" ?`,
      danger: !newStatus,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          const res = await http.toggleActive(m.id);
          const upd = res?.data?.data || res?.data;
          setItems((arr) => arr.map((it) => (it.id === m.id ? { ...it, ...upd } : it)));
          showToast(`Média ${newStatus ? "activé" : "désactivé"} ✅`);
        } catch {
          showToast("Erreur statut actif", "error");
        }
      }
    });
  };

  const toggleFeatured = (m) => {
    const newStatus = !m.is_featured;
    setConfirmDialog({
      open: true,
      title: newStatus ? "Définir comme vedette" : "Retirer de la vedette",
      message: `Voulez-vous ${newStatus ? "mettre" : "retirer"} "${m.name}" ${newStatus ? "en" : "de la"} vedette ?`,
      danger: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          const res = await http.toggleFeatured(m.id);
          const upd = res?.data?.data || res?.data;
          setItems((arr) => arr.map((it) => (it.id === m.id ? { ...it, ...upd } : it)));
          showToast(`Média ${newStatus ? "mis en" : "retiré de la"} vedette ✅`);
        } catch {
          showToast("Erreur statut vedette", "error");
        }
      }
    });
  };

  const openLightbox = (m) => {
    setLightboxSrc(m.url || m.thumbnail_url);
    setLightboxAlt(m.alt_text?.fr || m.alt_text?.[0] || m.name || "");
    setLightboxOpen(true);
  };

  const header = useMemo(
    () => (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur opacity-40" />
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
              <FiImage className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Médias de l'article</h2>
            <div className="text-xs text-slate-500">
              Gestion des fichiers liés à l'article #{articleId}
              {inTrash && <span className="ml-2 text-rose-600 font-semibold">• CORBEILLE</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!inTrash ? (
            <IconBtn title="Ouvrir la corbeille" onClick={() => setInTrash(true)} variant="red">
              <FiTrash2 />
              <span className="hidden sm:inline text-[12px] font-semibold">Corbeille</span>
            </IconBtn>
          ) : (
            <IconBtn title="Retour au dossier principal" onClick={() => setInTrash(false)}>
              <FiCornerUpLeft />
              <span className="hidden sm:inline text-[12px] font-semibold">Retour</span>
            </IconBtn>
          )}

          <IconBtn title="Rafraîchir" onClick={() => setRefreshKey((k) => k + 1)}>
            <FiRefreshCw />
            <span className="hidden sm:inline text-[12px] font-semibold">Rafraîchir</span>
          </IconBtn>

          {!inTrash && (
            <IconBtn title="Ajouter un média" onClick={() => setUploadOpen(true)}>
              <FiUpload />
              <span className="hidden sm:inline text-[12px] font-semibold">Ajouter</span>
            </IconBtn>
          )}
        </div>
      </div>
    ),
    [articleId, inTrash]
  );

  const Filters = (
    <div className="mt-4">
      <button
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50"
        onClick={() => setFiltersOpen(v => !v)}
      >
        <span className="text-sm font-semibold text-slate-800">Filtres & tri</span>
        {filtersOpen ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {filtersOpen && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200"
            >
              <option value="">Tous</option>
              <option value="image">Images</option>
              <option value="video">Vidéos</option>
              <option value="audio">Audios</option>
              <option value="document">Documents</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Actif</label>
            <select
              value={isActive}
              onChange={(e) => setIsActive(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200"
            >
              <option value="">Tous</option>
              <option value="1">Actif</option>
              <option value="0">Inactif</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Vedette</label>
            <select
              value={isFeatured}
              onChange={(e) => setIsFeatured(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200"
            >
              <option value="">Tous</option>
              <option value="1">Oui</option>
              <option value="0">Non</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Tri</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200"
            >
              <option value="sort_order">Ordre</option>
              <option value="name">Nom</option>
              <option value="created_at">Création</option>
              <option value="size">Taille</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Direction</label>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-slate-200"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>

          <div className="md:col-span-5 flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <IconBtn title="Vue grille" onClick={() => setViewMode("grid")} variant={viewMode === "grid" ? "blue" : "amber"}>
                <FiGrid />
              </IconBtn>
              <IconBtn title="Vue liste" onClick={() => setViewMode("list")} variant={viewMode === "list" ? "blue" : "amber"}>
                <FiList />
              </IconBtn>
            </div>
            <div className="flex items-center gap-2">
              <IconBtn title="Réinitialiser filtres" onClick={() => { setType(""); setIsActive(""); setIsFeatured(""); setSortBy("sort_order"); setSortDir("asc"); }} >
                <FiRotateCw />
                <span className="hidden sm:inline text-[12px] font-semibold">Réinitialiser</span>
              </IconBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const Card = (m) => {
    const isImg = (m.mime_type || "").startsWith("image/");
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
        <div
          className={`relative group rounded-xl overflow-hidden bg-slate-100 border mb-3 ${isImg ? "cursor-zoom-in" : "cursor-default"}`}
          onClick={() => isImg && openLightbox(m)}
          title={isImg ? "Agrandir" : m.mime_type}
        >
          <img src={m.thumbnail_url || m.url} alt={m.alt_text?.fr || m.alt_text?.[0] || m.name} className="w-full h-44 object-cover" />
          {m.is_featured && (
            <Badge className="absolute top-2 left-2 bg-amber-50 border-amber-200 text-amber-700">
              <FiStar className="mr-1" /> Vedette
            </Badge>
          )}
          {!m.is_active && !inTrash && (
            <Badge className="absolute top-2 right-2 bg-slate-100 border-slate-300 text-slate-700">Inactif</Badge>
          )}
          {inTrash && (
            <Badge className="absolute top-2 right-2 bg-rose-50 border-rose-200 text-rose-700">Supprimé</Badge>
          )}
        </div>

        <div className="flex-1 min-h-0">
          <div className="font-semibold text-slate-800 truncate" title={m.name}>{m.name || "(sans nom)"}</div>
          <div className="text-xs text-slate-500 mt-1">
            {m.mime_type} • {fmtBytes(m.size)}
            {m.dimensions?.width && m.dimensions?.height ? ` • ${m.dimensions.width}×${m.dimensions.height}` : ""}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge className="bg-slate-50 border-slate-200 text-slate-700">#{m.id}</Badge>
            <Badge className="bg-slate-50 border-slate-200 text-slate-700">ordre {m.sort_order ?? 0}</Badge>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {!inTrash ? (
            <>
              <IconBtn title="Modifier" onClick={() => openEdit(m)}>
                <FiEdit3 />
              </IconBtn>
              <IconBtn title={m.is_active ? "Désactiver" : "Activer"} onClick={() => toggleActive(m)}>
                {m.is_active ? <FiToggleRight /> : <FiToggleLeft />}
              </IconBtn>
              <IconBtn title={m.is_featured ? "Retirer vedette" : "Mettre vedette"} onClick={() => toggleFeatured(m)} variant="amber">
                <FiStar />
              </IconBtn>
              <IconBtn title="Supprimer" onClick={() => onDelete(m)} variant="red">
                <FiTrash2 />
              </IconBtn>
            </>
          ) : (
            <>
              <IconBtn title="Restaurer" onClick={() => onRestore(m)}>
                <FiRotateCw />
              </IconBtn>
              <div className="col-span-3">
                <IconBtn title="Supprimer définitivement" onClick={() => onForceDelete(m)} variant="red">
                  <FiTrash2 />
                  <span className="hidden sm:inline text-[12px] font-semibold">Supprimer définitivement</span>
                </IconBtn>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const Row = (m) => {
    const isImg = (m.mime_type || "").startsWith("image/");
    return (
      <div className="grid grid-cols-[80px_1fr_auto] gap-3 items-center rounded-2xl border border-slate-200 bg-white p-3">
        <div className="h-16 w-full rounded-xl overflow-hidden bg-slate-100 border cursor-pointer" title="Agrandir" onClick={() => isImg && openLightbox(m)}>
          <img src={m.thumbnail_url || m.url} alt={m.alt_text?.fr || m.alt_text?.[0] || m.name} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{m.name || "(sans nom)"}</div>
          <div className="text-xs text-slate-500">
            #{m.id} • {m.mime_type} • {fmtBytes(m.size)}
            {m.dimensions?.width && m.dimensions?.height ? ` • ${m.dimensions.width}×${m.dimensions.height}` : ""}
            {m.is_featured ? " • ⭐ Vedette" : ""}
            {!m.is_active && !inTrash ? " • (Inactif)" : ""}
            {inTrash ? " • (Supprimé)" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!inTrash ? (
            <>
              <IconBtn title="Modifier" onClick={() => openEdit(m)}><FiEdit3 /></IconBtn>
              <IconBtn title={m.is_active ? "Désactiver" : "Activer"} onClick={() => toggleActive(m)}>{m.is_active ? <FiToggleRight /> : <FiToggleLeft />}</IconBtn>
              <IconBtn title={m.is_featured ? "Retirer vedette" : "Mettre vedette"} onClick={() => toggleFeatured(m)} variant="amber"><FiStar /></IconBtn>
              <IconBtn title="Supprimer" onClick={() => onDelete(m)} variant="red"><FiTrash2 /></IconBtn>
            </>
          ) : (
            <>
              <IconBtn title="Restaurer" onClick={() => onRestore(m)}><FiRotateCw /></IconBtn>
              <IconBtn title="Supprimer définitivement" onClick={() => onForceDelete(m)} variant="red"><FiTrash2 /></IconBtn>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {header}
      {Filters}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {new Array(6).fill(0).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 animate-pulse">
              <div className="h-40 bg-slate-100 rounded-xl" />
              <div className="h-3 bg-slate-100 rounded mt-4 w-2/3" />
              <div className="h-3 bg-slate-100 rounded mt-2 w-1/2" />
            </div>
          ))}
        </div>
      ) : err ? (
        <div className="mt-6 rounded-2xl border-2 border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm flex items-center gap-2">
          <FiAlertTriangle className="w-4 h-4" />
          {err}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-white px-4 py-6 text-center text-slate-600">
          {inTrash ? "Aucun média dans la corbeille." : "Aucun média pour cet article."}
          {!inTrash && (
            <div className="mt-3">
              <IconBtn title="Ajouter un média" onClick={() => setUploadOpen(true)}>
                <FiUpload />
                <span className="hidden sm:inline text-[12px] font-semibold">Ajouter un média</span>
              </IconBtn>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((m) => <Card key={m.id} {...m} />)}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((m) => <Row key={m.id} {...m} />)}
        </div>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={onUploaded} articleId={articleId} />
      <EditModal open={editOpen} media={current} onClose={() => setEditOpen(false)} onSaved={onSaved} />
      <Lightbox open={lightboxOpen} src={lightboxSrc} alt={lightboxAlt} onClose={() => setLightboxOpen(false)} />
      <ConfirmDialog 
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
      <Toast open={toast.open} kind={toast.kind} msg={toast.msg} />
    </div>
  );
};

export default ArticleMediaManager;

/* =========================================================
   Portal util
   ========================================================= */
const ModalPortal = ({ children }) => {
  const target = document.getElementById("modal-root") || document.body;
  return createPortal(children, target);
};
