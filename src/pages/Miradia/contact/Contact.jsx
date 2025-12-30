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
  FiGlobe,
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

import ContactForm from "./ContactForm";
import api from "../../../services/api";

/* =========================
   Couleurs MIRADIA (référence)
   #025C86 | #124B7C | #3AA6DC | #4CC051 | #FCCA00 | #1690FF
========================= */
const DEFAULT_CENTER = [-19.0, 47.0];
const DEFAULT_ZOOM = 6;

/* =========================
   Hook debounce
========================= */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
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
   Helpers images storage
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

/* Tiles */
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
   Map view controller
========================= */
const MapViewController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.5 });
  }, [map, center, zoom]);
  return null;
};

/* =========================
   Icon marker
========================= */
const createSocieteIcon = (societe) => {
  const url = buildSocieteLogoUrl(societe?.logo_url);
  const label =
    societe?.sigle?.trim()?.charAt(0) ||
    societe?.nom?.trim()?.charAt(0) ||
    "B";

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
   Marker bureau
========================= */
const BureauMarker = ({ bureau }) => {
  const lat = parseFloat(bureau.latitude);
  const lng = parseFloat(bureau.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

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

          <div className="mt-3 pt-2 border-t border-slate-600/70">
            <p className="text-[10px] text-slate-300/90 leading-snug">
              Utilisez ce bureau comme point d&apos;entrée pour vos démarches
              avec la SAF/FJKM et partenaires.
            </p>
          </div>

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
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white transition-colors shadow-lg hover:shadow-xl"
              style={{ background: "#1690FF" }}
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
   Page Contact (style “Domaines” + dark/light)
========================= */
export default function ContactPage() {
  const [bureaux, setBureaux] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let mounted = true;

    const cachedData = localStorage.getItem("bureaux-map-cache");
    const cacheTime = localStorage.getItem("bureaux-map-cache-time");
    const now = Date.now();

    if (cachedData && cacheTime && now - parseInt(cacheTime, 10) < 5 * 60 * 1000) {
      try {
        const parsed = JSON.parse(cachedData);
        setBureaux(parsed);
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
        setMapError("Impossible de charger les bureaux sur la carte pour le moment.");
      })
      .finally(() => {
        if (mounted) setMapLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const countries = useMemo(() => {
    const uniqueCountries = [...new Set(bureaux.map((b) => b.country).filter(Boolean))];
    return uniqueCountries.sort();
  }, [bureaux]);

  const filteredBureaux = useMemo(() => {
    let result = bureaux;

    if (selectedCountry !== "all") {
      result = result.filter((b) => b.country === selectedCountry);
    }

    const trimmedSearch = debouncedSearch.trim();
    if (trimmedSearch) {
      const q = trimmedSearch.toLowerCase();
      result = result.filter((b) => {
        const searchFields = [b.name, b.city, b.country, getSocieteLabelFromBureau(b), b.address];
        return searchFields.some((field) => field?.toLowerCase().includes(q));
      });
    }

    return result;
  }, [bureaux, debouncedSearch, selectedCountry]);

  const mapCenter = useMemo(() => {
    if (!filteredBureaux.length) return DEFAULT_CENTER;

    const validCoords = filteredBureaux
      .map((b) => [parseFloat(b.latitude), parseFloat(b.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (!validCoords.length) return DEFAULT_CENTER;

    const avgLat = validCoords.reduce((sum, [lat]) => sum + lat, 0) / validCoords.length;
    const avgLng = validCoords.reduce((sum, [, lng]) => sum + lng, 0) / validCoords.length;

    return [avgLat, avgLng];
  }, [filteredBureaux]);

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

  const handleSearchClear = useCallback(() => setSearch(""), []);
  const handleCountryChange = useCallback((country) => setSelectedCountry(country), []);
  const toggleFilters = useCallback(() => setShowFilters((prev) => !prev), []);
  const clearAllFilters = useCallback(() => {
    setSearch("");
    setSelectedCountry("all");
  }, []);

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
    <div className="relative min-h-screen overflow-x-hidden">
      {/* =========================
          Background (même style)
      ========================== */}
      <style>{`
        @keyframes miradiaIn {
          0% { opacity:0; transform: translate3d(0, 15px, 0); filter: blur(2px); }
          100% { opacity:1; transform: translate3d(0, 0, 0); filter: blur(0); }
        }
        .miradia-enter { animation: miradiaIn 700ms ease-out both; }

        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(18px,16px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-16px,22px)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(14px,-18px)} }

        @media (prefers-reduced-motion: reduce) {
          .miradia-enter { animation: none !important; }
          * { transition:none !important; animation:none !important; scroll-behavior:auto !important; }
        }

        /* Leaflet popup style (identique, mais clean) */
        .contact-map .leaflet-popup-content-wrapper {
          background:
            radial-gradient(circle at 0% 0%, rgba(58,189,248,0.26), transparent 52%),
            radial-gradient(circle at 100% 100%, rgba(16,185,129,0.24), transparent 55%),
            rgba(15,23,42,0.92);
          color: #e5e7eb;
          border-radius: 1rem;
          border: 1px solid rgba(148,163,184,0.75);
          box-shadow: 0 22px 50px rgba(15,23,42,0.9);
          padding: 0;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .contact-map .leaflet-popup-content { margin: 0.55rem 0.7rem 0.8rem; width: 268px; }
        .contact-map .leaflet-popup-tip {
          background: rgba(15,23,42,0.92);
          border: 1px solid rgba(148,163,184,0.75);
        }
        .contact-map .leaflet-popup-close-button { color:#e5e7eb; font-weight:700; }

        .mm-marker-wrapper { display:flex; align-items:center; justify-content:center; }
        .mm-marker-circle {
          width: 26px; height: 26px; border-radius: 50%;
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(37,99,235,0.18);
          box-shadow: 0 8px 18px rgba(15,23,42,0.55), 0 0 0 2px rgba(15,23,42,0.75);
          display:flex; align-items:center; justify-content:center; overflow:hidden;
          transition: transform 0.2s ease;
        }
        .mm-marker-circle:hover { transform: scale(1.1); }
        .mm-marker-img { width:100%; height:100%; object-fit:contain; padding:3px; }
        .mm-marker-initial { font-size:12px; font-weight:700; color:#0f172a; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Light */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/40 dark:opacity-0" />
        {/* Dark */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/35 to-slate-950 opacity-0 dark:opacity-100" />

        <div
          className="absolute -top-28 -left-28 h-[420px] w-[420px] rounded-full blur-3xl opacity-60 dark:opacity-35"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(58,166,220,0.45), transparent 62%)",
            animation: "float1 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-55 dark:opacity-30"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(76,192,81,0.40), transparent 64%)",
            animation: "float2 16s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-40 left-1/3 h-[620px] w-[620px] rounded-full blur-3xl opacity-45 dark:opacity-25"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(252,202,0,0.34), transparent 64%)",
            animation: "float3 18s ease-in-out infinite",
          }}
        />

        {/* Noise */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <main className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* =========================
            Header hero (style template)
        ========================== */}
        <section className="w-full miradia-enter">
          <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.16)]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, #025C86 0%, #124B7C 55%, #3AA6DC 100%)",
              }}
            />
            <div className="absolute inset-0 bg-black/15" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
              }}
            />

            <div className="relative px-6 py-14 md:py-20 text-center text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-6">
                <FiGlobe className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Plateforme MIRADIA
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
                CONTACT &amp; BUREAUX
              </h1>

              <div
                className="mx-auto mt-6 h-1.5 w-32 rounded-full"
                style={{ background: "linear-gradient(90deg, #4CC051, #FCCA00)" }}
              />

              <p className="mt-6 max-w-3xl mx-auto text-white/90 text-base md:text-lg leading-relaxed">
                Une question, une collaboration, une demande de partenariat ? Écrivez-nous,
                ou trouvez le bureau le plus proche sur la carte.
              </p>

              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <MiniStat label="Réponse rapide" value="24–48h" />
                <MiniStat label="Bureaux" value={`${stats.total || 0}+`} />
                <MiniStat label="Pays" value={`${stats.countries || 1}+`} />
                <MiniStat label="Support" value="MIRADIA" />
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            Layout Form + Map
        ========================== */}
        <section className="mt-10 md:mt-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)] gap-6 lg:gap-8 items-stretch">
          <div className="h-full">
            <ContactForm />
          </div>

          <aside className="flex flex-col h-full miradia-enter">
            {/* Map card glass (light/dark) */}
            <div className="h-full rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col border relative overflow-hidden
              bg-white/70 text-slate-900 border-slate-200/80 backdrop-blur-2xl
              shadow-[0_18px_50px_rgba(15,23,42,0.12)]
              dark:bg-slate-950/55 dark:text-slate-50 dark:border-white/10
              dark:shadow-[0_18px_60px_rgba(0,0,0,0.45)]
            ">
              {/* Halo glassy */}
              <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(58,189,248,0.18),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(94,234,212,0.14),transparent_55%)]" />
              </div>

              {/* En-tête + recherche */}
              <div className="mb-4 relative z-10">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">
                  localisation
                </p>

                <h2 className="text-lg sm:text-xl font-semibold mb-1 bg-gradient-to-r from-[#3AA6DC] via-[#1690FF] to-[#4CC051] bg-clip-text text-transparent">
                  Nos bureaux à Madagascar
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  Cliquez sur un marqueur pour afficher les détails.
                </p>

                {/* Recherche + filtres */}
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher (nom, ville, adresse…)"
                        className="
                          w-full rounded-full border px-3.5 py-2 pl-9 pr-10 text-[11px] sm:text-xs
                          outline-none transition-all backdrop-blur
                          bg-white/70 text-slate-900 placeholder:text-slate-400 border-slate-200/80
                          focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/20
                          dark:bg-slate-900/45 dark:text-slate-100 dark:placeholder:text-slate-400 dark:border-white/10
                          dark:focus:ring-[#1690FF]/25
                        "
                        aria-label="Rechercher des bureaux"
                      />
                      {search && (
                        <button
                          onClick={handleSearchClear}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
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
                          ? "bg-sky-500/15 border-sky-400/50 text-sky-700 dark:text-sky-200"
                          : "bg-white/60 border-slate-200/80 text-slate-500 hover:text-slate-800 dark:bg-slate-900/40 dark:border-white/10 dark:text-slate-300 dark:hover:text-slate-100"
                      }`}
                      aria-label="Afficher les filtres"
                      title="Filtres"
                    >
                      <FiFilter className="text-sm" />
                    </button>
                  </div>

                  {showFilters && (
                    <div className="p-3 rounded-2xl border backdrop-blur animate-in slide-in-from-top-2 duration-200
                      bg-white/70 border-slate-200/80
                      dark:bg-slate-900/45 dark:border-white/10
                    ">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Filtrer par pays
                        </p>
                        {(selectedCountry !== "all" || search) && (
                          <button
                            onClick={clearAllFilters}
                            className="text-[10px] text-[#1690FF] hover:opacity-80 transition-opacity"
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
                              ? "text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                          }`}
                          style={selectedCountry === "all" ? { background: "#1690FF" } : undefined}
                        >
                          Tous ({bureaux.length})
                        </button>

                        {countries.map((country) => {
                          const count = bureaux.filter((b) => b.country === country).length;
                          const flag = getCountryFlag(country);

                          return (
                            <button
                              key={country}
                              onClick={() => handleCountryChange(country)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                                selectedCountry === country
                                  ? "text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                              }`}
                              style={selectedCountry === country ? { background: "#1690FF" } : undefined}
                            >
                              {flag} {country} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Statistiques */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>
                      {stats.filtered} bureau{stats.filtered > 1 ? "x" : ""} trouvé
                      {stats.filtered > 1 ? "s" : ""}
                      {stats.filtered !== stats.total ? ` sur ${stats.total}` : ""}
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
                  <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-600 dark:text-red-200">
                    {mapError}
                  </div>
                )}
              </div>

              {/* Carte Leaflet */}
              <div className="relative flex-1 min-h-[420px] lg:min-h-[520px] rounded-2xl overflow-hidden border bg-slate-900/70 shadow-[0_18px_45px_rgba(15,23,42,0.35)]
                border-slate-200/70 dark:border-white/10
              ">
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
                    <LayersControl.BaseLayer checked name="Plan (OpenStreetMap)">
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
                <div className="pointer-events-none absolute top-3 left-3 px-3 py-1.5 rounded-full text-[11px] font-medium backdrop-blur-sm flex items-center gap-2
                  bg-black/50 text-white border border-white/15
                  shadow-[0_10px_30px_rgba(15,23,42,0.45)]
                ">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      mapLoading ? "bg-yellow-400 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  <span>
                    {mapLoading
                      ? "Chargement des bureaux…"
                      : `${filteredBureaux.length} bureau${
                          filteredBureaux.length > 1 ? "x" : ""
                        } affiché${filteredBureaux.length > 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>

              {/* footer badge */}
              <div className="mt-5 relative z-10 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur">
                  <FiMail className="h-5 w-5" style={{ color: "#025C86" }} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Ensemble pour un Madagascar résilient et durable
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>

      {/* Optionnel: delay animation "miradia-enter" */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              try{
                var els = document.querySelectorAll(".miradia-enter");
                els.forEach(function(el,i){
                  el.style.animationDelay = Math.min(i*60,420)+"ms";
                });
              }catch(e){}
            })();
          `,
        }}
      />
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 transition-all duration-300">
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-xs font-semibold text-white/90">{label}</div>
    </div>
  );
}
