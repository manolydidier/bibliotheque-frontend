// src/pages/FAQ.jsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FiHelpCircle, FiSun, FiMoon, FiArrowUp } from "react-icons/fi";

const STORAGE_KEY = "faq_page_prefs_v1";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// FAQ pilotée par i18n
// Les textes viennent de resources.faq.items.<id>.question / .answer
const FAQ_ITEMS = [
  { id: "create_account", i18nKey: "faq.faq.items.create_account" },
  { id: "forgot_password", i18nKey: "faq.faq.items.forgot_password" },
  { id: "contact_support", i18nKey: "faq.faq.items.contact_support" },
];

function loadPrefs() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    console.error("Error loading FAQ preferences:", e);
    return {};
  }
}

export default function FAQPage() {
  const { t, i18n } = useTranslation();
  const prefsRef = useRef(loadPrefs());

  const [darkMode, setDarkMode] = useState(
    typeof prefsRef.current.darkMode === "boolean"
      ? prefsRef.current.darkMode
      : false
  );
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Sauvegarde du thème
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ darkMode })
      );
    } catch (e) {
      console.error("Error saving FAQ preferences:", e);
    }
  }, [darkMode]);

  // Suivi du scroll pour la barre de progression + bouton back-to-top
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight =
        (document.documentElement.scrollHeight || 0) - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
      setShowBackToTop(scrollTop > 320);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // THEME + GLASS
  const pageBg = darkMode
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
    : "bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-900";

  const cardBg = darkMode ? "bg-slate-900/75" : "bg-white/70";
  const borderColor = darkMode ? "border-slate-800/80" : "border-slate-200/80";
  const subtleText = darkMode ? "text-slate-400" : "text-slate-500";
  const headingText = darkMode ? "text-slate-50" : "text-slate-900";
  const cardBase =
    "rounded-2xl border shadow-sm shadow-slate-900/10 backdrop-blur-xl";

  const badgeBg = darkMode
    ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
    : "border-violet-300/70 bg-violet-50 text-violet-700";

  const chipDot = darkMode ? "bg-violet-400" : "bg-violet-500";

  const accentIcon =
    "h-4 w-4 rounded-full bg-slate-900/70 flex items-center justify-center";

  const faqIsEmpty = FAQ_ITEMS.length === 0;

  return (
    <div className={classNames(pageBg, "min-h-screen py-6 sm:py-10")}>
      <div className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div
              className={classNames(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-sm",
                badgeBg
              )}
            >
              <span className={classNames("h-1.5 w-1.5 rounded-full", chipDot)} />
              {t("resources.faq.badge", {
                defaultValue: "FAQ & aide rapide",
              })}
            </div>

            <h1
              className={classNames(
                headingText,
                "text-xl sm:text-2xl font-semibold tracking-tight"
              )}
            >
              {t("resources.faq.headerTitle", {
                defaultValue: "Foire aux questions",
              })}
            </h1>
            <p className={classNames(subtleText, "text-xs sm:text-sm max-w-xl")}>
              {t("resources.faq.headerIntro", {
                defaultValue:
                  "Une page simple et pédagogique pour répondre aux questions les plus fréquentes sur l’utilisation de la plateforme.",
              })}
            </p>
            <p
              className={classNames(
                subtleText,
                "text-[11px] sm:text-xs flex items-center gap-1.5"
              )}
            >
              <span className={classNames(accentIcon, "text-[10px]")}>?</span>
              {t("resources.faq.headerHelper", {
                defaultValue:
                  "Cliquez sur une question pour afficher la réponse. Cette FAQ complète la documentation technique, elle n’a pas valeur de texte légal.",
              })}
            </p>
          </div>

          {/* Toggle light/dark */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              aria-label={
                darkMode
                  ? t("common.switchToLight", { defaultValue: "Mode clair" })
                  : t("common.switchToDark", { defaultValue: "Mode sombre" })
              }
              title={
                darkMode
                  ? t("common.switchToLight", { defaultValue: "Mode clair" })
                  : t("common.switchToDark", { defaultValue: "Mode sombre" })
              }
              className={classNames(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs sm:text-sm font-medium transition backdrop-blur-sm",
                darkMode
                  ? "border-slate-700 bg-slate-900/80 hover:bg-slate-800"
                  : "border-slate-200/80 bg-white/80 hover:bg-white"
              )}
            >
              {darkMode ? (
                <>
                  <FiSun className="h-4 w-4" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <FiMoon className="h-4 w-4" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Barre de progression de lecture */}
        <div className="mb-4 h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-800/70 overflow-hidden backdrop-blur-sm">
          <div
            className="h-full rounded-full bg-violet-500/80 transition-[width] duration-200"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* CONTENU */}
        <main
          className={classNames(
            cardBase,
            cardBg,
            borderColor,
            "p-4 sm:p-6 space-y-4"
          )}
        >
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-slate-200 dark:text-slate-100">
              <span
                className={classNames(
                  "inline-flex h-8 w-8 items-center justify-center rounded-xl border",
                  darkMode
                    ? "border-slate-700 bg-slate-900/90"
                    : "border-slate-200 bg-white/80"
                )}
              >
                <FiHelpCircle className="h-4 w-4" />
              </span>
              <div>
                <p className={classNames(headingText, "text-sm font-semibold")}>
                  {t("resources.faq.blockTitle", {
                    defaultValue: "Questions fréquentes",
                  })}
                </p>
                <p className={classNames(subtleText, "text-[11px] sm:text-xs")}>
                  {t("resources.faq.blockSubtitle", {
                    defaultValue:
                      "Une aide rapide pour l’inscription, la connexion et le support.",
                  })}
                </p>
              </div>
            </div>

            {!faqIsEmpty && (
              <div className={classNames(subtleText, "text-[11px] sm:text-xs")}>
                {t("resources.faq.counterLabel", {
                  defaultValue: "{{count}} question(s) listée(s).",
                  count: FAQ_ITEMS.length,
                })}
              </div>
            )}
          </div>

          {faqIsEmpty ? (
            <p className={classNames(subtleText, "text-sm mt-2")}>
              {t("resources.faq.empty", {
                defaultValue:
                  "Aucune question enregistrée pour le moment. Vous pouvez alimenter cette FAQ à partir des retours utilisateurs.",
              })}
            </p>
          ) : (
            <div
              className={classNames(
                "divide-y",
                darkMode ? "divide-slate-800/80" : "divide-slate-200/80"
              )}
            >
              {FAQ_ITEMS.map((item, idx) => {
                const question = t(`${item.i18nKey}.question`);
                const answer = t(`${item.i18nKey}.answer`);

                return (
                  <details
                    key={item.id}
                    className="group py-3"
                    open={idx === 0} // première question ouverte par défaut
                  >
                    <summary
                      className={classNames(
                        "flex cursor-pointer items-center justify-between gap-2 list-none text-sm sm:text-[15px] font-medium",
                        darkMode ? "text-slate-50" : "text-slate-900"
                      )}
                    >
                      <span>{question}</span>
                      <span
                        className={classNames(
                          "ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-transform",
                          darkMode
                            ? "border-slate-700 text-slate-300 group-open:rotate-90 bg-slate-900/80"
                            : "border-slate-300 text-slate-600 group-open:rotate-90 bg-white"
                        )}
                      >
                        ▶
                      </span>
                    </summary>
                    <p
                      className={classNames(
                        "mt-1.5 text-sm leading-relaxed",
                        darkMode ? "text-slate-300" : "text-slate-700"
                      )}
                    >
                      {answer}
                    </p>
                  </details>
                );
              })}
            </div>
          )}

          {/* Bandeau bas : explication pédagogique */}
          <div
            className={classNames(
              "mt-5 rounded-xl px-3 py-3 text-xs sm:text-[13px] leading-relaxed",
              darkMode
                ? "border border-slate-800/80 bg-slate-950/40 text-slate-300"
                : "border border-slate-200/80 bg-slate-50/90 text-slate-700"
            )}
          >
            <p>
              {t("resources.faq.footerInfo", {
                defaultValue:
                  "Cette FAQ est pensée comme un espace d’aide utilisateur : elle vulgarise les étapes à suivre pour utiliser la plateforme au quotidien. Elle complète la documentation technique et les politiques légales, mais ne les remplace pas.",
              })}
            </p>
          </div>
        </main>

        {/* Bouton retour en haut */}
        {showBackToTop && (
          <button
            type="button"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
            className={classNames(
              "fixed bottom-5 right-4 sm:right-6 inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs shadow-lg",
              darkMode
                ? "border-slate-700/80 bg-slate-900/90 text-slate-100 hover:bg-slate-800/90"
                : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50",
              "backdrop-blur-xl transition"
            )}
          >
            <FiArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
