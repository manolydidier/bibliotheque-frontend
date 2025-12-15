// src/pages/UserManagementDashboard/Components/Accueil/Contact.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiMail as FiMailIcon,
  FiSearch,
  FiNavigation,
  FiFilter,
} from "react-icons/fi";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../../../services/api";
import ContactForm from "./ContactForm";

const DEFAULT_CENTER = [-19.0, 47.0];
const DEFAULT_ZOOM = 6;

/* =========================
   Hook personnalisé pour debounce
========================= */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/* =========================
   Helpers pays / drapeau
========================= */
const COUNTRY_FLAGS = {
  madagascar: "🇲🇬",
  france: "🇫🇷",
  canada: "🇨🇦",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  "états-unis": "🇺🇸",
};

const getCountryFlag = (country) => {
  if (!country) return "🌍";
  const normalized = country.toLowerCase().trim();
  return COUNTRY_FLAGS[normalized] || "🌍";
};

/* =========================
   Helpers images
========================= */
const buildStorageBase = () => {
  const base =
    import.meta.env.VITE_API_BASE_STORAGE ||
    import.meta.env.VITE_API_BASE_URL ||
    "";
  return base.replace(/\/api\/?$/i, "").replace(/\/+$/i, "");
};

const isExternalUrl = (url) => {
  const str = String(url).trim();
  return (
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("/")
  );
};

const buildStorageUrl = (value, folder) => {
  if (!value) return "";
  const str = String(value).trim();
  if (isExternalUrl(str)) return str;

  const storageBase = buildStorageBase();
  return storageBase ? `${storageBase}/storage/${folder}/${str}` : "";
};

const buildSocieteLogoUrl = (value) => buildStorageUrl(value, "logos");
const buildBureauImageUrl = (value) => buildStorageUrl(value, "bureaux");

const SATELLITE_TILES_URL =
  import.meta.env.VITE_SATELLITE_TILE_URL ||
  "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";

/* =========================
   Helpers société
========================= */
const getSocieteLabelFromBureau = (b) =>
  b.societe?.sigle ||
  b.societe?.nom ||
  (b.societe?.id ? `Société #${b.societe.id}` : "Société inconnue");

/* =========================
   Composant : Contrôle de zoom automatique
========================= */
const MapViewController = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.5 });
  }, [map, center, zoom]);

  return null;
};

/* =========================
   Composant : Icône de marqueur personnalisée avec clustering visuel
========================= */
const createSocieteIcon = (societe, isCluster = false, count = 1) => {
  const url = buildSocieteLogoUrl(societe?.logo_url);
  const label =
    societe?.sigle?.trim()?.charAt(0) ||
    societe?.nom?.trim()?.charAt(0) ||
    "B";

  if (isCluster) {
    return L.divIcon({
      html: `
        <div class="mm-marker-wrapper">
          <div class="mm-marker-cluster">
            <span class="mm-cluster-count">${count}</span>
          </div>
        </div>
      `,
      className: "",
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -38],
    });
  }

  const html = url
    ? `
      <div class="mm-marker-wrapper">
        <div class="mm-marker-circle">
          <img src="${url}" alt="" class="mm-marker-img" />
        </div>
      </div>
    `
    : `
      <div class="mm-marker-wrapper">
        <div class="mm-marker-circle">
          <span class="mm-marker-initial">${label}</span>
        </div>
      </div>
    `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });
};

/* =========================
   Composant : Carte des bureaux avec actions rapides
========================= */
const BureauMarker = ({ bureau }) => {
  const lat = parseFloat(bureau.latitude);
  const lng = parseFloat(bureau.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const icon = createSocieteIcon(bureau.societe);
  const logoUrl = buildSocieteLogoUrl(bureau.societe?.logo_url);
  const bureauImageUrl = buildBureauImageUrl(bureau.image_url);
  const societeLabel = getSocieteLabelFromBureau(bureau);
  const flag = getCountryFlag(bureau.country);

  const handleGetDirections = () => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup maxWidth={280} className="contact-popup">
        <div className="w-full max-w-[250px] text-slate-100 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/70 border border-sky-400/70 text-[10px] font-medium uppercase tracking-[0.16em] text-sky-100">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Bureau
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-200 font-medium">
              <span>{flag}</span>
              <span className="truncate max-w-[120px]">
                {bureau.city}, {bureau.country}
              </span>
            </span>
          </div>

          {/* Logo + nom + société */}
          <div className="flex gap-3 mb-2">
            {logoUrl && (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-sky-500/70 bg-slate-950/70">
                <img
                  src={logoUrl}
                  alt={societeLabel}
                  className="w-full h-full object-contain p-1.5"
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-50 leading-snug truncate">
                {bureau.name || "Bureau"}
              </h3>
              {bureau.societe && (
                <p className="mt-1 text-[11px] text-slate-200/90 leading-snug truncate">
                  {societeLabel}
                </p>
              )}
            </div>
          </div>

          {/* Image du bureau */}
          {bureauImageUrl && (
            <div className="mb-2 rounded-xl overflow-hidden border border-slate-600/70 bg-slate-900/70">
              <img
                src={bureauImageUrl}
                alt={bureau.name || "Photo du bureau"}
                className="w-full h-24 object-cover"
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
          )}

          {/* Infos contact */}
          <div className="mt-2 space-y-1.5 text-[11px] text-slate-100/95">
            {bureau.address && (
              <div className="flex items-start gap-1.5">
                <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-950/80 flex items-center justify-center border border-sky-500/60 flex-shrink-0">
                  <FiMapPin className="h-3 w-3 text-sky-300" />
                </div>
                <span className="break-words">
                  {bureau.address}
                  {bureau.city && `, ${bureau.city}`}
                </span>
              </div>
            )}
            {bureau.phone && (
              <div className="flex items-start gap-1.5">
                <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-950/80 flex items-center justify-center border border-sky-500/60 flex-shrink-0">
                  <FiPhone className="h-3 w-3 text-sky-300" />
                </div>
                <a
                  href={`tel:${bureau.phone.replace(/\s+/g, "")}`}
                  className="hover:text-sky-200 transition-colors break-words"
                >
                  {bureau.phone}
                </a>
              </div>
            )}
            {bureau.email && (
              <div className="flex items-start gap-1.5">
                <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-950/80 flex items-center justify-center border border-sky-500/60 flex-shrink-0">
                  <FiMailIcon className="h-3 w-3 text-sky-300" />
                </div>
                <a
                  href={`mailto:${bureau.email}`}
                  className="hover:text-sky-200 break-all transition-colors"
                >
                  {bureau.email}
                </a>
              </div>
            )}
          </div>

          {/* Texte aide */}
          <div className="mt-3 pt-2 border-t border-slate-600/70">
            <p className="text-[10px] text-slate-300/90 leading-snug">
              Utilisez ce bureau comme point d&apos;entrée pour vos démarches
              avec la SAF/FJKM et partenaires.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleGetDirections}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-600"
              title="Obtenir l'itinéraire"
            >
              <FiNavigation className="h-3 w-3" />
              Itinéraire
            </button>
            <Link
              to={`/bureaux-public/${bureau.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#1690FF] text-white hover:bg-[#1378d6] transition-colors shadow-lg hover:shadow-xl"
            >
              Voir la fiche
            </Link>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

/* =========================
   Composant principal
========================= */
export default function ContactPage() {
  const [bureaux, setBureaux] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef(null);

  // Debounce de la recherche pour meilleures performances
  const debouncedSearch = useDebounce(search, 300);

  // Chargement des bureaux avec gestion du cache
  useEffect(() => {
    let mounted = true;

    // Vérifier le cache local (valide 5 minutes)
    const cachedData = localStorage.getItem("bureaux-map-cache");
    const cacheTime = localStorage.getItem("bureaux-map-cache-time");
    const now = Date.now();

    if (
      cachedData &&
      cacheTime &&
      now - parseInt(cacheTime, 10) < 5 * 60 * 1000
    ) {
      try {
        const parsed = JSON.parse(cachedData);
        setBureaux(parsed);
        console.log("Bureaux chargés depuis le cache");
        return;
      } catch (e) {
        console.warn("Cache invalide, rechargement...");
      }
    }

    setMapLoading(true);
    setMapError("");

    api
      .get("/public/bureaux-map")
      .then((res) => {
        if (!mounted) return;
        const list = res?.data?.data || [];
        setBureaux(list);

        // Mise en cache
        try {
          localStorage.setItem("bureaux-map-cache", JSON.stringify(list));
          localStorage.setItem("bureaux-map-cache-time", now.toString());
        } catch (e) {
          console.warn("Impossible de mettre en cache:", e);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Erreur chargement bureaux map", err);
        setMapError(
          "Impossible de charger les bureaux sur la carte pour le moment."
        );
      })
      .finally(() => {
        if (mounted) setMapLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Extraire les pays uniques pour le filtre
  const countries = useMemo(() => {
    const uniqueCountries = [
      ...new Set(bureaux.map((b) => b.country).filter(Boolean)),
    ];
    return uniqueCountries.sort();
  }, [bureaux]);

  // Filtrage optimisé avec debounce
  const filteredBureaux = useMemo(() => {
    let result = bureaux;

    // Filtre par pays
    if (selectedCountry !== "all") {
      result = result.filter((b) => b.country === selectedCountry);
    }

    // Filtre par recherche (debounced)
    const trimmedSearch = debouncedSearch.trim();
    if (trimmedSearch) {
      const q = trimmedSearch.toLowerCase();
      result = result.filter((b) => {
        const searchFields = [
          b.name,
          b.city,
          b.country,
          getSocieteLabelFromBureau(b),
          b.address,
        ];

        return searchFields.some((field) => field?.toLowerCase().includes(q));
      });
    }

    return result;
  }, [bureaux, debouncedSearch, selectedCountry]);

  // Centre de la carte
  const mapCenter = useMemo(() => {
    if (!filteredBureaux.length) return DEFAULT_CENTER;

    const validCoords = filteredBureaux
      .map((b) => [parseFloat(b.latitude), parseFloat(b.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (!validCoords.length) return DEFAULT_CENTER;

    const avgLat =
      validCoords.reduce((sum, [lat]) => sum + lat, 0) / validCoords.length;
    const avgLng =
      validCoords.reduce((sum, [, lng]) => sum + lng, 0) / validCoords.length;

    return [avgLat, avgLng];
  }, [filteredBureaux]);

  // Zoom dynamique
  const mapZoom = useMemo(() => {
    if (!filteredBureaux.length) return DEFAULT_ZOOM;

    const coords = filteredBureaux
      .map((b) => [parseFloat(b.latitude), parseFloat(b.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (!coords.length) return DEFAULT_ZOOM;

    const lats = coords.map(([lat]) => lat);
    const lngs = coords.map(([, lng]) => lng);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);

    if (latSpan < 1.0 && lngSpan < 1.0) return 11;
    if (latSpan < 2.5 && lngSpan < 2.5) return 9;
    if (latSpan < 4.5 && lngSpan < 4.5) return 8;
    return 7;
  }, [filteredBureaux]);

  const handleSearchClear = useCallback(() => {
    setSearch("");
  }, []);

  const handleCountryChange = useCallback((country) => {
    setSelectedCountry(country);
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setSelectedCountry("all");
  }, []);

  // Statistiques des bureaux
  const stats = useMemo(() => {
    return {
      total: bureaux.length,
      filtered: filteredBureaux.length,
      countries: countries.length,
      withPhone: filteredBureaux.filter((b) => b.phone).length,
      withEmail: filteredBureaux.filter((b) => b.email).length,
    };
  }, [bureaux, filteredBureaux, countries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-col items-center text-center gap-3 md:gap-4">
            <div className="w-11 h-11 md:w-12 md:h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-blue-100">
              <FiMail className="text-blue-600 text-lg md:text-xl" />
            </div>

            <p className="text-[11px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">
              Nous écrire / nous joindre
            </p>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">
              Contact &amp; bureaux
            </h1>

            <div className="w-32 h-1 bg-slate-900 mx-auto" />

            <p className="text-xs md:text-sm text-slate-600 max-w-xl mx-auto">
              Une question, une demande de collaboration ou un besoin spécifique
              ? Envoyez-nous un message, nous revenons vers vous rapidement.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)] gap-6 lg:gap-8 items-stretch">
          {/* Formulaire */}
          <div className="h-full">
            <ContactForm />
          </div>

          {/* Carte */}
          <aside className="flex flex-col h-full">
            <div className="h-full bg-slate-950/75 backdrop-blur-3xl text-slate-50 rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col border border-sky-500/25 shadow-[0_18px_50px_rgba(15,23,42,0.35)] relative overflow-hidden">
              {/* Halo glassy */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.23),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(94,234,212,0.18),transparent_55%)] opacity-70" />

              {/* En-tête + recherche */}
              <div className="mb-4 relative z-10">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                  localisation
                </p>
                <h2 className="text-lg sm:text-xl font-semibold mb-1 bg-gradient-to-r from-sky-200 via-[#38bdf8] to-teal-200 bg-clip-text text-transparent">
                  Nos bureaux à Madagascar
                </h2>
                <p className="text-xs sm:text-sm text-slate-200/90">
                  Localisez nos sièges et antennes sur la carte. Cliquez sur un
                  marqueur pour afficher les détails.
                </p>

                {/* Barre de recherche et filtres améliorés */}
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher (nom, ville, adresse…)"
                        className="w-full rounded-full border border-sky-500/40 bg-slate-900/70 px-3.5 py-2 pl-9 pr-10 text-[11px] sm:text-xs text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40 backdrop-blur transition-all"
                        aria-label="Rechercher des bureaux"
                      />
                      {search && (
                        <button
                          onClick={handleSearchClear}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                          aria-label="Effacer la recherche"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      onClick={toggleFilters}
                      className={`px-3 py-2 rounded-full border transition-all ${
                        showFilters
                          ? "bg-sky-500/20 border-sky-400/70 text-sky-200"
                          : "bg-slate-900/70 border-sky-500/40 text-slate-400 hover:text-slate-200"
                      }`}
                      aria-label="Afficher les filtres"
                      title="Filtres"
                    >
                      <FiFilter className="text-sm" />
                    </button>
                  </div>

                  {/* Panneau de filtres */}
                  {showFilters && (
                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-sky-500/30 backdrop-blur animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                          Filtrer par pays
                        </p>
                        {(selectedCountry !== "all" || search) && (
                          <button
                            onClick={clearAllFilters}
                            className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                          >
                            Réinitialiser
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleCountryChange("all")}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                            selectedCountry === "all"
                              ? "bg-sky-500 text-white"
                              : "bg-slate-800/70 text-slate-300 hover:bg-slate-700/70"
                          }`}
                        >
                          Tous ({bureaux.length})
                        </button>
                        {countries.map((country) => {
                          const count = bureaux.filter(
                            (b) => b.country === country
                          ).length;
                          const flag = getCountryFlag(country);
                          return (
                            <button
                              key={country}
                              onClick={() => handleCountryChange(country)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                                selectedCountry === country
                                  ? "bg-sky-500 text-white"
                                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-700/70"
                              }`}
                            >
                              {flag} {country} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Statistiques */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {stats.filtered} bureau
                      {stats.filtered > 1 ? "x" : ""} trouvé
                      {stats.filtered > 1 ? "s" : ""}
                      {stats.filtered !== stats.total &&
                        ` sur ${stats.total}`}
                    </span>
                    <div className="flex gap-3">
                      {stats.withPhone > 0 && (
                        <span className="flex items-center gap-1">
                          <FiPhone className="h-2.5 w-2.5" />
                          {stats.withPhone}
                        </span>
                      )}
                      {stats.withEmail > 0 && (
                        <span className="flex items-center gap-1">
                          <FiMailIcon className="h-2.5 w-2.5" />
                          {stats.withEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {mapError && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-300">
                    {mapError}
                  </div>
                )}
              </div>

              {/* Carte Leaflet */}
              <div className="relative flex-1 h-full min-h-[420px] lg:min-h-[520px] rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/70 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
                <style>{`
                  .contact-map .leaflet-popup-content-wrapper {
                    background:
                      radial-gradient(circle at 0% 0%, rgba(56,189,248,0.26), transparent 52%),
                      radial-gradient(circle at 100% 100%, rgba(16,185,129,0.24), transparent 55%),
                      rgba(15,23,42,0.9);
                    color: #e5e7eb;
                    border-radius: 1rem;
                    border: 1px solid rgba(148,163,184,0.75);
                    box-shadow: 0 22px 50px rgba(15,23,42,0.9);
                    padding: 0;
                    backdrop-filter: blur(18px);
                    -webkit-backdrop-filter: blur(18px);
                  }
                  .contact-map .leaflet-popup-content {
                    margin: 0.55rem 0.7rem 0.8rem;
                    width: 268px;
                  }
                  .contact-map .leaflet-popup-tip {
                    background: rgba(15,23,42,0.9);
                    border: 1px solid rgba(148,163,184,0.75);
                  }
                  .contact-map .leaflet-popup-close-button {
                    color: #e5e7eb;
                    font-weight: 700;
                    text-shadow: 0 0 8px rgba(15,23,42,0.9);
                  }
                  .mm-marker-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .mm-marker-circle {
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.96);
                    border: 1px solid rgba(37,99,235,0.18);
                    box-shadow:
                      0 8px 18px rgba(15,23,42,0.55),
                      0 0 0 2px rgba(15,23,42,0.75);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    transition: transform 0.2s ease;
                  }
                  .mm-marker-circle:hover {
                    transform: scale(1.1);
                  }
                  .mm-marker-cluster {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(56,189,248,0.95), rgba(14,165,233,0.95));
                    border: 2px solid rgba(255,255,255,0.9);
                    box-shadow:
                      0 10px 25px rgba(15,23,42,0.7),
                      0 0 0 3px rgba(15,23,42,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s ease;
                  }
                  .mm-marker-cluster:hover {
                    transform: scale(1.15);
                  }
                  .mm-cluster-count {
                    font-size: 13px;
                    font-weight: 800;
                    color: white;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  }
                  .mm-marker-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    padding: 3px;
                  }
                  .mm-marker-initial {
                    font-size: 12px;
                    font-weight: 700;
                    color: #0f172a;
                  }
                  @keyframes slide-in-from-top-2 {
                    from {
                      opacity: 0;
                      transform: translateY(-8px);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0);
                    }
                  }
                  .animate-in {
                    animation: slide-in-from-top-2 0.2s ease-out;
                  }
                `}</style>

                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={true}
                  className="h-full w-full contact-map"
                  zoomControl={true}
                  ref={mapRef}
                >
                  <MapViewController center={mapCenter} zoom={mapZoom} />

                  <LayersControl position="topright">
                    <LayersControl.BaseLayer
                      checked
                      name="Plan (OpenStreetMap)"
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Vue satellite">
                      <TileLayer
                        attribution="&copy; Imagerie satellite"
                        url={SATELLITE_TILES_URL}
                        subdomains={["mt0", "mt1", "mt2", "mt3"]}
                      />
                    </LayersControl.BaseLayer>
                  </LayersControl>

                  {filteredBureaux.map((bureau) => (
                    <BureauMarker key={bureau.id} bureau={bureau} />
                  ))}
                </MapContainer>

                {/* Badge flottant */}
                <div className="pointer-events-none absolute top-3 left-3 px-3 py-1.5 rounded-full text-[11px] font-medium bg-slate-950/80 border border-sky-400/60 backdrop-blur-sm flex items-center gap-2 shadow-[0_10px_30px_rgba(15,23,42,0.7)]">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      mapLoading
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-emerald-400"
                    }`}
                  />
                  <span>
                    {mapLoading
                      ? "Chargement des bureaux…"
                      : `${filteredBureaux.length} bureau${
                          filteredBureaux.length > 1 ? "x" : ""
                        } affiché${
                          filteredBureaux.length > 1 ? "s" : ""
                        }`}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
