// src/pages/UserManagementDashboard/Components/Accueil/MiradiaSlideForm.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiSave,
  FiUpload,
  FiArrowLeft,
  FiLayers,
  FiHash,
  FiTag,
  FiCheckCircle,
  FiXCircle,
  FiAlignLeft,
  FiType,
  FiToggleLeft,
  FiMaximize2,
  FiX,
} from "react-icons/fi";
import { createPortal } from "react-dom";

import api from "../../../../../../services/api";
import RichTextEditor from "../../articles/RichTextEditor";

/* Palette inspirée du logo MIRADIA */
const LOGO_COLOR_PRESETS = [
  { label: "Bleu MIRADIA", value: "#11528f" },
  { label: "Bleu clair", value: "#00a0d6" },
  { label: "Vert Madagascar", value: "#31aa52" },
  { label: "Jaune soleil", value: "#f5b700" },
  { label: "Bleu climat", value: "#0b3a63" },
];

/* Portal utilitaire pour plein écran */
const Portal = ({ children, id = "miradia-editor-modal-root" }) => {
  const elRef = useRef(null);
  if (!elRef.current && typeof document !== "undefined") {
    const el = document.createElement("div");
    el.setAttribute("id", id);
    el.style.zIndex = "2147483647";
    elRef.current = el;
  }
  useEffect(() => {
    const node = elRef.current;
    if (!node) return;
    document.body.appendChild(node);
    return () => {
      try {
        document.body.removeChild(node);
      } catch {}
    };
  }, []);
  return elRef.current ? createPortal(children, elRef.current) : null;
};

const inputBase = [
  "w-full",
  "px-4 py-2.5",
  "rounded-2xl",
  "border-2 border-slate-200/60",
  "bg-gradient-to-br from-white to-slate-50/30",
  "shadow-sm",
  "backdrop-blur-sm",
  "placeholder:text-slate-400",
  "focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500",
  "hover:border-slate-300",
  "transition-all duration-200",
].join(" ");

const card = [
  "rounded-3xl",
  "bg-white/90",
  "backdrop-blur-xl",
  "border border-slate-200/60",
  "shadow-lg shadow-slate-200/50",
  "hover:shadow-xl hover:shadow-slate-300/50",
  "transition-all duration-300",
].join(" ");

const sectionTitle =
  "text-sm font-bold text-slate-800 mb-1.5 block tracking-tight";
const hint = "text-xs text-slate-500 mt-1 flex items-center gap-1";

const FieldError = ({ name, errors }) => {
  const arr = Array.isArray(errors?.[name]) ? errors[name] : [];
  if (!arr.length) return null;
  return (
    <>
      {arr.map((m, i) => (
        <p key={`${name}-${i}`} className="text-xs text-red-600 mt-1">
          {m}
        </p>
      ))}
    </>
  );
};

// Helper pour enlever le HTML et analyser la longueur de la description
const stripHtml = (html) =>
  typeof html === "string" ? html.replace(/<[^>]+>/g, "").trim() : "";

const MiradiaSlideForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [model, setModel] = useState({
    id: null,
    title: "",
    description: "",
    stat_label: "",
    tag: "",
    icon: "",
    color: "#11528f", // ✅ Bleu MIRADIA par défaut
    position: 1,
    is_active: true,
    image_path: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const lastImageUrlRef = useRef("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, msg: "" });
  const toastTimerRef = useRef(null);

  // Plein écran éditeur description
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

  useEffect(() => {
    if (isEditorModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isEditorModalOpen]);

  // Preview image locale
  useEffect(() => {
    if (imageFile) {
      if (lastImageUrlRef.current) {
        URL.revokeObjectURL(lastImageUrlRef.current);
      }
      const url = URL.createObjectURL(imageFile);
      lastImageUrlRef.current = url;
      setImagePreview(url);
    } else {
      if (lastImageUrlRef.current) {
        URL.revokeObjectURL(lastImageUrlRef.current);
        lastImageUrlRef.current = "";
      }
      setImagePreview("");
    }

    return () => {
      if (lastImageUrlRef.current) {
        URL.revokeObjectURL(lastImageUrlRef.current);
        lastImageUrlRef.current = "";
      }
    };
  }, [imageFile]);

  // Chargement slide si édition
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await api.get(`/miradia-slides/${encodeURIComponent(id)}`);
        const data = res?.data || {};
        setModel({
          id: data.id ?? null,
          title: data.title ?? "",
          description: data.description ?? "",
          stat_label: data.stat_label ?? "",
          tag: data.tag ?? "",
          icon: data.icon ?? "",
          color: data.color || "#11528f", // fallback logo
          position: data.position ?? 1,
          is_active: data.is_active ?? true,
          image_path: data.image_path ?? "",
        });
      } catch (e) {
        console.error(
          "Erreur chargement slide:",
          e?.response?.data || e?.message
        );
        setToast({
          open: true,
          msg: "Impossible de charger cette slide (API GET /miradia-slides/:id).",
        });
      }
    })();
  }, [id, isEdit, navigate]);

  // Progress bar soumission
  useEffect(() => {
    let timer = null;
    if (isSubmitting) {
      setProgress(10);
      timer = setInterval(() => {
        setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) * 0.08) : 90));
      }, 250);
    } else {
      if (timer) clearInterval(timer);
      setProgress(100);
      setTimeout(() => setProgress(0), 400);
    }
    return () => timer && clearInterval(timer);
  }, [isSubmitting]);

  // Toast succès
  const showSuccess = (msg) => {
    setToast({ open: true, msg });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToast({ open: false, msg: "" }),
      2500
    );
  };
  useEffect(
    () => () => toastTimerRef.current && clearTimeout(toastTimerRef.current),
    []
  );

  const onChange = (k, v) => setModel((prev) => ({ ...prev, [k]: v }));

  // Submit
  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setIsSubmitting(true);
    setErrors({});
    try {
      const fd = new FormData();
      fd.append("title", model.title || "");
      fd.append("description", model.description || "");
      fd.append("stat_label", model.stat_label || "");
      fd.append("tag", model.tag || "");
      fd.append("icon", model.icon || "");
      fd.append("color", model.color || "#11528f");
      fd.append("position", Number(model.position || 1));
      fd.append("is_active", model.is_active ? "1" : "0");

      if (imageFile instanceof File) {
        fd.append("image", imageFile, imageFile.name);
      }

      let res;
      if (isEdit && model.id) {
        // update via PATCH (method override)
        res = await api.post(
          `/miradia-slides/${model.id}?_method=PATCH`,
          fd,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      } else {
        // création
        res = await api.post("/miradia-slides", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      const data = res?.data || {};
      setModel((prev) => ({ ...prev, ...(data || {}) }));
      showSuccess(isEdit ? "Slide mise à jour ✅" : "Slide créée ✅");

      // Optionnel : reset après création
      if (!isEdit) {
        setModel({
          id: null,
          title: "",
          description: "",
          stat_label: "",
          tag: "",
          icon: "",
          color: "#11528f",
          position: 1,
          is_active: true,
          image_path: "",
        });
        setImageFile(null);
      }
    } catch (err) {
      console.error(
        "Erreur enregistrement slide:",
        err?.response?.data || err?.message
      );
      if (err?.response?.status === 422 && err?.response?.data?.errors) {
        setErrors(err.response.data.errors || {});
      } else {
        setToast({
          open: true,
          msg:
            err?.response?.data?.message ||
            err.message ||
            "Erreur lors de l’enregistrement",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = Boolean(String(model.title || "").trim());

  const fullscreenHeight =
    typeof window !== "undefined"
      ? Math.max(360, window.innerHeight - 160)
      : 520;

  // Infos de longueur de description (texte brut sans HTML)
  const descriptionPlain = stripHtml(model.description || "");
  const descriptionChars = descriptionPlain.length;
  const descriptionWords = descriptionPlain
    ? descriptionPlain.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 via-white to-sky-100 relative">
      {/* Progress */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1.5 bg-slate-200/60">
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg,#11528f,#00a0d6,#31aa52)",
          }}
        />
      </div>

      {/* Toast */}
      <div
        className={`fixed right-4 top-24 z-[10000] transition-all duration-300 ${
          toast.open
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-lg">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            ✓
          </span>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-slate-200/70 shadow-sm z-[100]">
        <div className="w-full px-4 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            >
              <FiArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1
                className="text-xl md:text-2xl font-bold tracking-tight"
                style={{ color: "#11528f" }}
              >
                {isEdit ? "Modifier une slide MIRADIA" : "Nouvelle slide MIRADIA"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure les textes, la couleur et l’image pour le slider de la
                page d’accueil.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow
              ${
                !isValid || isSubmitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : ""
              }`}
            style={
              !isValid || isSubmitting
                ? {}
                : { background: "linear-gradient(90deg,#11528f,#00a0d6)" }
            }
          >
            <FiSave className="w-4 h-4" />
            {isSubmitting
              ? "Enregistrement…"
              : isEdit
              ? "Mettre à jour"
              : "Enregistrer"}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="w-full px-4 lg:px-8 py-8 space-y-6 h-screen overflow-y-auto pb-64">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr] gap-6"
        >
          {/* Colonne gauche : textes / infos */}
          <section className={`${card} p-6 space-y-6`}>
            <div className="space-y-2">
              <label className={sectionTitle}>
                <span className="flex items-center gap-2">
                  <FiType className="w-4 h-4 text-sky-600" />
                  Titre du slide <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                className={inputBase}
                value={model.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder='Ex. : "MIRA : Égalité et équité"'
                required
              />
              <FieldError name="title" errors={errors} />
            </div>

            {/* Description + plein écran */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiAlignLeft className="w-4 h-4 text-slate-600" />
                    Description (rich texte)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditorModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50 flex items-center gap-1"
                  title="Éditer en plein écran"
                >
                  <FiMaximize2 className="w-4 h-4" />
                  Plein écran
                </button>
              </div>

              <div className="w-full">
                <RichTextEditor
                  value={model.description || ""}
                  onChange={(html) => onChange("description", html)}
                  height={360}
                />
              </div>

              <p className={hint}>
                <FiAlignLeft className="w-3.5 h-3.5" />
                Tu peux écrire en FR + Malagasy, coller depuis Word, mettre du
                gras, listes, etc.
              </p>

              {/* Infos longueur description (texte brut) */}
              <p className="text-[11px] text-slate-400 mt-0.5">
                {descriptionChars === 0 ? (
                  <span>Aucune description saisie pour l’instant.</span>
                ) : (
                  <>
                    {descriptionChars} caractère
                    {descriptionChars > 1 && "s"} • environ {descriptionWords} mot
                    {descriptionWords > 1 && "s"} (texte brut, sans mise en forme)
                  </>
                )}
              </p>

              <FieldError name="description" errors={errors} />
            </div>

            {/* Actif / inactif */}
            <div className="space-y-2">
              <label className={sectionTitle}>Activer cette slide</label>
              <button
                type="button"
                onClick={() => onChange("is_active", !model.is_active)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-semibold
                  ${
                    model.is_active
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
              >
                <span
                  className={`relative inline-flex h-5 w-9 items-center rounded-full ${
                    model.is_active ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      model.is_active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
                <span className="flex items-center gap-1">
                  {model.is_active ? (
                    <>
                      <FiCheckCircle className="w-3.5 h-3.5" /> Active
                    </>
                  ) : (
                    <>
                      <FiToggleLeft className="w-3.5 h-3.5" /> Désactivée
                    </>
                  )}
                </span>
              </button>
              <FieldError name="is_active" errors={errors} />
            </div>
          </section>

          {/* Colonne droite : image + autres champs */}
          <section className={`${card} p-6 space-y-6`}>
            {/* Image */}
            <div className="space-y-3">
              <label className={`${sectionTitle} flex items-center gap-2`}>
                <span className="p-1.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white">
                  <FiUpload className="w-4 h-4" />
                </span>
                Image d’illustration
              </label>

              <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden min-h-[260px] flex flex-col items-center justify-center text-slate-500">
                {imagePreview || model.image_path ? (
                  <img
                    src={
                      imagePreview ||
                      (model.image_path?.startsWith("http")
                        ? model.image_path
                        : model.image_path
                        ? `/storage/${String(model.image_path).replace(
                            /^storage\//,
                            ""
                          )}`
                        : "")
                    }
                    alt={model.title || "Image slide"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <FiUpload className="w-10 h-10 text-slate-400" />
                    <p className="text-sm font-medium">
                      Dépose une image ou clique pour sélectionner
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Exemple : personnes marchant ensemble, balance, groupe de
                      travail…
                    </p>
                  </div>
                )}

                <label className="absolute inset-x-4 bottom-4 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-900/80 text-white text-xs font-semibold cursor-pointer">
                  <FiUpload className="w-4 h-4" />
                  Choisir une image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setImageFile(f);
                    }}
                  />
                </label>
              </div>

              <p className={hint}>
                <FiXCircle className="w-3.5 h-3.5 text-slate-400" />
                Formats recommandés : 1600×900 ou 1920×1080, JPG/PNG/WebP.
              </p>
              <FieldError name="image" errors={errors} />
            </div>

            {/* Tag / Stat / Icône / Couleur / Position */}
            <div className="border-t border-slate-200 pt-4 space-y-4">
              {/* Tag + Stat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={sectionTitle}>
                    <span className="flex items-center gap-2">
                      <FiTag className="w-4 h-4 text-emerald-500" />
                      Tag / mot-clé
                    </span>
                  </label>

                  <input
                    className={inputBase}
                    list="miradia-tag-options"
                    value={model.tag}
                    onChange={(e) => onChange("tag", e.target.value)}
                    placeholder='Ex. : "MIRA", "DIA", "MIRADIA" ou autre mot-clé'
                  />

                  <datalist id="miradia-tag-options">
                    <option value="MIRA" />
                    <option value="DIA" />
                    <option value="MIRADIA" />
                  </datalist>

                  <p className={hint}>
                    Tu peux choisir un tag proposé ou écrire le tien.
                  </p>

                  <FieldError name="tag" errors={errors} />
                </div>

                <div className="space-y-2">
                  <label className={sectionTitle}>
                    <span className="flex items-center gap-2">
                      <FiHash className="w-4 h-4 text-indigo-500" />
                      Stat / label
                    </span>
                  </label>
                  <input
                    className={inputBase}
                    value={model.stat_label}
                    onChange={(e) => onChange("stat_label", e.target.value)}
                    placeholder='Ex. : "Justice & équité", "Marche ensemble"…'
                  />
                  <FieldError name="stat_label" errors={errors} />
                </div>
              </div>

              {/* Icône + Couleur + Position */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Icône */}
                <div className="space-y-2">
                  <label className={sectionTitle}>
                    <span className="flex items-center gap-2">
                      <FiLayers className="w-4 h-4 text-slate-600" />
                      Icône
                    </span>
                  </label>

                  <input
                    className={inputBase}
                    list="miradia-icon-options"
                    value={model.icon}
                    onChange={(e) => onChange("icon", e.target.value)}
                    placeholder='Ex. : "scales", "walk", "group"…'
                  />

                  <datalist id="miradia-icon-options">
                    <option value="scales" />
                    <option value="walk" />
                    <option value="group" />
                    <option value="file" />
                    <option value="book" />
                    <option value="image" />
                  </datalist>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { value: "scales", label: "Balance (MIRA)" },
                      { value: "walk", label: "Marche (DIA)" },
                      { value: "group", label: "Groupe (MIRADIA)" },
                      { value: "file", label: "Document" },
                      { value: "book", label: "Livre" },
                      { value: "image", label: "Image" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange("icon", opt.value)}
                        className={`px-2.5 py-1 rounded-full border text-[11px] ${
                          model.icon === opt.value
                            ? "bg-sky-600 text-white border-sky-600"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <FieldError name="icon" errors={errors} />
                </div>

                {/* Couleur */}
                <div className="space-y-2">
                  <label className={sectionTitle}>Couleur du badge</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-10 w-16 rounded-xl border border-slate-200 bg-white cursor-pointer"
                      value={model.color}
                      onChange={(e) => onChange("color", e.target.value)}
                    />
                    <input
                      className={inputBase}
                      value={model.color}
                      onChange={(e) => onChange("color", e.target.value)}
                      placeholder="#11528f"
                    />
                  </div>

                  {/* Presets de couleur MIRADIA */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {LOGO_COLOR_PRESETS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => onChange("color", c.value)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${
                          model.color === c.value
                            ? "border-sky-600 bg-sky-50 text-sky-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: c.value }}
                        />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>

                  <FieldError name="color" errors={errors} />
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <label className={sectionTitle}>Position</label>
                  <input
                    type="number"
                    min={1}
                    className={inputBase}
                    value={model.position}
                    onChange={(e) =>
                      onChange("position", parseInt(e.target.value, 10) || 1)
                    }
                  />
                  <FieldError name="position" errors={errors} />
                </div>
              </div>
            </div>
          </section>
        </form>
      </main>

      {/* MODAL plein écran pour l’éditeur de description */}
      {isEditorModalOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-[2147483647] bg-slate-900/70 backdrop-blur-sm"
            aria-modal="true"
            role="dialog"
          >
            <div className="absolute inset-0 p-4 md:p-6 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/90 border border-slate-200 shadow">
                <div className="text-sm font-semibold text-slate-800">
                  Édition du texte du slide (plein écran)
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditorModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50 flex items-center gap-1"
                  title="Fermer"
                >
                  <FiX className="w-4 h-4" />
                  Fermer
                </button>
              </div>
              <div className="flex-1 min-h-0 mt-3 rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <RichTextEditor
                  value={model.description || ""}
                  onChange={(html) => onChange("description", html)}
                  height={fullscreenHeight}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default MiradiaSlideForm;
