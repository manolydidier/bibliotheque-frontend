// src/pages/Contact.jsx
import React from "react";
import { FiMail, FiPhone, FiMapPin, FiSend } from "react-icons/fi";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Icône Leaflet bleue personnalisée
const blueMarkerIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  // tu peux remplacer par ton propre PNG bleu
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  shadowSize: [41, 41],
});

/**
 * Liste des bureaux – prêt pour en ajouter d'autres plus tard
 */
const OFFICES = [
  {
    id: "tana-hq",
    name: "Siège SAF/FJKM - Antananarivo",
    city: "Antananarivo",
    country: "Madagascar",
    coords: [-18.8792, 47.5079],
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80",
    description:
      "Bureau principal et coordination de la bibliothèque numérique et des projets nationaux.",
    address: "Antananarivo, Madagascar",
    phone: "+261 38 32 006 19",
    email: "johary@saf-fjkm.org",
  },
];

const DEFAULT_CENTER = OFFICES[0].coords;

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-10 text-center">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400 mb-3">
            contact
          </p>
          <h1 className="text-3xl sm:text-4xl font-light text-slate-900 mb-3">
            Entrons en contact
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
            Une question, une demande de collaboration ou un besoin spécifique&nbsp;?
            Envoyez-nous un message, nous revenons vers vous rapidement.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 lg:gap-8 items-stretch">
          {/* FORMULAIRE – liquid glass + plus plat */}
          <section className="bg-white/55 backdrop-blur-2xl border border-white/70 rounded-3xl shadow-[0_16px_40px_rgba(15,23,42,0.05)] p-6 sm:p-8 lg:p-9">
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: endpoint backend de contact
              }}
            >
              {/* Nom + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Nom complet" htmlFor="name">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Votre nom et prénom"
                    className="w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 text-sm outline-none focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22 transition"
                  />
                </Field>

                <Field label="Adresse e-mail" htmlFor="email">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="vous@example.com"
                    className="w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 text-sm outline-none focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22 transition"
                  />
                </Field>
              </div>

              {/* Sujet */}
              <Field label="Sujet" htmlFor="subject">
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  placeholder="Ex. : Demande de collaboration, devis, question…"
                  className="w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 text-sm outline-none focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22 transition"
                />
              </Field>

              {/* Type de demande */}
              <Field label="Type de demande" htmlFor="type">
                <select
                  id="type"
                  name="type"
                  className="w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 text-sm outline-none focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22 transition"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Sélectionnez une option
                  </option>
                  <option value="question">Question générale</option>
                  <option value="project">Projet / accompagnement</option>
                  <option value="support">Support / problème technique</option>
                  <option value="other">Autre</option>
                </select>
              </Field>

              {/* Message */}
              <Field label="Message" htmlFor="message">
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  placeholder="Expliquez-nous en quelques lignes comment nous pouvons vous aider."
                  className="w-full rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 text-sm outline-none focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22 transition resize-none"
                />
              </Field>

              {/* Consentement */}
              <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-500">
                <input
                  id="consent"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1690FF] focus:ring-[#1690FF]"
                />
                <label htmlFor="consent" className="leading-snug">
                  J’accepte que mes informations soient utilisées uniquement pour
                  répondre à ma demande. Aucune donnée ne sera partagée à des tiers.
                </label>
              </div>

              {/* Bouton submit – plus plat mais lumineux */}
              <div className="pt-3 flex items-center justify-end">
                <button
                  type="submit"
                  className="
                    inline-flex items-center gap-2 rounded-full 
                    bg-[#1690FF] text-white text-sm font-medium 
                    px-6 py-2.5 shadow-[0_10px_28px_rgba(22,144,255,0.35)]
                    hover:bg-[#1378d6] hover:shadow-[0_14px_32px_rgba(22,144,255,0.45)]
                    active:translate-y-[0.5px] active:shadow-[0_6px_18px_rgba(22,144,255,0.35)]
                    transition-all
                  "
                >
                  Envoyer le message
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </form>
          </section>

          {/* PANNEAU DROIT – carte + “liquid glass” bleu foncé, plus plat */}
          <aside className="flex flex-col">
            <div className="min-h-[520px] bg-slate-950/80 backdrop-blur-3xl text-slate-50 rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col border border-sky-500/25 shadow-[0_18px_50px_rgba(15,23,42,0.55)]">
              {/* Titre / sous-titre */}
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                  localisation
                </p>
                <h2 className="text-lg sm:text-xl font-semibold mb-1 bg-gradient-to-r from-sky-300 via-[#1690FF] to-cyan-300 bg-clip-text text-transparent">
                  Nos bureaux à Madagascar
                </h2>
                <p className="text-xs sm:text-sm text-slate-300/90">
                  Localisez nos sièges et antennes sur la carte. Cliquez sur un
                  marqueur pour afficher l’adresse et les contacts de ce bureau.
                </p>
              </div>

              {/* Carte Leaflet – plus haute */}
              <div className="relative flex-1 min-h-[380px] lg:min-h-[460px] rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/60">
                {/* Styles spécifiques popup / carte contact (liquid glass bleu) */}
                <style>{`
                  .contact-map .leaflet-popup-content-wrapper {
                    background:
                      radial-gradient(circle at 0% 0%, rgba(56,189,248,0.35), transparent 55%),
                      rgba(2,6,23,0.96); /* slate-950 */
                    color: #e5e7eb;
                    border-radius: 0.9rem;
                    border: 1px solid rgba(56,189,248,0.9); /* cyan-400 */
                    box-shadow:
                      0 18px 45px rgba(15,23,42,0.75);
                    padding: 0;
                    backdrop-filter: blur(16px);
                  }
                  .contact-map .leaflet-popup-content {
                    margin: 0.45rem 0.55rem 0.55rem;
                    width: 260px;
                  }
                  .contact-map .leaflet-popup-tip {
                    background: rgba(2,6,23,0.96);
                    border: 1px solid rgba(56,189,248,0.9);
                  }
                  .contact-map .leaflet-popup-close-button {
                    color: #c7d2fe;
                    font-weight: 700;
                  }
                `}</style>

                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={13}
                  scrollWheelZoom={false}
                  className="h-full w-full contact-map"
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {OFFICES.map((office) => (
                    <Marker
                      key={office.id}
                      position={office.coords}
                      icon={blueMarkerIcon}
                    >
                      <Popup maxWidth={280} className="contact-popup">
                        <div className="w-full max-w-[250px] text-slate-100 text-xs">
                          {/* Header chip + ville/pays */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/80 border border-sky-500/60 text-[10px] font-medium uppercase tracking-[0.16em] text-sky-100">
                              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                              Bureau
                            </span>
                            <span className="text-[10px] text-sky-300 font-medium">
                              {office.city}, {office.country}
                            </span>
                          </div>

                          {/* Image + nom + descriptif */}
                          <div className="flex gap-3">
                            {office.image && (
                              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700 shadow-[0_0_0_1px_rgba(15,23,42,0.9)]">
                                <img
                                  src={office.image}
                                  alt={office.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-slate-50 leading-snug">
                                {office.name}
                              </h3>
                              {office.description && (
                                <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                                  {office.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Infos contact stylées */}
                          <div className="mt-3 space-y-1.5 text-[11px] text-slate-300/95">
                            {office.address && (
                              <div className="flex items-start gap-1.5">
                                <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center">
                                  <FiMapPin className="h-3 w-3 text-sky-400" />
                                </div>
                                <span>{office.address}</span>
                              </div>
                            )}
                            {office.phone && (
                              <div className="flex items-start gap-1.5">
                                <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center">
                                  <FiPhone className="h-3 w-3 text-sky-400" />
                                </div>
                                <a
                                  href={`tel:${office.phone.replace(/\s+/g, "")}`}
                                  className="hover:text-sky-300 transition-colors"
                                >
                                  {office.phone}
                                </a>
                              </div>
                            )}
                            {office.email && (
                              <div className="flex items-start gap-1.5">
                                <div className="mt-0.5 h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center">
                                  <FiMail className="h-3 w-3 text-sky-400" />
                                </div>
                                <a
                                  href={`mailto:${office.email}`}
                                  className="hover:text-sky-300 break-all transition-colors"
                                >
                                  {office.email}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Bas de carte */}
                          <div className="mt-3 pt-2 border-top border-t border-slate-800/80">
                            <p className="text-[10px] text-slate-500 leading-snug">
                              Utilisez ce bureau comme point de contact pour vos
                              demandes liées à la bibliothèque numérique SAF/FJKM.
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {/* Badge flottant type chip “liquid glass” */}
                <div className="pointer-events-none absolute top-3 left-3 px-3 py-1.5 rounded-full text-[11px] font-medium bg-slate-950/85 border border-sky-400/60 backdrop-blur-sm flex items-center gap-2 shadow-[0_10px_30px_rgba(15,23,42,0.7)]">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{OFFICES.length} siège(s) référencé(s)</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Petit composant pour factoriser label + field, même style soft/bleu.
 */
function Field({ label, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
