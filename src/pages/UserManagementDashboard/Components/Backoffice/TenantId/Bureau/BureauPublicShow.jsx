// src/pages/bureaux/BureauPublicShow.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiMapPin,
  FiPhone,
  FiMail,
  FiArrowLeft,
  FiArrowRight,
  FiHome,
  FiSearch,
  FiGlobe,
  FiX,
} from "react-icons/fi";
import api from "../../../../../../services/api";

/* ---------- CSS personnalisé pour scrollbar ---------- */
const customScrollbarStyle = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(14, 116, 144, 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(56, 189, 248, 0.4);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(56, 189, 248, 0.6);
  }
`;

// Injection du style
if (typeof document !== 'undefined') {
  const styleId = 'custom-scrollbar-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = customScrollbarStyle;
    document.head.appendChild(style);
  }
}

/* ---------- Helpers pour les URLs d'images ---------- */

const buildImageUrl = (value, folder = "bureaux") => {
  if (!value) return "";

  const s = String(value).trim();

  if (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("/")
  ) {
    return s;
  }

  const storageBase = (
    import.meta.env.VITE_API_BASE_STORAGE ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
  )
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");

  return storageBase ? `${storageBase}/storage/${folder}/${s}` : "";
};

const buildSocieteLogoUrl = (value) => buildImageUrl(value, "logos");
const buildBureauImageUrl = (value) => buildImageUrl(value, "bureaux");

/* ---------- Helpers statuts ---------- */

const toBool = (value) => {
  if (value === undefined || value === null) return null;
  return value === true || value === 1 || value === "1";
};

const isPrimaryFlag = (b) => toBool(b?.is_primary) === true;
const isActiveFlag = (b) => {
  const active = toBool(b?.is_active);
  return active === null ? true : active;
};

/* ---------- Composant Info Row ---------- */

const InfoRow = ({ icon: Icon, label, children, href, emptyText = "Non renseigné" }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors group">
    <div className="mt-0.5 p-2 rounded-lg bg-sky-500/10 group-hover:bg-sky-500/20 transition-colors">
      <Icon className="w-4 h-4 text-sky-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
        {label}
      </p>
      {children || (href ? (
        <a
          href={href}
          className="text-sm text-slate-800 hover:text-sky-600 transition-colors break-all font-medium"
        >
          {href.replace(/^(tel:|mailto:)/, "")}
        </a>
      ) : (
        <p className="text-sm italic text-slate-400">{emptyText}</p>
      ))}
    </div>
  </div>
);

/* ---------- Composant Badge ---------- */

const Badge = ({ variant = "default", children }) => {
  const variants = {
    primary: "bg-indigo-500/10 text-indigo-700 border-indigo-300",
    inactive: "bg-rose-500/10 text-rose-700 border-rose-300",
    current: "bg-sky-500/20 text-sky-100 border-sky-400/70",
    default: "bg-slate-900/5 text-slate-700 border-slate-200",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
};

/* ---------- Composant Bureau Card ---------- */

const BureauCard = ({ bureau, currentBureauId, onNavigate }) => {
  const thumbUrl = bureau.image_url ? buildBureauImageUrl(bureau.image_url) : "";
  const isCurrent = String(bureau.id) === String(currentBureauId);
  const isPrimary = isPrimaryFlag(bureau);
  const isActive = isActiveFlag(bureau);

  const cardClasses = `block rounded-xl px-4 py-3.5 text-xs sm:text-[13px] flex items-start justify-between gap-3 transition-all duration-200 ${
    isCurrent
      ? "border-2 border-sky-400 bg-sky-800/60 ring-2 ring-sky-300/40 shadow-lg cursor-default"
      : "border border-sky-800/60 bg-sky-900/40 hover:border-sky-400/80 hover:bg-sky-800/50 hover:shadow-md cursor-pointer hover:-translate-y-0.5"
  }`;

  const content = (
    <>
      <div className="flex items-start gap-3 w-full min-w-0">
        {/* Vignette améliorée */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-sky-500/50 bg-gradient-to-br from-sky-900 to-slate-900 flex items-center justify-center shadow-md">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={bureau.name || "Bureau"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <FiHome className="w-5 h-5 text-sky-300" />
          )}
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-sky-50 truncate text-sm">
              {bureau.name || "Bureau"}
            </p>
            {isCurrent && <Badge variant="current">Actuel</Badge>}
            {isPrimary && <Badge variant="primary">Principal</Badge>}
            {!isActive && <Badge variant="inactive">Inactif</Badge>}
          </div>

          <div className="flex items-start gap-2 text-[11px]">
            <FiMapPin className="mt-0.5 w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span className="text-sky-200/90 line-clamp-2">
              {bureau.address || bureau.city || bureau.country ? (
                <>
                  {bureau.address && `${bureau.address}, `}
                  {bureau.city}
                  {bureau.country && ` (${bureau.country})`}
                </>
              ) : (
                <span className="italic text-sky-400/75">
                  Adresse non renseignée
                </span>
              )}
            </span>
          </div>

          {(bureau.phone || bureau.email) && (
            <div className="flex items-center gap-2 text-[11px] text-sky-300/90">
              {bureau.phone && (
                <div className="flex items-center gap-1">
                  <FiPhone className="w-3 h-3" />
                  <span className="truncate">{bureau.phone}</span>
                </div>
              )}
              {bureau.phone && bureau.email && (
                <span className="text-sky-600">•</span>
              )}
              {bureau.email && (
                <div className="flex items-center gap-1 min-w-0">
                  <FiMail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{bureau.email}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-1 flex-shrink-0">
        {!isCurrent && (
          <div className="p-1.5 rounded-lg bg-sky-700/30 group-hover:bg-sky-600/40 transition-colors">
            <FiArrowRight className="w-4 h-4 text-sky-300" />
          </div>
        )}
      </div>
    </>
  );

  if (isCurrent) {
    return (
      <div className={cardClasses} aria-current="true">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/bureaux-public/${bureau.id}`}
      className={cardClasses}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
};

/* ---------- Composant Principal ---------- */

export default function BureauPublicShow() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // États pour la recherche et le tri
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("default");

  // Chargement des données
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.get(`/public/bureaux/${id}`);
        setData(res.data);
      } catch (e) {
        console.error("Erreur chargement bureau public", e);
        setError(
          e.response?.status === 404
            ? "Ce bureau n'existe pas ou n'est plus disponible."
            : "Impossible de charger les informations de ce bureau pour le moment."
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  // Réinitialisation de la recherche lors du changement de bureau
  useEffect(() => {
    setSearchTerm("");
  }, [id]);

  // Préparation des données avec useMemo
  const { bureau, societe, allBureaux } = useMemo(() => {
    if (!data) return { bureau: null, societe: null, allBureaux: [] };

    const { bureau, societe, other_bureaux } = data;

    // Dédoublonnage des bureaux
    const allBureauxRaw = [
      ...(bureau ? [bureau] : []),
      ...(Array.isArray(other_bureaux) ? other_bureaux : []),
    ];

    const uniqueBureaux = allBureauxRaw.filter(
      (b, idx, arr) =>
        idx === arr.findIndex((x) => String(x.id) === String(b.id))
    );

    return { bureau, societe, allBureaux: uniqueBureaux };
  }, [data]);

  // Filtrage et tri avec useMemo
  const filteredAndSortedBureaux = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    // Filtrage
    const filtered =
      normalized === ""
        ? allBureaux
        : allBureaux.filter((b) => {
            const haystack = [
              b.name,
              b.type,
              b.address,
              b.city,
              b.country,
              b.phone,
              b.email,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return haystack.includes(normalized);
          });

    // Tri
    const sorted = [...filtered];

    switch (sortKey) {
      case "name":
        sorted.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", "fr", {
            sensitivity: "base",
          })
        );
        break;
      case "city":
        sorted.sort((a, b) =>
          (a.city || "").localeCompare(b.city || "", "fr", {
            sensitivity: "base",
          })
        );
        break;
      case "primary":
        sorted.sort((a, b) => {
          const ap = isPrimaryFlag(a) ? 0 : 1;
          const bp = isPrimaryFlag(b) ? 0 : 1;
          if (ap !== bp) return ap - bp;
          return (a.name || "").localeCompare(b.name || "", "fr", {
            sensitivity: "base",
          });
        });
        break;
      default:
        // Ordre d'origine
        break;
    }

    return sorted;
  }, [allBureaux, searchTerm, sortKey]);

  // Callback pour réinitialiser la recherche
  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  // États de chargement et d'erreur
  if (isLoading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
        <div className="px-4 py-3 bg-white rounded-2xl shadow border border-slate-200 text-sm text-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            Chargement de la fiche bureau…
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 px-4">
        <div className="px-6 py-4 bg-red-50 rounded-2xl shadow border border-red-200 text-sm text-red-700 max-w-md text-center space-y-3">
          <p className="font-semibold">Une erreur est survenue</p>
          <p>{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-red-600 hover:text-red-800 font-medium"
          >
            <FiArrowLeft className="w-3.5 h-3.5" />
            Retour à la carte
          </Link>
        </div>
      </div>
    );
  }

  if (!bureau) return null;

  const societeLogoUrl = societe?.logo_url
    ? buildSocieteLogoUrl(societe.logo_url)
    : "";
  const bureauImageUrl = bureau?.image_url
    ? buildBureauImageUrl(bureau.image_url)
    : "";

  const isPrimaryGlobal = isPrimaryFlag(bureau);
  const isActiveGlobal = isActiveFlag(bureau);

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 text-slate-900 px-4 py-10">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* En-tête : Retour + Info société */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Retour à la carte
          </Link>

          {societe && (
            <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-slate-500">
              <span className="uppercase tracking-[0.18em]">
                société rattachée
              </span>
              {societeLogoUrl && (
                <img
                  src={societeLogoUrl}
                  alt={societe.nom}
                  className="h-6 w-6 rounded-md object-contain bg-white border border-slate-200"
                />
              )}
            </div>
          )}
        </div>

        {/* Bandeau titre principal */}
        <header className="bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-sm px-5 py-4 sm:px-7 sm:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl blur opacity-50" />
              <div className="relative p-2.5 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow">
                <FiHome className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 tracking-tight">
                  {bureau.name || "Bureau"}
                </h1>
                {isPrimaryGlobal && <Badge variant="primary">Bureau principal</Badge>}
                {!isActiveGlobal && <Badge variant="inactive">Inactif</Badge>}
              </div>

              <p className="mt-0.5 text-xs sm:text-sm text-slate-600 flex items-center gap-1.5">
                <FiMapPin className="w-3.5 h-3.5 text-sky-500" />
                <span>
                  {bureau.address || bureau.city || bureau.country ? (
                    <>
                      {bureau.address && `${bureau.address}, `}
                      {bureau.city}
                      {bureau.country && ` (${bureau.country})`}
                    </>
                  ) : (
                    <span className="italic text-slate-400">
                      Adresse non renseignée
                    </span>
                  )}
                </span>
              </p>
            </div>
          </div>

          {societe && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Société
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {societe.nom}
                </p>
                {societe.sigle && (
                  <p className="text-xs text-slate-500">{societe.sigle}</p>
                )}
              </div>
              {societeLogoUrl && (
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                  <img
                    src={societeLogoUrl}
                    alt={societe.nom}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </header>

        {/* Image du bureau */}
        {bureauImageUrl && (
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="w-full h-52 sm:h-64 md:h-72 bg-slate-100">
              <img
                src={bureauImageUrl}
                alt={bureau.name || "Photo du bureau"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        {/* Contenu principal : fiche + liste */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-5 items-start">
          {/* Fiche détaillée du bureau */}
          <section className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-lg px-6 py-6 sm:px-8 sm:py-7 space-y-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                  <FiHome className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-0.5">
                    Fiche détaillée
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    Bureau sélectionné
                  </p>
                </div>
              </div>
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="grid grid-cols-1 gap-5 text-sm">
              {/* Coordonnées & contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-600">
                    Coordonnées & contact
                  </p>
                  <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50/30 px-4 py-4 shadow-sm">
                  <InfoRow icon={FiMapPin} label="Adresse">
                    <p className="text-slate-800">
                      {bureau.address || bureau.city || bureau.country ? (
                        <>
                          {bureau.address && `${bureau.address}, `}
                          {bureau.city}
                          {bureau.country && ` (${bureau.country})`}
                        </>
                      ) : (
                        <span className="italic text-slate-400">
                          Non renseignée
                        </span>
                      )}
                    </p>
                  </InfoRow>

                  <InfoRow
                    icon={FiPhone}
                    label="Téléphone"
                    href={bureau.phone ? `tel:${String(bureau.phone).replace(/\s+/g, "")}` : null}
                  />

                  <InfoRow
                    icon={FiMail}
                    label="Email"
                    href={bureau.email ? `mailto:${bureau.email}` : null}
                  />
                </div>
              </div>

              {/* Informations techniques */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-600">
                    Informations techniques
                  </p>
                  <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/20 px-4 py-4 shadow-sm">
                  <InfoRow icon={FiHome} label="Type de bureau">
                    <p className="text-slate-800">
                      {bureau.type || (
                        <span className="italic text-slate-400">
                          Non renseigné
                        </span>
                      )}
                    </p>
                  </InfoRow>

                  <InfoRow icon={FiGlobe} label="Coordonnées GPS">
                    {bureau.latitude == null && bureau.longitude == null ? (
                      <p className="italic text-slate-400">Non renseignées</p>
                    ) : (
                      <p className="text-slate-800 text-xs">
                        Latitude :{" "}
                        {bureau.latitude ?? (
                          <span className="italic text-slate-400">—</span>
                        )}
                        <br />
                        Longitude :{" "}
                        {bureau.longitude ?? (
                          <span className="italic text-slate-400">—</span>
                        )}
                      </p>
                    )}
                  </InfoRow>

                  <InfoRow icon={FiHome} label="Statuts">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="default">
                        Principal :{" "}
                        <span className="ml-1 font-semibold">
                          {isPrimaryGlobal ? "Oui" : "Non"}
                        </span>
                      </Badge>
                      <Badge variant="default">
                        Statut :{" "}
                        <span className="ml-1 font-semibold">
                          {isActiveGlobal ? "Actif" : "Inactif"}
                        </span>
                      </Badge>
                    </div>
                  </InfoRow>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-start gap-2 bg-slate-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-3xl sm:-mx-8 sm:-mb-7 sm:px-8">
              <div className="mt-0.5">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="flex-1">
                Pour mettre à jour ces informations, merci de contacter
                l'administrateur de la bibliothèque ou l'équipe SAF/FJKM.
              </p>
            </div>
          </section>

          {/* Liste des bureaux de la société */}
          <section className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 text-sky-50 rounded-3xl border border-sky-400/30 shadow-[0_20px_60px_rgba(2,132,199,0.15)] px-6 py-6 flex flex-col lg:sticky lg:top-28 max-h-[calc(100vh-8rem)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-sky-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg">
                  <FiHome className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-sky-400/90 mb-0.5">
                    Bureaux de la société
                  </p>
                  <h2 className="text-sm font-bold text-sky-100">
                    Réseau complet
                  </h2>
                </div>
              </div>
              {societe && (
                <div className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/40">
                  <span className="text-[11px] font-semibold text-sky-100">
                    {filteredAndSortedBureaux.length} / {allBureaux.length}
                  </span>
                </div>
              )}
            </div>

            {/* Recherche + Tri */}
            {allBureaux.length > 0 && (
              <div className="mb-4 space-y-2.5">
                {/* Barre de recherche */}
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-300 group-focus-within:text-sky-200 transition-colors">
                    <FiSearch className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher un bureau…"
                    className="w-full rounded-xl bg-sky-900/50 border border-sky-700/60 pl-10 pr-10 py-2.5 text-[13px] text-sky-50 placeholder:text-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 focus:bg-sky-900/70 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-300 hover:text-sky-100 transition-colors p-0.5 hover:bg-sky-800/50 rounded"
                      aria-label="Effacer la recherche"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Menu de tri */}
                <div className="flex items-center gap-2.5 text-[11px]">
                  <span className="text-sky-300/90 whitespace-nowrap font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    Trier par
                  </span>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="flex-1 rounded-xl bg-sky-900/50 border border-sky-700/60 px-3 py-2 text-[12px] text-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 focus:bg-sky-900/70 transition-all cursor-pointer"
                  >
                    <option value="default">Ordre d'origine</option>
                    <option value="name">Nom (A → Z)</option>
                    <option value="city">Ville (A → Z)</option>
                    <option value="primary">Bureaux principaux</option>
                  </select>
                </div>

                {searchTerm.trim() !== "" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-800/30 border border-sky-700/40">
                    <svg className="w-3.5 h-3.5 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <p className="text-[11px] text-sky-200/90 flex-1">
                      Filtré : <span className="font-semibold">"{searchTerm}"</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* États vides */}
            {allBureaux.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-[12px] text-sky-300/80 text-center">
                  Aucun bureau déclaré pour cette société pour le moment.
                </p>
              </div>
            )}

            {allBureaux.length > 0 && filteredAndSortedBureaux.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <p className="text-[12px] text-sky-300/80">
                    Aucun bureau ne correspond à votre recherche.
                  </p>
                  <button
                    onClick={clearSearch}
                    className="text-[11px] text-sky-400 hover:text-sky-200 underline"
                  >
                    Réinitialiser la recherche
                  </button>
                </div>
              </div>
            )}

            {/* Liste des bureaux */}
            {filteredAndSortedBureaux.length > 0 && (
              <div className="space-y-2.5 overflow-auto pr-2 flex-1 custom-scrollbar">
                {filteredAndSortedBureaux.map((b) => (
                  <BureauCard
                    key={b.id}
                    bureau={b}
                    currentBureauId={bureau.id}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-sky-800/50 text-[11px] text-sky-300/90 bg-sky-950/30 -mx-6 -mb-6 px-6 py-4 rounded-b-3xl">
              <div className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-sky-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="flex-1">
                  Sélectionnez un bureau pour ouvrir sa fiche détaillée.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}