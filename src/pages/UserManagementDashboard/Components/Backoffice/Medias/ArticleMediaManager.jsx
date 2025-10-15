// src/pages/articles/ArticleMediaManager.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
// AJOUTE CETTE IMPORT EN HAUT
import { createPortal } from "react-dom";
import {
  FiUpload, FiEdit3, FiTrash2, FiImage, FiRefreshCw, FiStar,
  FiToggleLeft, FiToggleRight, FiAlertTriangle, FiX,
} from "react-icons/fi";
import api from "../../../../../services/api";

/** ========= ROUTES SELON TON CONTROLLER =========
 * Adapte si tes chemins diffèrent. Ceux-ci collent au contrôleur que tu as posté.
 */
const ROUTES = {
  byArticle: (articleId) => `/article-media/by-article/${articleId}`, // ← correspond à byArticle($articleId)
  upload: `/article-media/upload`,
  update: (id) => `/article-media/${id}`,
  destroy: (id) => `/article-media/${id}`,
  toggleActive: (id) => `/article-media/${id}/toggle-active`,
  toggleFeatured: (id) => `/article-media/${id}/toggle-featured`,
};

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
        {kind === "error" ? (
          <FiX className="w-5 h-5" />
        ) : (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span>
        )}
        <span className="text-sm font-semibold">{msg}</span>
      </div>
    </div>
  );
};

/* ---------- Lightbox ultra simple ---------- */
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
        <button
          onClick={onClose}
          className="absolute -top-4 right-0 translate-y-[-100%] px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 text-slate-900 font-semibold shadow"
        >
          Fermer
        </button>
        {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
        <img src={src} alt={alt || "Image"} className="w-full h-auto rounded-2xl shadow-2xl" />
      </div>
    </div>
  );
};

/* ---------- Modal Upload ---------- */
const UploadModal = ({ open, onClose, onUploaded, articleId }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const dropRef = useRef(null);

  // 🔒 bloque le scroll quand la modale est ouverte
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
      setIsFeatured(false); setSubmitting(false); setErr("");
    }
  }, [open]);

  const onPick = (f) => {
    setFile(f);
    try { setName((v) => v || f.name.replace(/\.[^.]+$/, "")); } catch {}
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    setErr("");
    if (!file) { setErr("Choisissez un fichier."); return; }
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("article_id", String(articleId));
      fd.append("name", name || file.name);
      if (alt) fd.append("alt_text[fr]", alt);
      if (caption) fd.append("caption[fr]", caption);
      fd.append("is_featured", isFeatured ? "1" : "0");

      const res = await api.post("/article-media/upload", fd, {
        headers: { Accept: "application/json" },
      });
      onUploaded?.(res?.data?.data || res?.data);
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur lors du téléchargement";
      setErr(msg);
    } finally { setSubmitting(false); }
  };

  if (!open) return null;

  // ⬇⬇⬇ rendu via portal + z-index TRÈS haut
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
      >
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100000]"
          onClick={onClose}
        />
        <div className="relative z-[100001] w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Ajouter un média</h3>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Fermer
            </button>
          </div>

          <div ref={dropRef} className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-slate-50/60 text-center">
            {preview ? (
              <img src={preview} alt="Preview" className="mx-auto max-h-64 rounded-xl" />
            ) : (
              <div className="text-slate-600">
                <FiUpload className="w-8 h-8 mx-auto mb-3" />
                <div className="font-semibold">Déposez un fichier ici</div>
                <div className="text-xs">ou</div>
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
                  onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                placeholder="Nom interne"
              />
              <label className="text-sm font-semibold text-slate-700">Texte alternatif (FR)</label>
              <input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              />
              <label className="text-sm font-semibold text-slate-700">Légende (FR)</label>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Options</label>
              <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white cursor-pointer text-sm">
                <span className="flex items-center gap-2">
                  <FiStar className="text-amber-500" />
                  Définir comme vedette
                </span>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="sr-only"
                />
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${isFeatured ? "bg-blue-600" : "bg-slate-300"}`}>
                  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isFeatured ? "translate-x-4" : "translate-x-0"}`} />
                </span>
              </label>
            </div>
          </div>

          {err && <p className="text-sm text-rose-600">{err}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={submitting || !file}
              className={`px-4 py-2 rounded-xl text-white font-semibold shadow ${
                submitting || !file ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {submitting ? "Envoi…" : "Téléverser"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};


/* ---------- Modal Édition ---------- */
const EditModal = ({ open, media, onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // 🔒 bloque le scroll quand la modale est ouverte
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
      const res = await api.put(`/article-media/${media.id}`, body, {
        headers: { Accept: "application/json" },
      });
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100000]" onClick={onClose} />
        <div className="relative z-[100001] w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Modifier le média</h3>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <img
                src={media.thumbnail_url || media.url}
                alt={media.alt_text?.fr || media.alt_text?.[0] || media.name}
                className="w-full h-auto rounded-xl border"
              />
              <div className="text-xs text-slate-500 mt-2">
                {media.mime_type} • {fmtBytes(media.size)}
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Texte alternatif (FR)</label>
                  <input
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Légende (FR)</label>
                  <input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Ordre</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                  />
                </div>
                <label className="flex items-center justify-between gap-2 mt-6 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white cursor-pointer text-sm">
                  <span className="flex items-center gap-2">
                    {isActive ? <FiToggleRight /> : <FiToggleLeft />} Actif
                  </span>
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only" />
                  <span className={`relative inline-flex h-5 w-9 items-center rounded-full ${isActive ? "bg-blue-600" : "bg-slate-300"}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </label>
                <label className="flex items-center justify-between gap-2 mt-6 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white cursor-pointer text-sm">
                  <span className="flex items-center gap-2">
                    <FiStar className="text-amber-500" /> Vedette
                  </span>
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
            <button onClick={onClose} className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold">
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-white font-semibold shadow ${
                saving ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};


/* ---------- Composant principal ---------- */
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

  const [toast, setToast] = useState({ open: false, kind: "success", msg: "" });
  const toastTimer = useRef(null);
  const showToast = (msg, kind = "success") => {
    setToast({ open: true, kind, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ open: false, kind, msg: "" }), 2600);
  };
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const load = async () => {
    if (!articleId) return;
    try {
      setLoading(true);
      setErr("");
      const res = await api.get(ROUTES.byArticle(articleId), { headers: { Accept: "application/json" } });
      const data = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
      setItems(data);
    } catch (e) {
      const msg = e?.response?.status === 403
        ? "Non autorisé (403). Vérifie l’authentification/Policy."
        : (e?.response?.data?.message || e?.message || "Erreur de chargement");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [articleId, refreshKey]);

  const onUploaded = () => { showToast("Média téléversé ✅"); setRefreshKey((k) => k + 1); };

  const openEdit = (m) => { setCurrent(m); setEditOpen(true); };
  const onSaved = () => { showToast("Média mis à jour ✅"); setRefreshKey((k) => k + 1); };

  const onDelete = async (m) => {
    if (!window.confirm("Supprimer ce média ?")) return;
    try {
      await api.delete(ROUTES.destroy(m.id), { headers: { Accept: "application/json" } });
      showToast("Média supprimé ✅");
      setItems((arr) => arr.filter((x) => x.id !== m.id));
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Suppression impossible";
      showToast(msg, "error");
    }
  };

  const toggleActive = async (m) => {
    try {
      const res = await api.post(ROUTES.toggleActive(m.id), null, { headers: { Accept: "application/json" } });
      const upd = res?.data?.data || res?.data;
      setItems((arr) => arr.map((it) => (it.id === m.id ? { ...it, ...upd } : it)));
    } catch {
      showToast("Erreur statut actif", "error");
    }
  };

  const toggleFeatured = async (m) => {
    try {
      const res = await api.post(ROUTES.toggleFeatured(m.id), null, { headers: { Accept: "application/json" } });
      const upd = res?.data?.data || res?.data;
      setItems((arr) => arr.map((it) => (it.id === m.id ? { ...it, ...upd } : it)));
    } catch {
      showToast("Erreur statut vedette", "error");
    }
  };

  const openLightbox = (m) => {
    setLightboxSrc(m.url || m.thumbnail_url);
    setLightboxAlt(m.alt_text?.fr || m.alt_text?.[0] || m.name || "");
    setLightboxOpen(true);
  };

  const header = useMemo(
    () => (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur opacity-40" />
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
              <FiImage className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Médias de l’article</h2>
            <div className="text-xs text-slate-500">Gestion des fichiers liés à l’article #{articleId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
            title="Rafraîchir"
          >
            <FiRefreshCw />
            Rafraîchir
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow"
          >
            <FiUpload />
            Ajouter un média
          </button>
        </div>
      </div>
    ),
    [articleId]
  );

  return (
    <div className="w-full">
      {header}

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
          Aucun média pour cet article.
          <div className="mt-3">
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow"
            >
              <FiUpload />
              Ajouter un média
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((m) => {
            const isImg = (m.mime_type || "").startsWith("image/");
            return (
              <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col">
                <div
                  className={`relative group rounded-xl overflow-hidden bg-slate-100 border mb-3 ${
                    isImg ? "cursor-zoom-in" : "cursor-default"
                  }`}
                  onClick={() => isImg && openLightbox(m)}
                  title={isImg ? "Agrandir" : m.mime_type}
                >
                  <img
                    src={m.thumbnail_url || m.url}
                    alt={m.alt_text?.fr || m.alt_text?.[0] || m.name}
                    className="w-full h-44 object-cover"
                  />
                  {m.is_featured && (
                    <Badge className="absolute top-2 left-2 bg-amber-50 border-amber-200 text-amber-700">
                      <FiStar className="mr-1" /> Vedette
                    </Badge>
                  )}
                  {!m.is_active && (
                    <Badge className="absolute top-2 right-2 bg-slate-100 border-slate-300 text-slate-700">
                      Inactif
                    </Badge>
                  )}
                </div>

                <div className="flex-1 min-h-0">
                  <div className="font-semibold text-slate-800 truncate" title={m.name}>
                    {m.name || "(sans nom)"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {m.mime_type} • {fmtBytes(m.size)}
                    {m.dimensions?.width && m.dimensions?.height ? ` • ${m.dimensions.width}×${m.dimensions.height}` : ""}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge className="bg-slate-50 border-slate-200 text-slate-700">#{m.id}</Badge>
                    <Badge className="bg-slate-50 border-slate-200 text-slate-700">ordre {m.sort_order ?? 0}</Badge>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEdit(m)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
                  >
                    <FiEdit3 /> Modifier
                  </button>
                  <button
                    onClick={() => onDelete(m)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold"
                  >
                    <FiTrash2 /> Supprimer
                  </button>
                  <button
                    onClick={() => toggleActive(m)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
                  >
                    {m.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                    {m.is_active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    onClick={() => toggleFeatured(m)}
                    className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold ${
                      m.is_featured
                        ? "border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <FiStar /> {m.is_featured ? "Retirer vedette" : "Mettre vedette"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={onUploaded} articleId={articleId} />
      <EditModal open={editOpen} media={current} onClose={() => setEditOpen(false)} onSaved={onSaved} />

      <Lightbox open={lightboxOpen} src={lightboxSrc} alt={lightboxAlt} onClose={() => setLightboxOpen(false)} />
      <Toast open={toast.open} kind={toast.kind} msg={toast.msg} />
    </div>
  );
};

export default ArticleMediaManager;
// AJOUTE CE PETIT COMPOSANT UTILITAIRE (au dessus ou sous tes composants)
const ModalPortal = ({ children }) => {
  const target =
    document.getElementById("modal-root") || document.body; // fallback body
  return createPortal(children, target);
};
