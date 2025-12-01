// src/pages/bureaux/BureauPublicShow.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiMapPin,
  FiPhone,
  FiMail,
  FiArrowLeft,
  FiArrowRight,
  FiHome,
  FiSearch,
} from "react-icons/fi";
import api from "../../../../../../services/api";

/* ---------- Helpers pour les URLs d'images (même logique que BureauForm / SocieteForm) ---------- */

const buildSocieteLogoUrl = (value) => {
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

  return storageBase ? `${storageBase}/storage/logos/${s}` : "";
};

const buildBureauImageUrl = (value) => {
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

  // ⚠️ adapte "bureaux" si tu utilises un autre dossier
  return storageBase ? `${storageBase}/storage/bureaux/${s}` : "";
};

/* ---------- Helpers statuts ---------- */

const isPrimaryFlag = (b) =>
  b?.is_primary === true ||
  b?.is_primary === 1 ||
  b?.is_primary === "1";

const isActiveFlag = (b) =>
  b?.is_active === undefined ||
  b?.is_active === null
    ? true
    : b.is_active === true || b.is_active === 1 || b.is_active === "1";

export default function BureauPublicShow() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔍 état pour la recherche dans la liste
  const [searchTerm, setSearchTerm] = useState("");
  // 🔽 état pour le tri de la liste
  const [sortKey, setSortKey] = useState("default"); // "default" | "name" | "city" | "primary"

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
          "Impossible de charger les informations de ce bureau pour le moment."
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  if (isLoading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
        <div className="px-4 py-3 bg-white rounded-2xl shadow border border-slate-200 text-sm text-slate-700">
          Chargement de la fiche bureau…
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
        <div className="px-4 py-3 bg-red-50 rounded-2xl shadow border border-red-200 text-sm text-red-700 max-w-md text-center">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { bureau, societe, other_bureaux } = data;

  const societeLogoUrl = societe?.logo_url
    ? buildSocieteLogoUrl(societe.logo_url)
    : "";
  const bureauImageUrl = bureau?.image_url
    ? buildBureauImageUrl(bureau.image_url)
    : "";

  // 👉 Tous les bureaux de la société (bureau actuel + autres) + dédoublonnage éventuel
  const allBureauxRaw = [
    ...(bureau ? [bureau] : []),
    ...(Array.isArray(other_bureaux) ? other_bureaux : []),
  ];

  const allBureaux = allBureauxRaw.filter(
    (b, idx, arr) =>
      idx === arr.findIndex((x) => String(x.id) === String(b.id))
  );

  // 🔍 filtrage selon la recherche
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredBureauxBase =
    normalizedSearch === ""
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

          return haystack.includes(normalizedSearch);
        });

  // 🔽 tri selon le sortKey
  const sortedBureaux = (() => {
    const list = [...filteredBureauxBase];

    switch (sortKey) {
      case "name":
        return list.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", "fr", {
            sensitivity: "base",
          })
        );
      case "city":
        return list.sort((a, b) =>
          (a.city || "").localeCompare(b.city || "", "fr", {
            sensitivity: "base",
          })
        );
      case "primary":
        return list.sort((a, b) => {
          const ap = isPrimaryFlag(a) ? 0 : 1;
          const bp = isPrimaryFlag(b) ? 0 : 1;
          if (ap !== bp) return ap - bp;
          // fallback : tri par nom
          return (a.name || "").localeCompare(b.name || "", "fr", {
            sensitivity: "base",
          });
        });
      default:
        // "default" = ordre d'origine (pas de tri)
        return list;
    }
  })();

  const filteredBureaux = sortedBureaux;

  const isPrimaryGlobal = isPrimaryFlag(bureau);
  const isActiveGlobal = isActiveFlag(bureau);

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 text-slate-900 px-4 py-10">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Retour + titre */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/" // 🔁 adapter si ta carte est ailleurs
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 hover:text-slate-900"
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

        {/* Bandeau titre */}
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
                {isPrimaryGlobal && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 border border-indigo-300">
                    Bureau principal
                  </span>
                )}
                {!isActiveGlobal && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-700 border border-rose-300">
                    Inactif
                  </span>
                )}
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

        {/* Image du bureau si disponible */}
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

        {/* Contenu principal : fiche + liste des bureaux de la société */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5">
          {/* Bloc fiche bureau : AFFICHAGE GLOBAL + LISIBLE */}
          <section className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-sm px-5 py-5 sm:px-6 sm:py-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Bureau sélectionné
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Coordonnées & contact */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Coordonnées & contact
                </p>

                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                  {/* Adresse */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FiMapPin className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Adresse
                      </p>
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
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FiPhone className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Téléphone
                      </p>
                      {bureau.phone ? (
                        <a
                          href={`tel:${String(bureau.phone).replace(
                            /\s+/g,
                            ""
                          )}`}
                          className="text-slate-800 hover:text-sky-600 transition-colors"
                        >
                          {bureau.phone}
                        </a>
                      ) : (
                        <p className="italic text-slate-400">
                          Non renseigné
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FiMail className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Email
                      </p>
                      {bureau.email ? (
                        <a
                          href={`mailto:${bureau.email}`}
                          className="text-slate-800 hover:text-sky-600 break-all transition-colors"
                        >
                          {bureau.email}
                        </a>
                      ) : (
                        <p className="italic text-slate-400">
                          Non renseigné
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations techniques */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Informations techniques
                </p>

                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                  {/* Type */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FiHome className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Type de bureau
                      </p>
                      <p className="text-slate-800">
                        {bureau.type ? (
                          bureau.type
                        ) : (
                          <span className="italic text-slate-400">
                            Non renseigné
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Coordonnées GPS */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FiMapPin className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Coordonnées GPS
                      </p>
                      {bureau.latitude == null &&
                      bureau.longitude == null ? (
                        <p className="italic text-slate-400">
                          Non renseignées
                        </p>
                      ) : (
                        <p className="text-slate-800">
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
                    </div>
                  </div>

                  {/* Statuts */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <FiHome className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Statuts
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-900/5 border border-slate-200 text-slate-700">
                          Principal :{" "}
                          <span className="ml-1 font-semibold">
                            {isPrimaryGlobal ? "Oui" : "Non"}
                          </span>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-900/5 border border-slate-200 text-slate-700">
                          Statut :{" "}
                          <span className="ml-1 font-semibold">
                            {isActiveGlobal ? "Actif" : "Inactif"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
              Pour mettre à jour ces informations, merci de contacter
              l’administrateur de la bibliothèque ou l’équipe SAF/FJKM.
            </div>
          </section>

          {/* Bloc tous les bureaux de la même société (liste + recherche + tri) */}
          <section className="bg-gradient-to-br from-sky-950 via-slate-950 to-slate-900 text-sky-50 rounded-3xl border border-sky-500/40 shadow-[0_18px_50px_rgba(15,23,42,0.9)] px-5 py-5 sm:px-6 sm:py-6 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-400/80 mb-1">
                  Bureaux de la société
                </p>
                <h2 className="text-sm sm:text-base font-semibold text-sky-100">
                  Réseau de la même société
                </h2>
              </div>
              {societe && (
                <span className="text-[11px] text-sky-300/80">
                  {filteredBureaux.length} / {allBureaux.length} bureau(x)
                </span>
              )}
            </div>

            {/* 🔍 Recherche + 🔽 Tri */}
            {allBureaux.length > 0 && (
              <div className="mb-3 space-y-2">
                {/* Recherche */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-300">
                    <FiSearch className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher (nom, ville, pays, contact)…"
                    className="w-full rounded-2xl bg-sky-900/40 border border-sky-800/70 px-9 py-2 text-[12px] text-sky-50 placeholder:text-sky-400/70 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                  />
                </div>

                {/* Tri */}
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-sky-300/80 whitespace-nowrap">
                    Trier par :
                  </span>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="flex-1 rounded-2xl bg-sky-900/40 border border-sky-800/70 px-3 py-1.5 text-[11px] text-sky-50 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                  >
                    <option value="default">Ordre d’origine</option>
                    <option value="name">Nom (A → Z)</option>
                    <option value="city">Ville (A → Z)</option>
                    <option value="primary">Bureaux principaux d’abord</option>
                  </select>
                </div>

                {searchTerm.trim() !== "" && (
                  <p className="text-[10px] text-sky-300/80">
                    Filtre appliqué :{" "}
                    <span className="italic">“{searchTerm}”</span>
                  </p>
                )}
              </div>
            )}

            {allBureaux.length === 0 && (
              <p className="text-[12px] text-sky-300/80">
                Aucun bureau déclaré pour cette société pour le moment.
              </p>
            )}

            {allBureaux.length > 0 && filteredBureaux.length === 0 && (
              <p className="text-[12px] text-sky-300/80 mt-2">
                Aucun bureau ne correspond à votre recherche / tri.
              </p>
            )}

            {filteredBureaux.length > 0 && (
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1 mt-1">
                {filteredBureaux.map((b) => {
                  const thumbUrl = b.image_url
                    ? buildBureauImageUrl(b.image_url)
                    : "";
                  const isCurrent =
                    String(b.id) === String(bureau.id ?? "");

                  const primary = isPrimaryFlag(b);
                  const active = isActiveFlag(b);

                  const cardBase =
                    "block rounded-2xl px-3.5 py-3 text-xs sm:text-[13px] flex items-start justify-between gap-3 transition";
                  const cardTheme = isCurrent
                    ? "border border-sky-400 bg-sky-900/80 ring-1 ring-sky-300/60 cursor-default"
                    : "border border-sky-900/60 bg-sky-950/60 hover:border-sky-400 hover:bg-sky-900/70 cursor-pointer";

                  const content = (
                    <>
                      <div className="flex items-start gap-3 w-full">
                        {/* Vignette */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-sky-500/40 bg-sky-900/60 flex items-center justify-center">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={b.name || "Bureau"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <FiHome className="w-5 h-5 text-sky-200" />
                          )}
                        </div>

                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-sky-50 truncate">
                              {b.name || "Bureau"}
                            </p>
                            {isCurrent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-100 border border-sky-400/70">
                                Bureau actuel
                              </span>
                            )}
                            {primary && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-100 border border-indigo-400/70">
                                Principal
                              </span>
                            )}
                            {!active && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-100 border border-rose-400/60">
                                Inactif
                              </span>
                            )}
                          </div>

                          <div className="flex items-start gap-1.5 text-[11px]">
                            <FiMapPin className="mt-0.5 w-3.5 h-3.5 text-sky-300" />
                            <span className="text-sky-100/90">
                              {b.address || b.city || b.country ? (
                                <>
                                  {b.address && `${b.address}, `}
                                  {b.city}
                                  {b.country && ` (${b.country})`}
                                </>
                              ) : (
                                <span className="italic text-sky-300/75">
                                  Adresse non renseignée
                                </span>
                              )}
                            </span>
                          </div>

                          {(b.phone || b.email) && (
                            <p className="text-[11px] text-sky-300/90">
                              {b.phone && <span>{b.phone}</span>}
                              {b.phone && b.email && <span> • </span>}
                              {b.email && <span>{b.email}</span>}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 flex-shrink-0">
                        {!isCurrent && (
                          <FiArrowRight className="w-4 h-4 text-sky-300" />
                        )}
                      </div>
                    </>
                  );

                  return isCurrent ? (
                    <div
                      key={b.id}
                      className={`${cardBase} ${cardTheme}`}
                      aria-current="true"
                    >
                      {content}
                    </div>
                  ) : (
                    <Link
                      key={b.id}
                      to={`/bureaux-public/${b.id}`}
                      className={`${cardBase} ${cardTheme}`}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-sky-900/70 text-[11px] text-sky-300/90">
              Sélectionnez un bureau pour ouvrir sa fiche détaillée. Le bureau
              actuellement affiché est indiqué par le badge « Bureau actuel ».
              Utilisez la barre de recherche pour filtrer, et le menu de tri
              pour réordonner la liste.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
