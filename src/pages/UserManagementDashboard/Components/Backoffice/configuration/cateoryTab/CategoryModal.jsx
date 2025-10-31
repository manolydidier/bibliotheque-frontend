import React, { useEffect, useState, useCallback, useRef } from "react";
import * as Fa from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar, faBook, faLeaf, faHeart, faCoffee, faCamera, faGlobe, faMusic,
  faPen, faFilm, faFolder, faCode, faChartPie, faBriefcase, faCar,
  faLaptop, faGamepad, faShoppingCart, faBicycle, faPlane, faTree,
  faUserFriends, faHandshake, faBell, faFlag, faTools, faLightbulb,
  faMicrochip, faCloud, faGift
} from "@fortawesome/free-solid-svg-icons";
import { useCategories } from "./useCategory";

/* =========================================================
   Flash local minimaliste
========================================================= */
function useFlash() {
  const [flashes, setFlashes] = useState([]);
  const push = useCallback((type, message, ttl = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setFlashes((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setFlashes((f) => f.filter((x) => x.id !== id)), ttl);
  }, []);
  return { flashes, push };
}

function FlashStack({ flashes }) {
  if (!flashes.length) return null;
  return (
    <div className="pointer-events-none fixed top-5 right-5 z-[999] space-y-2">
      {flashes.map((f) => (
        <div
          key={f.id}
          className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg text-sm font-medium backdrop-blur-sm
            ${f.type === "error"
              ? "bg-red-50/95 border border-red-200 text-red-800"
              : "bg-green-50/95 border border-green-200 text-green-800"}`}
        >
          <Fa.FaInfoCircle />
          <span>{f.message}</span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   ColorPicker enrichi
========================================================= */
function ColorPickerPro({ value, onChange }) {
  const [color, setColor] = useState(value || "#3B82F6");
  const [open, setOpen] = useState(false);
  const presets = [
    "#3B82F6", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#64748B",
    "#1E40AF", "#D946EF", "#F97316", "#22C55E", "#EAB308", "#7C3AED", "#0891B2", "#B91C1C",
    "#475569", "#9CA3AF", "#14B8A6", "#E11D48"
  ];

  useEffect(() => setColor(value || "#3B82F6"), [value]);

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="w-5 h-5 rounded border" style={{ backgroundColor: color }} />
        <span>{color}</span>
        <Fa.FaChevronDown className="text-gray-400" />
      </div>

      {open && (
        <div className="absolute z-20 top-full mt-2 bg-white border border-gray-200 rounded-lg p-3 shadow-xl w-64">
          <div className="grid grid-cols-5 gap-2">
            {presets.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  onChange?.(c);
                  setOpen(false);
                }}
                className="w-7 h-7 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                onChange?.(e.target.value);
              }}
              className="w-8 h-8 border rounded cursor-pointer"
            />
            <span className="text-xs text-gray-500">{color}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ICON_MAP
========================================================= */
const ICON_MAP = {
  "fa-star": faStar,
  "fa-book": faBook,
  "fa-leaf": faLeaf,
  "fa-heart": faHeart,
  "fa-coffee": faCoffee,
  "fa-camera": faCamera,
  "fa-globe": faGlobe,
  "fa-music": faMusic,
  "fa-pen": faPen,
  "fa-film": faFilm,
  "fa-folder": faFolder,
  "fa-code": faCode,
  "fa-chart-pie": faChartPie,
  "fa-briefcase": faBriefcase,
  "fa-car": faCar,
  "fa-laptop": faLaptop,
  "fa-gamepad": faGamepad,
  "fa-shopping-cart": faShoppingCart,
  "fa-bicycle": faBicycle,
  "fa-plane": faPlane,
  "fa-tree": faTree,
  "fa-user-friends": faUserFriends,
  "fa-handshake": faHandshake,
  "fa-bell": faBell,
  "fa-flag": faFlag,
  "fa-tools": faTools,
  "fa-lightbulb": faLightbulb,
  "fa-microchip": faMicrochip,
  "fa-cloud": faCloud,
  "fa-gift": faGift,
};

/* =========================================================
   Aide: liste d'erreurs d'un champ (toutes les lignes)
========================================================= */
const FieldErrorList = ({ list }) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {list.map((msg, idx) => (
        <li key={idx} className="text-red-600 text-xs leading-snug">
          {msg}
        </li>
      ))}
    </ul>
  );
};

/* =========================================================
   Modal principal
========================================================= */
export default function CategoryModal({ isOpen, onClose, category, onSuccess }) {
  const { createCategory, updateCategory } = useCategories();
  const { flashes, push } = useFlash();
  const topRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "fa-folder",
  });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [saving, setSaving] = useState(false);
  const [shakeField, setShakeField] = useState("");
  const [shakeGlobal, setShakeGlobal] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        color: category.color || "#3B82F6",
        icon: category.icon || "fa-folder",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "fa-folder",
      });
    }
    setErrors({});
    setGlobalError("");
    setShakeField("");
  }, [category, isOpen]);

  if (!isOpen) return null;

  const pickFirstFieldError = (errsObj) => {
    if (!errsObj || typeof errsObj !== "object") return null;
    const k = Object.keys(errsObj)[0];
    return k || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setGlobalError("");
    setShakeField("");
    setShakeGlobal(false);

    try {
      if (category?.id) {
        await updateCategory(category.id, formData);
        push("success", "Catégorie mise à jour !");
      } else {
        await createCategory(formData);
        push("success", "Catégorie créée !");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const resp = err?.response;
      const data = resp?.data || {};

      if (resp?.status === 422) {
        // ✅ Bande rouge: message générique
        setGlobalError("Erreur de validation des champs.");
        // ✅ Toutes les erreurs par champ:
        const fieldErrs = (data && typeof data.errors === "object") ? data.errors : {};
        setErrors(fieldErrs);

        // Shake header + premier champ
        setShakeGlobal(true);
        setTimeout(() => setShakeGlobal(false), 500);

        const firstField = pickFirstFieldError(fieldErrs);
        if (firstField) {
          setShakeField(firstField);
          setTimeout(() => setShakeField(""), 600);
        }
      } else {
        // Autres erreurs : message serveur ou fallback
        const fallback = data?.message || err?.message || "Une erreur est survenue.";
        setGlobalError(fallback);
        setErrors({});
        setShakeGlobal(true);
        setTimeout(() => setShakeGlobal(false), 500);
      }

      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <FlashStack flashes={flashes} />

      {/* Fenêtre principale */}
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div
          ref={topRef}
          className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl p-6 animate-fade-in overflow-y-auto max-h-[90vh]"
        >
         

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {category?.id ? "Modifier la catégorie" : "Créer une catégorie"}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <Fa.FaTimes />
            </button>
          </div>
 {/* 🟥 Bande d’erreur principale (HEADER) */}
          {globalError && (
            <div
              className={`mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded ${
                shakeGlobal ? "animate-shake" : ""
              }`}
              role="alert"
              aria-live="assertive"
            >
              <strong className="font-bold">Erreur : </strong>
              <span className="block sm:inline">{globalError}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Champ NOM */}
            <div>
              <label className="text-sm font-medium text-gray-700">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={`w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:outline-none
                  ${errors.name
                    ? `border-red-500 bg-red-50 ${shakeField === "name" ? "animate-shake" : ""}`
                    : "border-gray-300"
                  }`}
                placeholder="Nom de la catégorie"
              />
              {/* ✅ Afficher TOUTES les erreurs du champ */}
              <FieldErrorList list={errors.name} />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:outline-none
                  ${errors.description ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                placeholder="Description"
              />
              <FieldErrorList list={errors.description} />
            </div>

            {/* Couleur */}
            <div>
              <label className="text-sm font-medium text-gray-700">Couleur</label>
              <ColorPickerPro
                value={formData.color}
                onChange={(color) => setFormData({ ...formData, color })}
              />
              <FieldErrorList list={errors.color} />
            </div>

            {/* Icône */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Icône</label>
              <div className={`grid grid-cols-8 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3
                ${errors.icon ? "border-red-500 bg-red-50" : "border-gray-200"}`}>
                {Object.entries(ICON_MAP).map(([key, icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: key })}
                    className={`p-2 border rounded-md flex items-center justify-center text-lg transition-all ${
                      formData.icon === key
                        ? "bg-blue-100 border-blue-500 text-blue-600"
                        : "bg-white border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <FontAwesomeIcon icon={icon} />
                  </button>
                ))}
              </div>
              {formData.icon && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <FontAwesomeIcon
                    icon={ICON_MAP[formData.icon] || faFolder}
                    className="text-blue-500 text-lg"
                  />
                  <span>{formData.icon}</span>
                </div>
              )}
              <FieldErrorList list={errors.icon} />
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-5 py-2 text-sm rounded-lg text-white ${
                  saving ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saving
                  ? "Enregistrement..."
                  : category?.id
                  ? "Mettre à jour"
                  : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Animation CSS locale si non définie dans Tailwind */}
      <style>{`
        @keyframes shake-kf {
          0% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
        .animate-shake {
          animation: shake-kf 0.28s linear 1;
        }
      `}</style>
    </>
  );
}
