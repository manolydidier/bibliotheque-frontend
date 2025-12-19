// src/pages/UserManagementDashboard/Components/Backoffice/Miradia/cms/CmsSectionForm.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiSave,
  FiArrowLeft,
  FiInfo,
  FiAlertTriangle,
  FiCheckCircle,
  FiMaximize2,
  FiX,
  FiTag,
  FiHash,
  FiGrid,
  FiGlobe,
  FiClock,
  FiCode,
  FiShield,
  FiEye,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import api from "../../../../../../services/api";
import GrapesEditorModal from "./GrapesEditorModal";

/* ===================== Portal ===================== */
const Portal = ({ children, id = "cms-editor-modal-root" }) => {
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

/* ===================== UI tokens ===================== */
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
const inputError = "border-red-400 focus:border-red-500 focus:ring-red-500/30";

const card = [
  "rounded-3xl",
  "bg-white/90",
  "backdrop-blur-xl",
  "border border-slate-200/60",
  "shadow-lg shadow-slate-200/50",
  "hover:shadow-xl hover:shadow-slate-300/50",
  "transition-all duration-300",
].join(" ");

const sectionTitle = "text-sm font-bold text-slate-800 mb-1.5 block tracking-tight";
const hint = "text-xs text-slate-500 mt-1 flex items-start gap-2 leading-snug";
const pill = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border";
const divider = "h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent";

/* ===================== Helpers ===================== */
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

const extractItem = (payload) => {
  if (!payload) return null;
  if (payload?.data && payload.data?.id != null) return payload.data;
  if (payload?.id != null) return payload;
  return null;
};

const stableStr = (v) => {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
};

// Normalise erreurs Laravel (parfois string, parfois array, parfois nested)
const normalizeErrors = (raw) => {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  Object.entries(raw).forEach(([k, v]) => {
    if (Array.isArray(v)) out[k] = v.map((x) => String(x));
    else if (typeof v === "string") out[k] = [v];
    else out[k] = [stableStr(v)];
  });
  return out;
};

export default function CmsSectionForm() {
  const { id } = useParams(); // /cms-sections/:id/edit
  const idOrSlug = String(id || "").trim();
  const isEdit = Boolean(idOrSlug);
  const navigate = useNavigate();

  const [model, setModel] = useState(() => ({
    id: null,
    category: "",
    title: "",
    template: "",
    section: "",
    locale: "fr",
    status: "draft",
    published_at: "",
    scheduled_at: "",
    sort_order: 0,
    version: 1,
    meta: {},
    gjs_project: "",
    html: "",
    css: "",
    js: "",
  }));
  const [baseline, setBaseline] = useState(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
  const toastTimerRef = useRef(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ✅ glitch (flash court) sur erreurs backend
  const [glitchOn, setGlitchOn] = useState(false);
  const glitchTimerRef = useRef(null);

  const titleRef = useRef(null);
  const templateRef = useRef(null);
  const sectionRef = useRef(null);

  // Meta JSON (OPTIONNEL)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [metaDraft, setMetaDraft] = useState(() => JSON.stringify({}, null, 2));
  const [metaError, setMetaError] = useState("");

  const onChange = (k, v) => setModel((prev) => ({ ...prev, [k]: v }));

  const hasFieldError = useCallback((name) => {
    return Array.isArray(errors?.[name]) && errors[name].length > 0;
  }, [errors]);

  const triggerGlitch = useCallback(() => {
    try {
      setGlitchOn(false);
      if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);

      // double-tick pour rejouer même si déjà true
      requestAnimationFrame(() => {
        setGlitchOn(true);
        glitchTimerRef.current = setTimeout(() => setGlitchOn(false), 650);
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);
    };
  }, []);

  /* ============ Lock scroll when modal ============ */
  useEffect(() => {
    const anyModalOpen = isEditorOpen || isPreviewOpen;
    document.body.style.overflow = anyModalOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [isEditorOpen, isPreviewOpen]);

  /* ============ Progress bar ============ */
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
      const t = setTimeout(() => setProgress(0), 400);
      return () => clearTimeout(t);
    }
    return () => timer && clearInterval(timer);
  }, [isSubmitting]);

  const showToast = (msg, type = "success") => {
    setToast({ open: true, msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast({ open: false, msg: "", type: "success" });
    }, 2500);
  };
  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  /* ============ Validation minimale ============ */
  const isValid =
    Boolean(String(model.title || "").trim()) &&
    Boolean(String(model.template || "").trim()) &&
    Boolean(String(model.section || "").trim()) &&
    Boolean(String(model.locale || "").trim()) &&
    Boolean(String(model.category || "").trim());

  /* ============ Dirty check ============ */
  const fieldsForCompare = useMemo(
    () => [
      "category",
      "title",
      "template",
      "section",
      "locale",
      "status",
      "published_at",
      "scheduled_at",
      "sort_order",
      "meta",
      "gjs_project",
      "html",
      "css",
      "js",
    ],
    []
  );

  const isDirty = useMemo(() => {
    if (!isEdit) return true;
    if (!baseline) return false;
    for (const k of fieldsForCompare) {
      if (stableStr(model?.[k]) !== stableStr(baseline?.[k])) return true;
    }
    return false;
  }, [isEdit, baseline, model, fieldsForCompare]);

  /* ⚡️ Protection sortie onglet si modifications */
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  /* ============ Fetch one ============ */
  const fetchOne = useCallback(async () => {
    const res = await api.get(`/cms-sections/${encodeURIComponent(idOrSlug)}`, {
      headers: { "Cache-Control": "no-store" },
    });
    return extractItem(res?.data);
  }, [idOrSlug]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const item = await fetchOne();
        if (item?.id) {
          const hydrated = {
            ...model,
            ...item,
            locale: item.locale || "fr",
            status: item.status || "draft",
            meta: item.meta || {},
          };
          setModel(hydrated);
          setBaseline(hydrated);
          setMetaDraft(JSON.stringify(hydrated.meta || {}, null, 2));
          setMetaError("");
        }
      } catch (e) {
        showToast(e?.response?.data?.message || "Impossible de charger cette section.", "error");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [isEdit, fetchOne]);

  /* ============ Meta editor sync (JSON textarea) ============ */
  useEffect(() => {
    try {
      setMetaDraft(JSON.stringify(model.meta || {}, null, 2));
      setMetaError("");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.id]);

  const applyMetaDraft = () => {
    if (!String(metaDraft || "").trim()) {
      onChange("meta", {});
      setMetaError("");
      showToast("Meta vidé ✅", "success");
      return;
    }
    try {
      const parsed = JSON.parse(metaDraft);
      onChange("meta", parsed);
      setMetaError("");
      showToast("Meta JSON appliqué ✅", "success");
    } catch {
      setMetaError("JSON invalide : corrige la syntaxe (virgules, guillemets, accolades…).");
      showToast("Meta JSON invalide.", "error");
    }
  };

  /* ============ Payload & save ============ */
  const payloadForSave = () => ({
    category: model.category || "",
    title: model.title || "",
    template: model.template || "",
    section: model.section || "",
    locale: model.locale || "fr",
    status: model.status || "draft",
    published_at: model.published_at || null,
    scheduled_at: model.scheduled_at || null,
    sort_order: Number(model.sort_order ?? 0),
    meta: model.meta || {},
    gjs_project: model.gjs_project || null,
    html: model.html || null,
    css: model.css || null,
    js: model.js || null,
  });

  const formId = "cms-section-form";

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setIsSubmitting(true);
    setErrors({});
    try {
      const payload = payloadForSave();

      let res;
      if (isEdit && model.id) res = await api.put(`/cms-sections/${model.id}`, payload);
      else res = await api.post(`/cms-sections`, payload);

      const saved = extractItem(res?.data) || res?.data?.data || res?.data;

      setModel((prev) => ({ ...prev, ...saved }));
      setBaseline((prev) => ({ ...(prev || {}), ...payload, ...saved }));

      showToast(isEdit ? "Section mise à jour ✅" : "Section créée ✅", "success");
      setErrors({});

      if (!isEdit && saved?.id) {
        navigate(`/cms-sections/${saved.id}/edit`, { replace: true });
      }
    } catch (err) {
      if (err?.response?.status === 422 && err?.response?.data?.errors) {
        const es = normalizeErrors(err.response.data.errors || {});
        setErrors(es);
        showToast("Validation: corrige les champs en rouge.", "error");
        triggerGlitch();

        const first = Object.keys(es)[0];
        if (first === "title" && titleRef.current) titleRef.current.focus();
        if (first === "template" && templateRef.current) templateRef.current.focus();
        if (first === "section" && sectionRef.current) sectionRef.current.focus();
      } else {
        showToast(err?.response?.data?.message || err?.message || "Erreur lors de l’enregistrement", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============ Publish actions ============ */
  const publishNow = async () => {
    if (!model?.id) return;
    try {
      await api.post(`/cms-sections/${model.id}/publish`);
      showToast("Publié ✅", "success");
      const item = await fetchOne();
      if (item?.id) {
        setModel((p) => ({ ...p, ...item }));
        setBaseline((p) => ({ ...(p || {}), ...item }));
        setMetaDraft(JSON.stringify(item.meta || {}, null, 2));
      }
    } catch (e) {
      showToast(e?.response?.data?.message || "Erreur publish", "error");
    }
  };

  const unpublish = async () => {
    if (!model?.id) return;
    try {
      await api.post(`/cms-sections/${model.id}/unpublish`);
      showToast("Repassé en brouillon ✅", "success");
      const item = await fetchOne();
      if (item?.id) {
        setModel((p) => ({ ...p, ...item }));
        setBaseline((p) => ({ ...(p || {}), ...item }));
        setMetaDraft(JSON.stringify(item.meta || {}, null, 2));
      }
    } catch (e) {
      showToast(e?.response?.data?.message || "Erreur unpublish", "error");
    }
  };

  const statusPillClass =
    model.status === "published"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : model.status === "pending"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  /* ============ Raccourcis clavier (Ctrl+S / Esc modal) ============ */
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform?.toLowerCase?.().includes("mac");
      const saveCombo = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "s";
      if (saveCombo) {
        e.preventDefault();
        if (!isSubmitting && isValid && (!isEdit || isDirty)) {
          const form = document.getElementById(formId);
          form?.requestSubmit?.();
        }
      }
      if (e.key === "Escape") {
        if (isEditorOpen) setIsEditorOpen(false);
        if (isPreviewOpen) setIsPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, isValid, isEdit, isDirty, isEditorOpen, isPreviewOpen]);

  /* ============ Preview ============ */
  const hasSummaryTitle = Boolean(String(model.title || "").trim());
  const hasSummarySlot = Boolean(
    String(model.template || "").trim() || String(model.section || "").trim() || String(model.locale || "").trim()
  );
  const hasSummaryMeta =
    Boolean(String(model.category || "").trim()) ||
    model.status !== "draft" ||
    Number(model.sort_order ?? 0) !== 0;

  const hasPreviewContent =
    Boolean(String(model.html || "").trim()) ||
    Boolean(String(model.css || "").trim()) ||
    Boolean(String(model.js || "").trim());

  const slotLine = useMemo(() => {
    const parts = [model.template, model.section, model.locale].map((x) => String(x || "").trim()).filter(Boolean);
    return parts.join(" / ");
  }, [model.template, model.section, model.locale]);

  // ✅ même CSS que dans GrapesEditorModal (canvas.styles)
const IS_PROD =
  (typeof import.meta !== "undefined" && import.meta.env?.PROD) ||
  (typeof process !== "undefined" && process.env?.NODE_ENV === "production");

const TAILWIND_HREF = IS_PROD ? "/assets/index.css" : "/src/index.css";

// ✅ pour que les images/liens relatifs marchent (ex: /storage/..., ./img.png)
const BASE_HREF = `${window.location.origin}/`;

// ✅ si tu utilises dark mode dans l’app
const isDark = document.documentElement.classList.contains("dark");


  const previewSrcDoc = useMemo(() => {
  return `<!doctype html>
<html class="${isDark ? "dark" : ""}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <base href="${BASE_HREF}" />

  <!-- ✅ Tailwind / index.css (obligatoire pour tes classes Tailwind) -->
  <link rel="stylesheet" href="${TAILWIND_HREF}" />

  <!-- ✅ CSS généré par Grapes -->
  <style>${model.css || ""}</style>
</head>
<body class="min-h-screen">
  ${model.html || ""}

  <!-- ✅ JS généré par Grapes -->
  <script>${model.js || ""}<\/script>
</body>
</html>`;
}, [model.html, model.css, model.js, isDark]);


  // wrapper glitch: on l’applique uniquement si erreur + glitchOn
  const glitchWrapClass = (fieldName) =>
    hasFieldError(fieldName) && glitchOn ? "mrd-glitch" : "";

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
          toast.open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-white shadow-lg ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            {toast.type === "error" ? <FiAlertTriangle /> : "✓"}
          </span>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-2xl border-b border-slate-200/70 shadow-sm z-[100]">
        <div className="w-full px-4 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
              title="Retour"
            >
              <FiArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate" style={{ color: "#11528f" }}>
                  {isEdit ? "Modifier une section (CMS)" : "Nouvelle section (CMS)"}
                </h1>

                <span className={`${pill} bg-slate-50 text-slate-700 border-slate-200`}>
                  <FiInfo className="opacity-70" />
                  {isEdit ? `ID: ${model.id ?? idOrSlug ?? "—"}` : "Création"}
                </span>

                <span className={`${pill} ${statusPillClass}`}>
                  {model.status === "published" ? <FiCheckCircle /> : <FiClock />}
                  {model.status || "draft"}
                </span>

                {isEdit && (
                  <span
                    className={`${pill} ${
                      isDirty
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {isDirty ? "● Modifié" : "✓ À jour"}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-0.5">
                Stockage: <b>gjs_project</b> (ré-édition) + <b>html/css/js</b> (affichage). Pas de conversion React.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEdit && model.status !== "published" && (
              <button
                type="button"
                onClick={publishNow}
                className="px-3 py-2 rounded-xl text-white text-sm font-semibold shadow"
                style={{ background: "linear-gradient(90deg,#31aa52,#00a0d6)" }}
                title="Publier maintenant"
              >
                Publier
              </button>
            )}

            {isEdit && model.status === "published" && (
              <button
                type="button"
                onClick={unpublish}
                className="px-3 py-2 rounded-xl text-slate-700 text-sm font-semibold shadow border border-slate-200 bg-white hover:bg-slate-50"
                title="Repasser en brouillon"
              >
                Brouillon
              </button>
            )}

            <button
              type="submit"
              form={formId}
              disabled={isSubmitting || !isValid || (isEdit && !isDirty)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow ${
                !isValid || isSubmitting || (isEdit && !isDirty) ? "bg-slate-400 cursor-not-allowed" : ""
              }`}
              style={
                !isValid || isSubmitting || (isEdit && !isDirty)
                  ? {}
                  : { background: "linear-gradient(90deg,#11528f,#00a0d6)" }
              }
              title={isEdit && !isDirty ? "Aucune modification à enregistrer" : "Ctrl+S pour enregistrer"}
            >
              <FiSave className="w-4 h-4" />
              {isSubmitting ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Enregistrer"}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 lg:px-8 py-8 space-y-6 h-screen overflow-y-auto pb-72">
        <form id={formId} onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr] gap-6">
          {/* LEFT */}
          <section className={`${card} p-6 space-y-6`}>
            {/* Slot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiGrid className="w-4 h-4 text-sky-600" />
                    Template <span className="text-red-500">*</span>
                  </span>
                </label>

                <div className={`relative ${glitchWrapClass("template")}`}>
                  <input
                    ref={templateRef}
                    className={`${inputBase} ${hasFieldError("template") ? inputError : ""}`}
                    value={model.template}
                    onChange={(e) => onChange("template", e.target.value)}
                    placeholder="ex: home, about, landing..."
                  />
                </div>
                <FieldError name="template" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiHash className="w-4 h-4 text-indigo-600" />
                    Section <span className="text-red-500">*</span>
                  </span>
                </label>

                <div className={`relative ${glitchWrapClass("section")}`}>
                  <input
                    ref={sectionRef}
                    className={`${inputBase} ${hasFieldError("section") ? inputError : ""}`}
                    value={model.section}
                    onChange={(e) => onChange("section", e.target.value)}
                    placeholder="ex: hero, footer, bloc-1..."
                  />
                </div>
                <FieldError name="section" errors={errors} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiTag className="w-4 h-4 text-emerald-600" />
                    Catégorie <span className="text-red-500">*</span>
                  </span>
                </label>

                <div className={`relative ${glitchWrapClass("category")}`}>
                  <input
                    className={`${inputBase} ${hasFieldError("category") ? inputError : ""}`}
                    value={model.category}
                    onChange={(e) => onChange("category", e.target.value)}
                    placeholder="ex: Accueil, Footer..."
                  />
                </div>
                <FieldError name="category" errors={errors} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={sectionTitle}>
                  Titre <span className="text-red-500">*</span>
                </label>

                <div className={`relative ${glitchWrapClass("title")}`}>
                  <input
                    ref={titleRef}
                    className={`${inputBase} ${hasFieldError("title") ? inputError : ""}`}
                    value={model.title}
                    onChange={(e) => onChange("title", e.target.value)}
                    placeholder='ex: "Hero Accueil 2026"'
                  />
                </div>
                <FieldError name="title" errors={errors} />
              </div>
            </div>

            <div className={divider} />

            {/* Locale + order + status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiGlobe className="w-4 h-4 text-slate-600" />
                    Locale
                  </span>
                </label>

                <div className={`relative ${glitchWrapClass("locale")}`}>
                  <input
                    className={`${inputBase} ${hasFieldError("locale") ? inputError : ""}`}
                    value={model.locale}
                    onChange={(e) => onChange("locale", e.target.value)}
                    placeholder="fr, en..."
                  />
                </div>
                <FieldError name="locale" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Sort order</label>

                <div className={`relative ${glitchWrapClass("sort_order")}`}>
                  <input
                    type="number"
                    className={`${inputBase} ${hasFieldError("sort_order") ? inputError : ""}`}
                    value={model.sort_order}
                    onChange={(e) => onChange("sort_order", parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <FieldError name="sort_order" errors={errors} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={sectionTitle}>Status</label>

                <div className={`relative ${glitchWrapClass("status")}`}>
                  <select
                    className={`${inputBase} ${hasFieldError("status") ? inputError : ""}`}
                    value={model.status || "draft"}
                    onChange={(e) => onChange("status", e.target.value)}
                  >
                    <option value="draft">draft (brouillon)</option>
                    <option value="pending">pending (en attente)</option>
                    <option value="published">published (publié)</option>
                  </select>
                </div>
                <FieldError name="status" errors={errors} />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={sectionTitle}>Published at (optionnel)</label>

                <div className={`relative ${glitchWrapClass("published_at")}`}>
                  <input
                    type="datetime-local"
                    className={`${inputBase} ${hasFieldError("published_at") ? inputError : ""}`}
                    value={model.published_at ? String(model.published_at).slice(0, 16) : ""}
                    onChange={(e) => onChange("published_at", e.target.value)}
                  />
                </div>
                <FieldError name="published_at" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Scheduled at (optionnel)</label>

                <div className={`relative ${glitchWrapClass("scheduled_at")}`}>
                  <input
                    type="datetime-local"
                    className={`${inputBase} ${hasFieldError("scheduled_at") ? inputError : ""}`}
                    value={model.scheduled_at ? String(model.scheduled_at).slice(0, 16) : ""}
                    onChange={(e) => onChange("scheduled_at", e.target.value)}
                  />
                </div>
                <FieldError name="scheduled_at" errors={errors} />
              </div>
            </div>

            <div className={divider} />

            {/* Advanced (Meta JSON) - OPTIONNEL */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full text-left px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <FiShield className="opacity-70" />
                  Options avancées (facultatif)
                </span>
                <span className="text-xs text-slate-500">{showAdvanced ? "Masquer" : "Afficher"}</span>
              </button>

              {showAdvanced && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className={sectionTitle}>
                      <span className="flex items-center gap-2">
                        <FiShield className="w-4 h-4 text-slate-700" />
                        Meta (JSON)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={applyMetaDraft}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50 flex items-center gap-1"
                      title="Appliquer le JSON dans le modèle"
                    >
                      <FiCode className="w-4 h-4" />
                      Appliquer
                    </button>
                  </div>

                  <div className={`relative ${glitchWrapClass("meta")}`}>
                    <textarea
                      className={`${inputBase} font-mono text-[12px] min-h-[140px] ${
                        metaError || hasFieldError("meta") ? inputError : ""
                      }`}
                      value={metaDraft}
                      onChange={(e) => {
                        setMetaDraft(e.target.value);
                        setMetaError("");
                      }}
                      placeholder='{"variant":"heroA","cta":{"text":"Voir plus"}}'
                    />
                  </div>

                  {metaError ? <p className="text-xs text-red-600">{metaError}</p> : null}
                  <FieldError name="meta" errors={errors} />

                  <p className={hint}>
                    <FiInfo className="w-4 h-4 mt-0.5 opacity-70" />
                    Meta est optionnel. Sert à stocker des infos de rendu (ex: variant, tracking, etc.). Tu peux l’ignorer.
                  </p>
                </div>
              )}
            </div>

            <div className={divider} />

            {/* GrapesJS content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className={sectionTitle}>Contenu (GrapesJS)</label>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50 flex items-center gap-1"
                  title="Éditer en plein écran"
                >
                  <FiMaximize2 className="w-4 h-4" />
                  Ouvrir l’éditeur
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    hasFieldError("html") && glitchOn ? "mrd-glitch-soft" : ""
                  } ${hasFieldError("html") ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-slate-50"} text-slate-700`}
                >
                  <div className="text-xs text-slate-500">HTML</div>
                  <div className="font-semibold">{(model.html || "").length} chars</div>
                  <FieldError name="html" errors={errors} />
                </div>

                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    hasFieldError("css") && glitchOn ? "mrd-glitch-soft" : ""
                  } ${hasFieldError("css") ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-slate-50"} text-slate-700`}
                >
                  <div className="text-xs text-slate-500">CSS</div>
                  <div className="font-semibold">{(model.css || "").length} chars</div>
                  <FieldError name="css" errors={errors} />
                </div>

                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    hasFieldError("gjs_project") && glitchOn ? "mrd-glitch-soft" : ""
                  } ${
                    hasFieldError("gjs_project") ? "border-red-300 bg-red-50/60" : "border-slate-200 bg-slate-50"
                  } text-slate-700`}
                >
                  <div className="text-xs text-slate-500">Project JSON</div>
                  <div className="font-semibold">{(model.gjs_project || "").length} chars</div>
                  <FieldError name="gjs_project" errors={errors} />
                </div>
              </div>

              <p className={hint}>
                <FiInfo className="w-4 h-4 mt-0.5 opacity-70" />
                gjs_project = ré-édition exacte. html/css/js = rendu front React.
              </p>
            </div>
          </section>

          {/* RIGHT: Preview */}
          <section className={`${card} p-6 space-y-6`}>
            {(hasSummaryTitle || hasSummarySlot || hasSummaryMeta) && (
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900 text-white p-5 border border-white/10 shadow-lg">
                {hasSummaryTitle && <div className="text-lg font-bold truncate">{String(model.title).trim()}</div>}
                {hasSummarySlot && <div className="text-sm text-cyan-200 font-semibold mt-1 truncate">{slotLine}</div>}

                {hasSummaryMeta && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {String(model.category || "").trim() && (
                      <span className={`${pill} bg-white/10 text-white/90 border-white/10`}>
                        cat: {String(model.category).trim()}
                      </span>
                    )}
                    {model.status !== "draft" && (
                      <span className={`${pill} bg-white/10 text-white/90 border-white/10`}>status: {model.status}</span>
                    )}
                    {Number(model.sort_order ?? 0) !== 0 && (
                      <span className={`${pill} bg-white/10 text-white/90 border-white/10`}>
                        order: {Number(model.sort_order ?? 0)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className={sectionTitle}>Preview (iframe)</label>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={!hasPreviewContent}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                    hasPreviewContent
                      ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                      : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                  title={hasPreviewContent ? "Ouvrir en plein écran" : "Aucun contenu"}
                >
                  <FiEye className="w-4 h-4" />
                  Plein écran
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                {hasPreviewContent ? (
                  <iframe
                    title="cms-preview"
                    className="w-full h-[520px]"
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={previewSrcDoc}
                  />
                ) : (
                  <div className="w-full h-[520px] flex items-center justify-center text-sm text-slate-500 bg-gradient-to-br from-white to-slate-50">
                    <div className="text-center px-6">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 mb-3">
                        <FiCode />
                      </div>
                      <div className="font-semibold text-slate-700">Aucun contenu à prévisualiser</div>
                      <div className="text-xs mt-1">Ouvre l’éditeur GrapesJS pour générer HTML/CSS/JS.</div>
                    </div>
                  </div>
                )}
              </div>

              <p className={hint}>
                <FiInfo className="w-4 h-4 mt-0.5 opacity-70" />
                Preview en sandbox. JS en prod = à contrôler (rôles/CSP).
              </p>
            </div>
          </section>
        </form>
      </main>

      {/* Modal GrapesJS */}
      {isEditorOpen && (
        <Portal id="cms-grapes-modal-root">
          <div className="fixed inset-0 z-[2147483647] bg-slate-900/70 backdrop-blur-sm" aria-modal="true" role="dialog">
            <div className="absolute inset-0 p-4 md:p-6 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/90 border border-slate-200 shadow">
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <FiMaximize2 className="opacity-70" />
                  Éditeur GrapesJS (plein écran)
                  <span className="text-[11px] font-normal text-slate-500 ml-2">(Esc pour fermer)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50 flex items-center gap-1"
                  title="Fermer"
                >
                  <FiX className="w-4 h-4" />
                  Fermer
                </button>
              </div>

              <div className="flex-1 min-h-0 mt-3 rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <GrapesEditorModal
                  initialProject={model.gjs_project}
                  initialHtml={model.html}
                  initialCss={model.css}
                  initialJs={model.js}
                  onSave={({ project, html, css, js }) => {
                    onChange("gjs_project", project);
                    onChange("html", html);
                    onChange("css", css);
                    onChange("js", js);
                    showToast("Contenu enregistré (local) ✅", "success");
                    setIsEditorOpen(false);
                  }}
                  onCancel={() => setIsEditorOpen(false)}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Modal Preview plein écran */}
      {isPreviewOpen && (
        <Portal id="cms-preview-modal-root">
          <div className="fixed inset-0 z-[2147483647] bg-slate-900/70 backdrop-blur-sm" aria-modal="true" role="dialog">
            <div className="absolute inset-0 p-4 md:p-6 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/90 border border-slate-200 shadow">
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <FiEye className="opacity-70" />
                  Preview (plein écran)
                  <span className="text-[11px] font-normal text-slate-500 ml-2">(Esc pour fermer)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50 flex items-center gap-1"
                  title="Fermer"
                >
                  <FiX className="w-4 h-4" />
                  Fermer
                </button>
              </div>

              <div className="flex-1 min-h-0 mt-3 rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <iframe
                  title="cms-preview-fullscreen"
                  className="w-full h-full"
                  sandbox="allow-scripts allow-same-origin"
                  srcDoc={previewSrcDoc}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ✅ CSS glitch */}
      <style>{`
        @keyframes mrdGlitchJitter {
          0%   { transform: translate3d(0,0,0); filter: none; }
          15%  { transform: translate3d(-1px,0,0); }
          30%  { transform: translate3d(1px,0,0); }
          45%  { transform: translate3d(-2px,1px,0); }
          60%  { transform: translate3d(2px,-1px,0); }
          75%  { transform: translate3d(-1px,-1px,0); }
          100% { transform: translate3d(0,0,0); }
        }
        @keyframes mrdGlitchScan {
          0%   { clip-path: inset(0 0 92% 0); opacity: .0; }
          15%  { clip-path: inset(12% 0 72% 0); opacity: .35; }
          30%  { clip-path: inset(38% 0 48% 0); opacity: .25; }
          45%  { clip-path: inset(62% 0 28% 0); opacity: .35; }
          60%  { clip-path: inset(78% 0 16% 0); opacity: .22; }
          75%  { clip-path: inset(88% 0 6% 0);  opacity: .18; }
          100% { clip-path: inset(0 0 92% 0); opacity: 0; }
        }
        .mrd-glitch {
          animation: mrdGlitchJitter 520ms steps(10, end) both;
        }
        .mrd-glitch::before,
        .mrd-glitch::after{
          content:"";
          position:absolute;
          inset:-2px;
          border-radius: 18px;
          pointer-events:none;
          mix-blend-mode: multiply;
          opacity: 0;
        }
        .mrd-glitch::before{
          background: linear-gradient(90deg, rgba(255,0,90,.35), rgba(0,190,255,.25));
          animation: mrdGlitchScan 520ms steps(8, end) both;
        }
        .mrd-glitch::after{
          background: linear-gradient(90deg, rgba(0,255,170,.22), rgba(255,230,0,.18));
          animation: mrdGlitchScan 520ms steps(9, end) both;
          animation-delay: 60ms;
        }
        .mrd-glitch-soft{
          animation: mrdGlitchJitter 520ms steps(10, end) both;
        }

        @media (prefers-reduced-motion: reduce){
          .mrd-glitch, .mrd-glitch-soft{ animation: none !important; }
          .mrd-glitch::before, .mrd-glitch::after{ display:none !important; }
        }
      `}</style>
    </div>
  );
}
