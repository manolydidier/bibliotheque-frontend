// src/pages/UserManagementDashboard/Components/OrgNodes/OrgNodeForm.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiSave,
  FiUpload,
  FiArrowLeft,
  FiUser,
  FiHash,
  FiTag,
  FiCheckCircle,
  FiToggleLeft,
  FiAlignLeft,
  FiMaximize2,
  FiX,
  FiGitBranch,
  FiSearch,
  FiTrash2,
  FiInfo,
  FiAlertTriangle,
  FiImage,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";

import api from "../../../../../../services/api";
import RichTextEditor from "../../articles/RichTextEditor";

/* ===============================
   PORTAL (plein écran editor)
================================= */
const Portal = ({ children, id = "orgnode-editor-modal-root" }) => {
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

/* ===============================
   UI TOKENS
================================= */
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

const inputError = "border-red-300 focus:border-red-500 focus:ring-red-500/30";

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
const hint = "text-xs text-slate-500 mt-1 flex items-start gap-2 leading-snug";
const pill =
  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border";
const divider =
  "h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent";

/* ===============================
   HELPERS
================================= */
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

const stripHtml = (html) =>
  typeof html === "string" ? html.replace(/<[^>]+>/g, "").trim() : "";

const normalizeNames = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => (typeof x === "string" ? x : x?.name || x?.role || x?.slug || ""))
    .map((s) => String(s).trim())
    .filter(Boolean);

const isAdminUser = (authUser) => {
  if (!authUser) return false;

  const roles = [
    ...normalizeNames(authUser.roles),
    ...(authUser.role ? [String(authUser.role)] : []),
  ].map((r) => r.toLowerCase());

  if (roles.includes("admin")) return true;
  if (Number(authUser.is_admin ?? 0) === 1) return true;

  const perms = normalizeNames(authUser.permissions).map((p) => p.toLowerCase());
  if (perms.includes("orgnodes.assign_user")) return true;

  return false;
};

const resolveAvatarSrc = (avatarPreview, avatar_path) => {
  if (avatarPreview) return avatarPreview;
  const raw = String(avatar_path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `/storage/${raw.replace(/^\/?storage\//, "").replace(/^storage\//, "")}`;
};

const logAxiosError = (prefix, err) => {
  console.error(prefix, {
    status: err?.response?.status,
    data: err?.response?.data,
    message: err?.message,
    err,
  });
};

// ✅ EXTRACTEUR ROBUSTE (selon formats backend)
const extractOrgNode = (payload) => {
  if (!payload) return null;

  // cas Laravel API Resource: { data: {...} }
  if (payload?.data && (payload.data.id != null || payload.data.title)) return payload.data;

  // cas direct: { id, title, ... }
  if (payload?.id != null || payload?.title) return payload;

  // cas wrapper: { orgnode: {...} } ou { node: {...} }
  const candidates = [payload?.orgnode, payload?.orgNode, payload?.node, payload?.item];
  for (const c of candidates) {
    if (c && (c.id != null || c.title)) return c;
  }

  return null;
};

// ✅ FormData propre
const toFormData = (payload, files = {}) => {
  const fd = new FormData();

  const allowedKeys = [
    "title",
    "user_id",
    "parent_id",
    "department",
    "badge",
    "subtitle",
    "bio",
    "level",
    "accent",
    "sort_order",
    "pos_x",
    "pos_y",
    "is_active",
  ];

  for (const key of allowedKeys) {
    if (!(key in payload)) continue;
    const v = payload[key];
    if (v === undefined || v === null || v === "") continue;

    if (typeof v === "boolean") fd.append(key, v ? "1" : "0");
    else fd.append(key, String(v));
  }

  if (files.avatar instanceof File) {
    fd.append("avatar", files.avatar, files.avatar.name);
  }

  return fd;
};

const hydrateFromNode = (data, meId) => ({
  id: data.id ?? null,
  user_id: data.user_id != null ? String(data.user_id) : meId || "",
  parent_id: data.parent_id ?? "",
  title: data.title ?? "",
  department: data.department ?? "",
  badge: data.badge ?? "",
  subtitle: data.subtitle ?? "",
  bio: data.bio ?? "",
  level: data.level ?? 1,
  accent: data.accent ?? "sky",
  sort_order: data.sort_order ?? 0,
  pos_x: data.pos_x ?? 0,
  pos_y: data.pos_y ?? 0,
  is_active: data.is_active ?? true,
  avatar_path: data.avatar_path ?? "",
  created_at: data.created_at ?? "",
  updated_at: data.updated_at ?? "",
});

/* ===============================
   COMPONENT
================================= */
export default function OrgNodeForm() {
  const { id } = useParams(); // ✅ /orgnodes/:id/edit
  const idOrSlug = String(id || "").trim();
  const isEdit = Boolean(idOrSlug);

  const navigate = useNavigate();

  // Auth state
  const auth = useSelector((s) => s.library?.auth || {});
  const me = auth?.user || null;
  const meId = me?.id ? String(me.id) : "";
  const canAssignUserId = isAdminUser(me);

  const [model, setModel] = useState(() => ({
    id: null,
    user_id: meId || "",
    parent_id: "",
    title: "",
    department: "",
    badge: "",
    subtitle: "",
    bio: "",
    level: 1,
    accent: "sky",
    sort_order: 0,
    pos_x: 0,
    pos_y: 0,
    is_active: true,
    avatar_path: "",
    created_at: "",
    updated_at: "",
  }));

  const [parents, setParents] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const lastAvatarUrlRef = useRef("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });
  const toastTimerRef = useRef(null);

  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

  // UX additions
  const [parentSearch, setParentSearch] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Debug (optionnel)
  const [debugShowRaw, setDebugShowRaw] = useState(null);
  const [debugPickedFrom, setDebugPickedFrom] = useState(""); // "show" | "list(fallback)"

  // refs: focus 1ère erreur
  const titleRef = useRef(null);
  const userRef = useRef(null);
  const parentRef = useRef(null);

  const onChange = (k, v) => setModel((prev) => ({ ...prev, [k]: v }));

  

 

  // lock scroll on modal
  useEffect(() => {
    document.body.style.overflow = isEditorModalOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [isEditorModalOpen]);

  // preview locale avatar
  useEffect(() => {
    if (avatarFile) {
      if (lastAvatarUrlRef.current) URL.revokeObjectURL(lastAvatarUrlRef.current);
      const url = URL.createObjectURL(avatarFile);
      lastAvatarUrlRef.current = url;
      setAvatarPreview(url);
    } else {
      if (lastAvatarUrlRef.current) {
        URL.revokeObjectURL(lastAvatarUrlRef.current);
        lastAvatarUrlRef.current = "";
      }
      setAvatarPreview("");
    }

    return () => {
      if (lastAvatarUrlRef.current) {
        URL.revokeObjectURL(lastAvatarUrlRef.current);
        lastAvatarUrlRef.current = "";
      }
    };
  }, [avatarFile]);

  /* ===============================
     DATA LOADERS
  ================================= */

  // parents (liste)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/orgnodes", {
          params: { all: 1, per_page: 2000, include: "parent" },
          headers: { "Cache-Control": "no-store" },
        });

        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];

        setParents(list);
      } catch (err) {
        logAxiosError("[OrgNodeForm] GET /orgnodes failed", err);
        setParents([]);
      }
    })();
  }, []);

  // admin users
  useEffect(() => {
    if (!canAssignUserId) return;
    (async () => {
      try {
        const res = await api.get("/admin-users", {
          params: { per_page: 500 },
          headers: { "Cache-Control": "no-store" },
        });

        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];

        
        setAdminUsers(list);
      } catch (err) {
        logAxiosError("[OrgNodeForm] GET /admin-users failed", err);
        setAdminUsers([]);
      }
    })();
  }, [canAssignUserId]);

  // baseline
  const [baseline, setBaseline] = useState(null);
  const didSetBaselineRef = useRef(false);

  // fetch show
  const fetchOrgNodeDirect = useCallback(async (nodeId) => {
    const res = await api.get(`/orgnodes/${encodeURIComponent(nodeId)}`, {
      params: { include: "parent,user" },
      headers: { "Cache-Control": "no-store" },
    });

    setDebugShowRaw(res?.data ?? null);

    const node = extractOrgNode(res?.data);
    return node;
  }, []);

  // 1) on tente /orgnodes/:id
  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const node = await fetchOrgNodeDirect(idOrSlug);

        if (node && (node.id != null || node.title)) {
          const hydrated = hydrateFromNode(node, meId);

          setModel((prev) => ({ ...prev, ...hydrated }));
          setDebugPickedFrom("show");

          if (!didSetBaselineRef.current && hydrated?.id) {
            didSetBaselineRef.current = true;
            setBaseline(hydrated);
          }
          return;
        }

        setDebugPickedFrom("show(empty)");
      } catch (err) {
        logAxiosError("[OrgNodeForm] GET /orgnodes/:id failed", err);
        setToast({
          open: true,
          msg:
            err?.response?.data?.message ||
            err?.message ||
            "Impossible de charger ce noeud.",
          type: "error",
        });
      }
    })();
  }, [isEdit, idOrSlug, meId, fetchOrgNodeDirect]);

  // 2) fallback : quand parents est chargé, on hydrate depuis la liste
  useEffect(() => {
    if (!isEdit) return;
    if (model?.id) return; // déjà hydraté
    if (!parents?.length) return;

    const fallback = parents.find((p) => String(p.id) === String(idOrSlug));
    if (!fallback) return;

    const hydrated = hydrateFromNode(fallback, meId);
    setModel((prev) => ({ ...prev, ...hydrated }));
    setDebugPickedFrom("list(fallback)");

    if (!didSetBaselineRef.current && hydrated?.id) {
      didSetBaselineRef.current = true;
      setBaseline(hydrated);
    }
  }, [isEdit, idOrSlug, parents, meId, model?.id]);

  /* ===============================
     PROGRESS BAR
  ================================= */
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

  const showToast = (msg, type = "success") => {
    setToast({ open: true, msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToast({ open: false, msg: "", type: "success" }),
      2500
    );
  };

  useEffect(
    () => () => toastTimerRef.current && clearTimeout(toastTimerRef.current),
    []
  );

  /* ===============================
     VALIDATION + METRICS
  ================================= */
  const isValid = Boolean(String(model.title || "").trim());

  const fullscreenHeight =
    typeof window !== "undefined"
      ? Math.max(360, window.innerHeight - 160)
      : 520;

  const bioPlain = stripHtml(model.bio || "");
  const bioChars = bioPlain.length;
  const bioWords = bioPlain ? bioPlain.split(/\s+/).filter(Boolean).length : 0;

  const selectedUserIsMe = useMemo(() => {
    if (!meId) return false;
    return String(model.user_id || "") === String(meId);
  }, [model.user_id, meId]);

  const parentLabel = useMemo(() => {
    if (!model.parent_id) return "Aucun (racine)";
    const p = parents.find((x) => String(x.id) === String(model.parent_id));
    return p?.title || `#${model.parent_id}`;
  }, [model.parent_id, parents]);

  const parentOptions = useMemo(() => {
    const q = parentSearch.trim().toLowerCase();
    return parents
      .filter((p) => String(p.id) !== String(model.id))
      .filter((p) => {
        if (!q) return true;
        const t = String(p.title || "").toLowerCase();
        const d = String(p.department || "").toLowerCase();
        return t.includes(q) || d.includes(q) || String(p.id).includes(q);
      });
  }, [parents, parentSearch, model.id]);

  /* ===============================
     DIRTY DETECTION
  ================================= */
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

  const fieldsForCompare = useMemo(
    () => [
      "user_id",
      "parent_id",
      "title",
      "department",
      "badge",
      "subtitle",
      "bio",
      "level",
      "accent",
      "sort_order",
      "pos_x",
      "pos_y",
      "is_active",
      "avatar_path",
    ],
    []
  );

  const isDirty = useMemo(() => {
    if (!isEdit) return true;
    if (!baseline) return false;
    if (avatarFile) return true;

    for (const k of fieldsForCompare) {
      const a = stableStr(model?.[k]);
      const b = stableStr(baseline?.[k]);
      if (a !== b) return true;
    }
    return false;
  }, [isEdit, baseline, model, fieldsForCompare, avatarFile]);

  /* ===============================
     AVATAR UX
  ================================= */
  const onPickAvatar = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      showToast("Le fichier doit être une image.", "error");
      return;
    }
    setAvatarFile(file);
  };

  const onDropAvatar = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) onPickAvatar(f);
  };

  const removeLocalAvatar = () => {
    setAvatarFile(null);
  };

  /* ===============================
     SUBMIT
  ================================= */
 const handleSubmit = async (e) => {
  e?.preventDefault?.();
  setIsSubmitting(true);
  setErrors({});

  try {
    const payload = {
      title: model.title || "",
      user_id: String(model.user_id || ""),
      parent_id: model.parent_id || "",
      department: model.department || "",
      badge: model.badge || "",
      subtitle: model.subtitle || "",
      bio: model.bio || "",
      level: Number(model.level ?? 1),
      accent: model.accent || "",
      sort_order: Number(model.sort_order ?? 0),
      pos_x: Number(model.pos_x ?? 0),
      pos_y: Number(model.pos_y ?? 0),
      is_active: !!model.is_active,
    };

   

    const fd = toFormData(payload, { avatar: avatarFile || null });

   

    let res;

    if (isEdit && model.id) {
      // ✅ IMPORTANT: PHP/Laravel ne parse pas bien multipart PUT -> utiliser _method=PUT
      fd.append("_method", "PUT");

      res = await api.post(`/orgnodes/${model.id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      res = await api.post("/orgnodes", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    const data = res?.data?.data ?? res?.data ?? {};
   

    setModel((prev) => ({ ...prev, ...(data || {}) }));

    if (isEdit) {
      const nextBaseline = {
        ...baseline,
        ...model,
        ...(data || {}),
        user_id: (data?.user_id != null ? String(data.user_id) : model.user_id) || "",
      };
      setBaseline(nextBaseline);
    } else if (data?.id) {
      const created = {
        ...model,
        ...(data || {}),
        id: data.id,
        user_id: (data?.user_id != null ? String(data.user_id) : model.user_id) || "",
      };
      setBaseline(created);
      didSetBaselineRef.current = true;
    }

    showToast(isEdit ? "Noeud mis à jour ✅" : "Noeud créé ✅", "success");

    if (!isEdit) {
      setModel((prev) => ({
        ...prev,
        id: null,
        parent_id: "",
        title: "",
        department: "",
        badge: "",
        subtitle: "",
        bio: "",
        level: 1,
        accent: "sky",
        sort_order: 0,
        pos_x: 0,
        pos_y: 0,
        is_active: true,
        avatar_path: "",
        user_id: meId || "",
      }));
      setAvatarFile(null);
      setParentSearch("");
      setBaseline(null);
      didSetBaselineRef.current = false;
    } else {
      setAvatarFile(null);
    }
  } catch (err) {
    if (err?.response?.status === 422 && err?.response?.data?.errors) {
      const es = err.response.data.errors || {};
      setErrors(es);
      showToast("Validation: corrige les champs en rouge.", "error");

      const first = Object.keys(es)[0];
      if (first === "title" && titleRef.current) titleRef.current.focus();
      else if (first === "user_id" && userRef.current) userRef.current.focus();
      else if (first === "parent_id" && parentRef.current) parentRef.current.focus();
    } else {
      logAxiosError("[OrgNodeForm] SAVE failed", err);
      setToast({
        open: true,
        msg: err?.response?.data?.message || err.message || "Erreur lors de l’enregistrement",
        type: "error",
      });
    }
  } finally {
    setIsSubmitting(false);
  }
};


  /* ===============================
     RENDER
  ================================= */
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
                <h1
                  className="text-xl md:text-2xl font-bold tracking-tight truncate"
                  style={{ color: "#11528f" }}
                >
                  {isEdit ? "Modifier un noeud (OrgNode)" : "Nouveau noeud (OrgNode)"}
                </h1>

                <span className={`${pill} bg-slate-50 text-slate-700 border-slate-200`}>
                  <FiInfo className="opacity-70" />
                  {isEdit ? `ID: ${model.id ?? idOrSlug ?? "—"}` : "Création"}
                </span>

                <span
                  className={`${pill} ${
                    model.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {model.is_active ? <FiCheckCircle /> : <FiToggleLeft />}
                  {model.is_active ? "Actif" : "Inactif"}
                </span>

                <span className={`${pill} bg-indigo-50 text-indigo-700 border-indigo-200`}>
                  <FiGitBranch />
                  Parent: {parentLabel}
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

                {isEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      if (debugShowRaw) {
                        const s = JSON.stringify(debugShowRaw, null, 2);
                        navigator.clipboard?.writeText?.(s);
                        showToast("Réponse /orgnodes/:id copiée ✅", "success");
                      } else {
                        showToast("Aucune réponse show à copier", "error");
                      }
                    }}
                    className={`${pill} bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100`}
                    title="Copier la réponse brute du GET /orgnodes/:id"
                  >
                    🧪 show: {debugPickedFrom || "?"}
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-0.5">
                Titre requis • utilisateur assigné (admins uniquement) • hiérarchie • publication organigramme.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid || (isEdit && !isDirty)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow ${
              !isValid || isSubmitting || (isEdit && !isDirty)
                ? "bg-slate-400 cursor-not-allowed"
                : ""
            }`}
            style={
              !isValid || isSubmitting || (isEdit && !isDirty)
                ? {}
                : { background: "linear-gradient(90deg,#11528f,#00a0d6)" }
            }
            title={isEdit && !isDirty ? "Aucune modification à enregistrer" : undefined}
          >
            <FiSave className="w-4 h-4" />
            {isSubmitting ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Enregistrer"}
          </button>
        </div>
      </header>

      <main className="w-full px-4 lg:px-8 py-8 space-y-6 h-screen overflow-y-auto pb-72">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr] gap-6"
        >
          {/* Col gauche */}
          <section className={`${card} p-6 space-y-6`}>
            {/* user_id */}
            <div className="space-y-2">
              <label className={sectionTitle}>
                <span className="flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-sky-600" />
                  Utilisateur lié (user_id) — Admin only
                </span>
              </label>

              {canAssignUserId ? (
                <>
                  <select
                    ref={userRef}
                    className={`${inputBase} ${errors.user_id ? inputError : ""}`}
                    value={model.user_id || ""}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const picked = adminUsers.find((u) => String(u.id) === String(nextId));
                  
                      onChange("user_id", nextId);
                    }}
                  >
                    <option value="">— Sélectionner un admin —</option>
                    {adminUsers.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.is_me ? "👤 (Moi) " : ""}
                        {u.name} — {u.email}
                      </option>
                    ))}
                  </select>

                  <p className={hint}>
                    <FiInfo className="w-4 h-4 mt-0.5 opacity-70" />
                    Liste filtrée : uniquement les utilisateurs ayant le rôle Admin.
                    {selectedUserIsMe && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ✅ Moi
                      </span>
                    )}
                  </p>
                  <FieldError name="user_id" errors={errors} />
                </>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>
                      Assignation verrouillée (non-admin). <b>user_id = toi</b>.
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      ✅ Moi
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={divider} />

            {/* title */}
            <div className="space-y-2">
              <label className={sectionTitle}>
                <span className="flex items-center gap-2">
                  <FiTag className="w-4 h-4 text-emerald-600" />
                  Title <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                ref={titleRef}
                className={`${inputBase} ${errors.title ? inputError : ""}`}
                value={model.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder='Ex. : "Directeur Général", "Chef de service"'
                required
              />
              <FieldError name="title" errors={errors} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* department */}
              <div className="space-y-2">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiHash className="w-4 h-4 text-indigo-600" />
                    Département
                  </span>
                </label>
                <input
                  className={`${inputBase} ${errors.department ? inputError : ""}`}
                  value={model.department}
                  onChange={(e) => onChange("department", e.target.value)}
                  placeholder='Ex. : "Administration", "Finance"'
                />
                <FieldError name="department" errors={errors} />
              </div>

              {/* badge */}
              <div className="space-y-2">
                <label className={sectionTitle}>Badge</label>
                <input
                  className={`${inputBase} ${errors.badge ? inputError : ""}`}
                  value={model.badge}
                  onChange={(e) => onChange("badge", e.target.value)}
                  placeholder='Ex. : "CEO", "DG", "RH"'
                />
                <FieldError name="badge" errors={errors} />
              </div>
            </div>

            {/* subtitle */}
            <div className="space-y-2">
              <label className={sectionTitle}>Sous-titre</label>
              <input
                className={`${inputBase} ${errors.subtitle ? inputError : ""}`}
                value={model.subtitle}
                onChange={(e) => onChange("subtitle", e.target.value)}
                placeholder='Ex. : "Direction générale", "Pôle Administratif"'
              />
              <FieldError name="subtitle" errors={errors} />
            </div>

            <div className={divider} />

            {/* Parent + order */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiGitBranch className="w-4 h-4 text-slate-700" />
                    Parent (hiérarchie)
                  </span>
                </label>

                <div className="relative">
                  <FiSearch className="absolute left-3 top-3 text-slate-400" />
                  <input
                    className={`${inputBase} pl-10`}
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                    placeholder="Rechercher un parent… (titre, dept, id)"
                  />
                </div>

                <select
                  ref={parentRef}
                  className={`${inputBase} mt-2 ${errors.parent_id ? inputError : ""}`}
                  value={model.parent_id || ""}
                  onChange={(e) => onChange("parent_id", e.target.value)}
                >
                  <option value="">— Aucun (racine) —</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || `#${p.id}`} {p.department ? `— ${p.department}` : ""}
                    </option>
                  ))}
                </select>
                <FieldError name="parent_id" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Sort order</label>
                <input
                  type="number"
                  className={`${inputBase} ${errors.sort_order ? inputError : ""}`}
                  value={model.sort_order}
                  onChange={(e) => onChange("sort_order", parseInt(e.target.value, 10) || 0)}
                />
                <FieldError name="sort_order" errors={errors} />
              </div>
            </div>

            {/* level + accent + pos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className={sectionTitle}>Level</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  className={`${inputBase} ${errors.level ? inputError : ""}`}
                  value={model.level}
                  onChange={(e) => onChange("level", parseInt(e.target.value, 10) || 0)}
                />
                <FieldError name="level" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Accent</label>
                <select
                  className={`${inputBase} ${errors.accent ? inputError : ""}`}
                  value={model.accent || "sky"}
                  onChange={(e) => onChange("accent", e.target.value)}
                >
                  <option value="sky">sky</option>
                  <option value="blue">blue</option>
                  <option value="emerald">emerald</option>
                  <option value="violet">violet</option>
                  <option value="amber">amber</option>
                  <option value="rose">rose</option>
                  <option value="indigo">indigo</option>
                </select>
                <FieldError name="accent" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>pos_x</label>
                <input
                  type="number"
                  className={`${inputBase} ${errors.pos_x ? inputError : ""}`}
                  value={model.pos_x}
                  onChange={(e) => onChange("pos_x", parseInt(e.target.value, 10) || 0)}
                />
                <FieldError name="pos_x" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>pos_y</label>
                <input
                  type="number"
                  className={`${inputBase} ${errors.pos_y ? inputError : ""}`}
                  value={model.pos_y}
                  onChange={(e) => onChange("pos_y", parseInt(e.target.value, 10) || 0)}
                />
                <FieldError name="pos_y" errors={errors} />
              </div>
            </div>

            <div className={divider} />

            {/* Bio + fullscreen */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiAlignLeft className="w-4 h-4 text-slate-600" />
                    Bio / Description (rich texte)
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <span className={`${pill} bg-slate-50 text-slate-600 border-slate-200`}>
                    {bioChars} chars • ~{bioWords} mots
                  </span>
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
              </div>

              <div
                className={`rounded-2xl border ${
                  errors.bio ? "border-red-200" : "border-slate-200"
                } overflow-hidden`}
              >
                <RichTextEditor
                  value={model.bio || ""}
                  onChange={(html) => onChange("bio", html)}
                  height={320}
                />
              </div>

              <FieldError name="bio" errors={errors} />
            </div>

            {/* Active */}
            <div className="space-y-2">
              <label className={sectionTitle}>Activer ce noeud</label>
              <button
                type="button"
                onClick={() => onChange("is_active", !model.is_active)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-semibold ${
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
                      <FiCheckCircle className="w-3.5 h-3.5" /> Actif
                    </>
                  ) : (
                    <>
                      <FiToggleLeft className="w-3.5 h-3.5" /> Inactif
                    </>
                  )}
                </span>
              </button>
              <FieldError name="is_active" errors={errors} />
            </div>
          </section>

          {/* Col droite */}
          <section className={`${card} p-6 space-y-6`}>
            {/* Preview */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900 text-white p-5 border border-white/10 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  {resolveAvatarSrc(avatarPreview, model.avatar_path) ? (
                    <img
                      src={resolveAvatarSrc(avatarPreview, model.avatar_path)}
                      alt={model.title || "Avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiImage className="text-white/60 text-2xl" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-bold truncate">
                    {model.title?.trim() || "Titre (à renseigner)"}
                  </div>
                  <div className="text-sm text-cyan-200 font-semibold mt-1 truncate">
                    {model.department || "Département —"}
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    Parent: {parentLabel}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`${pill} bg-white/10 text-white/90 border-white/10`}>
                      Accent: {model.accent || "—"}
                    </span>
                    <span className={`${pill} bg-white/10 text-white/90 border-white/10`}>
                      Order: {Number(model.sort_order ?? 0)}
                    </span>
                    <span className={`${pill} bg-white/10 text-white/90 border-white/10`}>
                      Level: {Number(model.level ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Avatar */}
            <div className="space-y-3">
              <label className={`${sectionTitle} flex items-center gap-2`}>
                <span className="p-1.5 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
                  <FiUpload className="w-4 h-4" />
                </span>
                Avatar / Photo (optionnel)
              </label>

              <div
                className={`relative rounded-2xl border-2 border-dashed overflow-hidden min-h-[260px] flex flex-col items-center justify-center text-slate-500 ${
                  isDragOver ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-slate-50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDropAvatar}
              >
                {resolveAvatarSrc(avatarPreview, model.avatar_path) ? (
                  <>
                    <img
                      src={resolveAvatarSrc(avatarPreview, model.avatar_path)}
                      alt={model.title || "Avatar orgnode"}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-x-4 bottom-4 flex items-center gap-2">
                      <label className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-900/80 text-white text-xs font-semibold cursor-pointer">
                        <FiUpload className="w-4 h-4" />
                        Changer
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={removeLocalAvatar}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold border border-white/60"
                        title="Retirer l’image (preview local)"
                      >
                        <FiTrash2 />
                        Retirer
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <FiUser className="w-10 h-10 text-slate-400" />
                    <p className="text-sm font-medium">
                      Glisse-dépose une photo ici, ou clique pour sélectionner
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Recommandé : carré (ex. 800×800)
                    </p>

                    <label className="mt-2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-900/80 text-white text-xs font-semibold cursor-pointer">
                      <FiUpload className="w-4 h-4" />
                      Choisir une image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                )}
              </div>

              <p className={hint}>
                <FiInfo className="w-4 h-4 mt-0.5 opacity-70" />
                JPG/PNG/WebP – idéalement carré. Tu peux aussi faire <b>drag & drop</b>.
              </p>
              <FieldError name="avatar" errors={errors} />
            </div>
          </section>
        </form>
      </main>

      {/* modal plein écran */}
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
                  Édition bio (plein écran)
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
                  value={model.bio || ""}
                  onChange={(html) => onChange("bio", html)}
                  height={fullscreenHeight}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
