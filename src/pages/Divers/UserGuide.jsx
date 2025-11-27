// src/pages/UserGuide.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiCheckCircle, FiPlayCircle, FiSun, FiMoon } from "react-icons/fi";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Clé de stockage pour les préférences (mode sombre)
const STORAGE_KEY = "user_guide_prefs_v1";

function loadPrefs() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    console.error("Error loading user guide prefs:", e);
    return {};
  }
}

export default function UserGuidePage() {
  const { t } = useTranslation();
  const prefsRef = React.useRef(loadPrefs());

  const [darkMode, setDarkMode] = useState(
    typeof prefsRef.current.darkMode === "boolean"
      ? prefsRef.current.darkMode
      : false
  );

  // Sauvegarde du thème
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefsToSave = { darkMode };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefsToSave));
    } catch (e) {
      console.error("Error saving user guide prefs:", e);
    }
  }, [darkMode]);

  // Steps récupérés via i18n (tu peux adapter le nombre dans les fichiers de traduction)
  const steps = [
    "step1",
    "step2",
    "step3",
  ].map((id) => ({
    id,
    title: t(`userGuide.steps.${id}.title`),
    body: t(`userGuide.steps.${id}.body`),
  }));

  const pageBg = darkMode
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
    : "bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-900";

  const cardBase =
    "rounded-2xl border shadow-sm shadow-slate-900/10 backdrop-blur-xl";
  const cardBg = darkMode ? "bg-slate-900/70" : "bg-white/60";
  const borderColor = darkMode ? "border-slate-800/80" : "border-white/80";
  const subtleText = darkMode ? "text-slate-400" : "text-slate-500";
  const headingText = darkMode ? "text-slate-50" : "text-slate-900";

  return (
    <div className={classNames(pageBg, "min-h-screen py-6 sm:py-10")}>
      <div className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div
              className={classNames(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-sm",
                darkMode
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-emerald-400/70 bg-emerald-50/70 text-emerald-700"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t("userGuide.badge", {
                defaultValue: "Guide d’utilisation",
              })}
            </div>
            <h1
              className={classNames(
                headingText,
                "text-xl sm:text-2xl font-semibold tracking-tight"
              )}
            >
              {t("userGuide.headerTitle", {
                defaultValue: "Bien démarrer avec la plateforme",
              })}
            </h1>
            <p
              className={classNames(
                subtleText,
                "text-xs sm:text-sm max-w-xl"
              )}
            >
              {t("userGuide.headerIntro", {
                defaultValue:
                  "Un guide pas à pas pour accompagner les nouveaux utilisateurs : inscription, navigation, gestion du profil et accès aux fonctionnalités clés.",
              })}
            </p>

            <p
              className={classNames(
                subtleText,
                "text-[11px] sm:text-xs max-w-xl"
              )}
            >
              {t("userGuide.helperText", {
                defaultValue:
                  "Cette page est un guide pratique pour les utilisateurs, ce n’est pas un document juridique. Elle a pour but de rendre la prise en main la plus simple possible.",
              })}
            </p>
          </div>

          <div className="flex flex-col gap-2 items-stretch sm:items-end">
            {/* Carte vidéo / tutoriel */}
            <div
              className={classNames(
                cardBase,
                cardBg,
                borderColor,
                "px-3 py-2 flex items-center gap-2 text-[11px] sm:text-xs"
              )}
            >
              <FiPlayCircle className="h-4 w-4 text-emerald-400" />
              <span className={classNames(darkMode ? "text-slate-200" : "text-slate-800")}>
                {t("userGuide.tutorialHint", {
                  defaultValue:
                    "Vous pourrez ajouter ici un lien vers une vidéo tutorielle ou un webinaire d’introduction.",
                })}
              </span>
            </div>

            {/* Switch thème */}
            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              className={classNames(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] sm:text-xs font-medium transition backdrop-blur-sm",
                darkMode
                  ? "border-slate-700 bg-slate-900/80 hover:bg-slate-800"
                  : "border-slate-200/80 bg-white/80 hover:bg-white"
              )}
              aria-label={
                darkMode
                  ? t("common.switchToLight", { defaultValue: "Mode clair" })
                  : t("common.switchToDark", { defaultValue: "Mode sombre" })
              }
            >
              {darkMode ? (
                <>
                  <FiSun className="h-4 w-4" />
                  <span>{t("common.light", { defaultValue: "Light" })}</span>
                </>
              ) : (
                <>
                  <FiMoon className="h-4 w-4" />
                  <span>{t("common.dark", { defaultValue: "Dark" })}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* CONTENU */}
        <main className="space-y-5">
          {/* Parcours utilisateur */}
          <section
            className={classNames(
              cardBase,
              cardBg,
              borderColor,
              "p-4 sm:p-6"
            )}
          >
            <h2
              className={classNames(
                headingText,
                "text-base sm:text-lg font-semibold mb-2"
              )}
            >
              {t("userGuide.flowTitle", {
                defaultValue: "Parcours utilisateur",
              })}
            </h2>
            <p className={classNames(subtleText, "text-sm mb-4")}>
              {t("userGuide.flowIntro", {
                defaultValue:
                  "Ce guide résume les principales étapes de prise en main. Adaptez le contenu en fonction de vos rôles (lecteur, contributeur, administrateur) et des modules activés sur la plateforme.",
              })}
            </p>

            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li
                  key={step.id}
                  className={classNames(
                    "flex gap-3 rounded-xl border px-3 py-3",
                    darkMode
                      ? "border-slate-800/80 bg-slate-900/60"
                      : "border-slate-200/80 bg-white/80"
                  )}
                >
                  <div className="flex flex-col items-center mt-0.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-400/60 text-[11px] text-emerald-300">
                      {index + 1}
                    </div>
                    <FiCheckCircle className="mt-2 h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3
                      className={classNames(
                        headingText,
                        "text-sm font-semibold"
                      )}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={classNames(
                        subtleText,
                        "mt-1 text-xs sm:text-sm leading-relaxed"
                      )}
                    >
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Bloc aide supplémentaire */}
          <section
            className={classNames(
              cardBase,
              cardBg,
              borderColor,
              "p-4 sm:p-6"
            )}
          >
            <h2
              className={classNames(
                headingText,
                "text-base sm:text-lg font-semibold mb-2"
              )}
            >
              {t("userGuide.helpTitle", {
                defaultValue: "Besoin d’aide supplémentaire ?",
              })}
            </h2>
            <p className={classNames(subtleText, "text-sm")}>
              {t("userGuide.helpBody", {
                defaultValue:
                  "Complétez cette page avec des captures d’écran, des pas-à-pas détaillés ou des liens vers la FAQ et les politiques légales. Vous pouvez également préciser les contacts de support ou les horaires d’assistance.",
              })}
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
