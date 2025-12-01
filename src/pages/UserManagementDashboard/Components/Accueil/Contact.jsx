// src/pages/UserManagementDashboard/Components/Accueil/Contact.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiMail, FiPhone, FiMapPin, FiMail as FiMailIcon } from "react-icons/fi";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import api from "../../../../services/api"; // 🔁 adapte le chemin si besoin

import ContactForm from "./ContactForm"; // ⬅️ nouveau composant formulaire

const DEFAULT_CENTER = [-19.0, 47.0]; // centre Madagascar

/* =========================
   Helpers pays / drapeau
========================= */

const getCountryFlag = (country) => {
  if (!country) return "🌍";
  const c = country.toLowerCase();

  if (c.includes("madagascar")) return "🇲🇬";
  if (c.includes("france")) return "🇫🇷";
  if (c.includes("canada")) return "🇨🇦";
  if (
    c.includes("usa") ||
    c.includes("united states") ||
    c.includes("états-unis")
  )
    return "🇺🇸";

  return "🌍";
};

/* =========================
   Helpers images (cohérent avec BureauForm)
========================= */

const buildStorageBase = () => {
  const base =
    import.meta.env.VITE_API_BASE_STORAGE ||
    import.meta.env.VITE_API_BASE_URL ||
    "";

  return base.replace(/\/api\/?$/i, "").replace(/\/+$/i, "");
};

const buildSocieteLogoUrl = (value) => {
  if (!value) return "";
  const s = String(value).trim();

  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) {
    return s;
  }

  const storageBase = buildStorageBase();
  return storageBase ? `${storageBase}/storage/logos/${s}` : "";
};

const buildBureauImageUrl = (value) => {
  if (!value) return "";
  const s = String(value).trim();

  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) {
    return s;
  }

  const storageBase = buildStorageBase();
  return storageBase ? `${storageBase}/storage/bureaux/${s}` : "";
};

// ⚠️ Exemple d'URL de tuiles Satellite – à adapter via VITE_SATELLITE_TILE_URL si besoin
const SATELLITE_TILES_URL =
  import.meta.env.VITE_SATELLITE_TILE_URL ||
  "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";

// Icône Leaflet personnalisée (petit marqueur rond fond blanc + logo)
function createSocieteIcon(societe) {
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
}

export default function ContactPage() {
  const [bureaux, setBureaux] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");

  // 🔁 Chargement des bureaux pour la carte
  useEffect(() => {
    let mounted = true;
    setMapLoading(true);
    setMapError("");

    api
      .get("/public/bureaux-map")
      .then((res) => {
        if (!mounted) return;
        const list = res?.data?.data || [];
        setBureaux(list);
        console.log("Bureaux map API:", list);
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

  // Centre de la carte (moyenne des lat/lng valides)
  const mapCenter = useMemo(() => {
    if (!bureaux.length) return DEFAULT_CENTER;
    const valid = bureaux
      .map((b) => [parseFloat(b.latitude), parseFloat(b.longitude)])
      .filter(
        ([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)
      );
    if (!valid.length) return DEFAULT_CENTER;

    const avgLat =
      valid.reduce((sum, [lat]) => sum + lat, 0) / valid.length;
    const avgLng =
      valid.reduce((sum, [, lng]) => sum + lng, 0) / valid.length;

    return [avgLat, avgLng];
  }, [bureaux]);

  // Zoom dynamique : plus les bureaux sont proches, plus on zoome
  const mapZoom = useMemo(() => {
    if (!bureaux.length) return 6;
    const coords = bureaux
      .map((b) => [parseFloat(b.latitude), parseFloat(b.longitude)])
      .filter(
        ([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)
      );
    if (!coords.length) return 6;

    const lats = coords.map(([lat]) => lat);
    const lngs = coords.map(([, lng]) => lng);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);

    if (latSpan < 1.0 && lngSpan < 1.0) return 11; // même ville/quartier
    if (latSpan < 2.5 && lngSpan < 2.5) return 9;
    if (latSpan < 4.5 && lngSpan < 4.5) return 8;
    return 7;
  }, [bureaux]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header style HomeHero */}
        <header className="mb-10">
          <div className="flex flex-col items-center text-center gap-3 md:gap-4">
            <div className="w-11 h-11 md:w-12 md:h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-blue-100">
              <FiMail className="text-blue-600 text-lg md:text-xl" />
            </div>

            <p className="text-[11px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">
              Nous écrire / nous joindre
            </p>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">
              Contact & bureaux
            </h1>

            <div className="w-32 h-1 bg-slate-900 mx-auto" />

            <p className="text-xs md:text-sm text-slate-600 max-w-xl mx-auto">
              Une question, une demande de collaboration ou un besoin
              spécifique&nbsp;? Envoyez-nous un message, nous revenons vers
              vous rapidement.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] gap-6 lg:gap-8 items-stretch">
          {/* 👉 Formulaire dans un composant séparé */}
          <ContactForm />

          {/* PANNEAU DROIT – carte agrandie */}
          <aside className="flex flex-col">
            <div className="min-h-[600px] bg-slate-950/75 backdrop-blur-3xl text-slate-50 rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col border border-sky-500/25 shadow-[0_18px_50px_rgba(15,23,42,0.55)] relative overflow-hidden">
              {/* halo glassy */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.23),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(94,234,212,0.18),transparent_55%)] opacity-70" />

              {/* Titre / sous-titre */}
              <div className="mb-4 relative z-10">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                  localisation
                </p>
                <h2 className="text-lg sm:text-xl font-semibold mb-1 bg-gradient-to-r from-sky-200 via-[#38bdf8] to-teal-200 bg-clip-text text-transparent">
                  Nos bureaux à Madagascar
                </h2>
                <p className="text-xs sm:text-sm text-slate-200/90">
                  Localisez nos sièges et antennes sur la carte. Cliquez sur un
                  marqueur pour afficher l’adresse, la société et accéder à la
                  fiche du bureau.
                </p>
                {mapError && (
                  <p className="mt-2 text-[11px] text-red-300">{mapError}</p>
                )}
              </div>

              {/* Carte Leaflet (plus grande) */}
              <div className="relative flex-1 min-h-[420px] lg:min-h-[520px] rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/70 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
                <style>{`
                  /* Popup glass : fond sombre transparent + blur + texte clair */
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

                  /* Petit marker rond fond blanc (glass) */
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
                    border: 1px solid rgba(37,99,235,0.01);
                    box-shadow:
                      0 8px 18px rgba(15,23,42,0.55),
                      0 0 0 2px rgba(15,23,42,0.75);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
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
                `}</style>

                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={true}
                  className="h-full w-full contact-map"
                >
                  {/* LayersControl pour choisir OSM / Satellite */}
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

                  {bureaux.map((b) => {
                    const lat = parseFloat(b.latitude);
                    const lng = parseFloat(b.longitude);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                      return null;
                    }

                    const icon = createSocieteIcon(b.societe);
                    const logoUrl = buildSocieteLogoUrl(b.societe?.logo_url);
                    const bureauImageUrl = buildBureauImageUrl(b.image_url);
                    const societeLabel =
                      b.societe?.sigle ||
                      b.societe?.nom ||
                      `Société #${b.societe?.id ?? "?"}`;
                    const flag = getCountryFlag(b.country || "");

                    return (
                      <Marker
                        key={b.id}
                        position={[lat, lng]}
                        icon={icon}
                      >
                        <Popup maxWidth={280} className="contact-popup">
                          <div className="w-full max-w-[250px] text-slate-100 text-xs">
                            {/* Header chip + ville/pays */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/70 border border-sky-400/70 text-[10px] font-medium uppercase tracking-[0.16em] text-sky-100">
                                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Bureau
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-200 font-medium">
                                <span>{flag}</span>
                                <span className="truncate max-w-[120px]">
                                  {b.city}, {b.country}
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
                                  />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="text-sm font-semibold text-slate-50 leading-snug">
                                  {b.name || "Bureau / lieu"}
                                </h3>
                                {b.societe && (
                                  <p className="mt-1 text-[11px] text-slate-200/90 leading-snug">
                                    {societeLabel}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Image du bureau (optionnelle) */}
                            {bureauImageUrl && (
                              <div className="mb-2 rounded-xl overflow-hidden border border-slate-600/70 bg-slate-900/70">
                                <img
                                  src={bureauImageUrl}
                                  alt={b.name || "Photo du bureau"}
                                  className="w-full h-24 object-cover"
                                />
                              </div>
                            )}

                            {/* Infos contact */}
                            <div className="mt-2 space-y-1.5 text-[11px] text-slate-100/95">
                              {b.address && (
                                <div className="flex items-start gap-1.5">
                                  <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-950/80 flex items-center justify-center border border-sky-500/60">
                                    <FiMapPin className="h-3 w-3 text-sky-300" />
                                  </div>
                                  <span>
                                    {b.address}
                                    {b.city ? `, ${b.city}` : ""}
                                  </span>
                                </div>
                              )}
                              {b.phone && (
                                <div className="flex items-start gap-1.5">
                                  <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-950/80 flex items-center justify-center border border-sky-500/60">
                                    <FiPhone className="h-3 w-3 text-sky-300" />
                                  </div>
                                  <a
                                    href={`tel:${b.phone.replace(/\s+/g, "")}`}
                                    className="hover:text-sky-200 transition-colors"
                                  >
                                    {b.phone}
                                  </a>
                                </div>
                              )}
                              {b.email && (
                                <div className="flex items-start gap-1.5">
                                  <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-950/80 flex items-center justify-center border border-sky-500/60">
                                    <FiMailIcon className="h-3 w-3 text-sky-300" />
                                  </div>
                                  <a
                                    href={`mailto:${b.email}`}
                                    className="hover:text-sky-200 break-all transition-colors"
                                  >
                                    {b.email}
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Texte aide */}
                            <div className="mt-3 pt-2 border-t border-slate-600/70 flex items-center justify-between gap-2">
                              <p className="text-[10px] text-slate-300/90 leading-snug">
                                Utilisez ce bureau comme point d’entrée pour
                                vos démarches avec la SAF/FJKM et partenaires.
                              </p>
                            </div>

                            {/* Lien vers la fiche bureau */}
                            <div className="mt-2 flex justify-end">
                              <Link
                                to={`/bureaux-public/${b.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#1690FF] text-white hover:bg-[#1378d6] transition-colors"
                              >
                                Voir la fiche du bureau
                              </Link>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>

                {/* Badge flottant */}
                <div className="pointer-events-none absolute top-3 left-3 px-3 py-1.5 rounded-full text-[11px] font-medium bg-slate-950/80 border border-sky-400/60 backdrop-blur-sm flex items-center gap-2 shadow-[0_10px_30px_rgba(15,23,42,0.7)]">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span>
                    {mapLoading
                      ? "Chargement des bureaux…"
                      : `${bureaux.length} bureau(x) référencé(s)`}
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
