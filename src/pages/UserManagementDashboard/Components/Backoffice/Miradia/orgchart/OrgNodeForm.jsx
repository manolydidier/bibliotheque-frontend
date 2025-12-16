// src/pages/UserManagementDashboard/Components/OrgNodes/OrgNodeForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "react-icons/fi";
import { createPortal } from "react-dom";

import api from "../../../../../../services/api";
import RichTextEditor from "../../articles/RichTextEditor";
import { useSelector } from "react-redux";

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
    .map((x) =>
      typeof x === "string" ? x : x?.name || x?.role || x?.slug || ""
    )
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

/* ===============================
   COMPONENT
================================= */
export default function OrgNodeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  // Auth state
  const auth = useSelector((s) => s.library?.auth || {});
  const me = auth?.user || null;
  const meId = me?.id ? String(me.id) : "";
  const canAssignUserId = isAdminUser(me);

  const [model, setModel] = useState({
    id: null,
    user_id: meId || "",
    parent_id: "",
    title: "", // ✅ required
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
  });

  const [parents, setParents] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const lastAvatarUrlRef = useRef("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ open: false, msg: "" });
  const toastTimerRef = useRef(null);

  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

  const onChange = (k, v) => setModel((prev) => ({ ...prev, [k]: v }));

  // ✅ si connecté après coup
  useEffect(() => {
    if (!model.user_id && meId) setModel((p) => ({ ...p, user_id: meId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  // lock scroll on modal
  useEffect(() => {
    if (isEditorModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [isEditorModalOpen]);

  // preview locale avatar
  useEffect(() => {
    if (avatarFile) {
      if (lastAvatarUrlRef.current)
        URL.revokeObjectURL(lastAvatarUrlRef.current);
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

  // load parents
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/orgnodes", {
          params: { all: 1, per_page: 2000 },
        });
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setParents(list);
      } catch {
        // silent
      }
    })();
  }, []);

  // load admin users (picker)
  useEffect(() => {
    if (!canAssignUserId) return;
    (async () => {
      try {
        const res = await api.get("/admin-users");
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setAdminUsers(list);
      } catch (e) {
        // si forbidden => on n'affiche pas le select
        setAdminUsers([]);
      }
    })();
  }, [canAssignUserId]);

  // load node if edit
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await api.get(`/orgnodes/${encodeURIComponent(id)}`);
        const data = res?.data || {};

        setModel({
          id: data.id ?? null,
          user_id:
            data.user_id != null ? String(data.user_id) : meId || "",
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
        });
      } catch (e) {
        setToast({
          open: true,
          msg: "Impossible de charger ce noeud (GET /orgnodes/:id).",
        });
      }
    })();
  }, [id, isEdit, meId]);

  /* ===============================
     PROGRESS BAR
  ================================= */
  useEffect(() => {
    let timer = null;
    if (isSubmitting) {
      setProgress(10);
      timer = setInterval(() => {
        setProgress((p) =>
          p < 90 ? p + Math.max(1, (90 - p) * 0.08) : 90
        );
      }, 250);
    } else {
      if (timer) clearInterval(timer);
      setProgress(100);
      setTimeout(() => setProgress(0), 400);
    }
    return () => timer && clearInterval(timer);
  }, [isSubmitting]);

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

  /* ===============================
     SUBMIT
  ================================= */
  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setIsSubmitting(true);
    setErrors({});
    try {
      const fd = new FormData();

      // ✅ required
      fd.append("title", model.title || "");

      // ✅ admin-only assignment; sinon Laravel forcera auth()->id()
      if (canAssignUserId) fd.append("user_id", String(model.user_id || ""));

      fd.append("parent_id", model.parent_id || "");
      fd.append("department", model.department || "");
      fd.append("badge", model.badge || "");
      fd.append("subtitle", model.subtitle || "");
      fd.append("bio", model.bio || "");
      fd.append("level", String(Number(model.level ?? 1)));
      fd.append("accent", model.accent || "");
      fd.append("sort_order", String(Number(model.sort_order ?? 0)));
      fd.append("pos_x", String(Number(model.pos_x ?? 0)));
      fd.append("pos_y", String(Number(model.pos_y ?? 0)));
      fd.append("is_active", model.is_active ? "1" : "0");

      if (avatarFile instanceof File) {
        fd.append("avatar", avatarFile, avatarFile.name);
      }

      let res;
      if (isEdit && model.id) {
        // update via PATCH (method override)
        res = await api.post(`/orgnodes/${model.id}?_method=PATCH`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // création
        res = await api.post("/orgnodes", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      const data = res?.data || {};
      setModel((prev) => ({ ...prev, ...(data || {}) }));
      showSuccess(isEdit ? "Noeud mis à jour ✅" : "Noeud créé ✅");

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
      }
    } catch (err) {
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
                {isEdit ? "Modifier un noeud (OrgNode)" : "Nouveau noeud (OrgNode)"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Titre requis • utilisateur assigné (admins uniquement) • hiérarchie •
                publication organigramme.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow ${
              !isValid || isSubmitting ? "bg-slate-400 cursor-not-allowed" : ""
            }`}
            style={
              !isValid || isSubmitting
                ? {}
                : { background: "linear-gradient(90deg,#11528f,#00a0d6)" }
            }
          >
            <FiSave className="w-4 h-4" />
            {isSubmitting ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Enregistrer"}
          </button>
        </div>
      </header>

      <main className="w-full px-4 lg:px-8 py-8 space-y-6 h-screen overflow-y-auto pb-64">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr] gap-6">
          {/* Col gauche */}
          <section className={`${card} p-6 space-y-6`}>
            {/* ✅ user_id admin-only + badge Moi */}
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
                    className={inputBase}
                    value={model.user_id || ""}
                    onChange={(e) => onChange("user_id", e.target.value)}
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
                    <FiUser className="w-3.5 h-3.5" />
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

            {/* ✅ title (required) */}
            <div className="space-y-2">
              <label className={sectionTitle}>
                <span className="flex items-center gap-2">
                  <FiTag className="w-4 h-4 text-emerald-600" />
                  Title <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                className={inputBase}
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
                  className={inputBase}
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
                  className={inputBase}
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
                className={inputBase}
                value={model.subtitle}
                onChange={(e) => onChange("subtitle", e.target.value)}
                placeholder='Ex. : "Direction générale", "Pôle Administratif"'
              />
              <FieldError name="subtitle" errors={errors} />
            </div>

            {/* Parent + order + level */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiGitBranch className="w-4 h-4 text-slate-700" />
                    Parent (hiérarchie)
                  </span>
                </label>
                <select
                  className={inputBase}
                  value={model.parent_id || ""}
                  onChange={(e) => onChange("parent_id", e.target.value)}
                >
                  <option value="">— Aucun (racine) —</option>
                  {parents
                    .filter((p) => String(p.id) !== String(model.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || `#${p.id}`}
                      </option>
                    ))}
                </select>
                <FieldError name="parent_id" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Sort order</label>
                <input
                  type="number"
                  className={inputBase}
                  value={model.sort_order}
                  onChange={(e) =>
                    onChange("sort_order", parseInt(e.target.value, 10) || 0)
                  }
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
                  className={inputBase}
                  value={model.level}
                  onChange={(e) =>
                    onChange("level", parseInt(e.target.value, 10) || 0)
                  }
                />
                <FieldError name="level" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>Accent</label>
                <select
                  className={inputBase}
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
                  className={inputBase}
                  value={model.pos_x}
                  onChange={(e) =>
                    onChange("pos_x", parseInt(e.target.value, 10) || 0)
                  }
                />
                <FieldError name="pos_x" errors={errors} />
              </div>

              <div className="space-y-2">
                <label className={sectionTitle}>pos_y</label>
                <input
                  type="number"
                  className={inputBase}
                  value={model.pos_y}
                  onChange={(e) =>
                    onChange("pos_y", parseInt(e.target.value, 10) || 0)
                  }
                />
                <FieldError name="pos_y" errors={errors} />
              </div>
            </div>

            {/* Bio + fullscreen */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={sectionTitle}>
                  <span className="flex items-center gap-2">
                    <FiAlignLeft className="w-4 h-4 text-slate-600" />
                    Bio / Description (rich texte)
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

              <RichTextEditor
                value={model.bio || ""}
                onChange={(html) => onChange("bio", html)}
                height={320}
              />

              <p className="text-[11px] text-slate-400 mt-0.5">
                {bioChars === 0 ? (
                  <span>Aucune bio pour l’instant.</span>
                ) : (
                  <>
                    {bioChars} caractère{bioChars > 1 && "s"} • environ {bioWords} mot
                    {bioWords > 1 && "s"} (texte brut)
                  </>
                )}
              </p>

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
            <div className="space-y-3">
              <label className={`${sectionTitle} flex items-center gap-2`}>
                <span className="p-1.5 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
                  <FiUpload className="w-4 h-4" />
                </span>
                Avatar / Photo (optionnel)
              </label>

              <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden min-h-[260px] flex flex-col items-center justify-center text-slate-500">
                {avatarPreview || model.avatar_path ? (
                  <img
                    src={
                      avatarPreview ||
                      (String(model.avatar_path || "").startsWith("http")
                        ? model.avatar_path
                        : model.avatar_path
                        ? `/storage/${String(model.avatar_path).replace(
                            /^storage\//,
                            ""
                          )}`
                        : "")
                    }
                    alt={model.title || "Avatar orgnode"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 text-center">
                    <FiUser className="w-10 h-10 text-slate-400" />
                    <p className="text-sm font-medium">
                      Dépose une photo ou clique pour sélectionner
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Recommandé : carré (ex. 800×800)
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
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <p className={hint}>
                <FiUser className="w-3.5 h-3.5 text-slate-400" />
                JPG/PNG/WebP – idéalement carré, pas trop lourd.
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
