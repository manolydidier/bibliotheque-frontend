// src/pages/LegalPolicies.jsx
import React, { useState, useRef, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FiSearch,
  FiSun,
  FiMoon,
  FiPrinter,
  FiCopy,
  FiX,
  FiChevronRight,
  FiBookmark,
  FiArrowUp,
  FiTrash2,
  FiType,
} from "react-icons/fi";
import { LEGAL_SECTIONS } from "./legalData";

const STORAGE_KEY = "legal_policies_prefs_v1";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadPrefs() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    console.error("Error loading legal preferences:", e);
    return {};
  }
}

export default function LegalPolicies() {
  const { t, i18n } = useTranslation();

  // Charger les préférences une seule fois
  const prefsRef = useRef(loadPrefs());

  const [activeTab, setActiveTab] = useState(prefsRef.current.activeTab || "terms");
  const [darkMode, setDarkMode] = useState(
    typeof prefsRef.current.darkMode === "boolean"
      ? prefsRef.current.darkMode
      : false
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchHistory, setSearchHistory] = useState(
    Array.isArray(prefsRef.current.searchHistory)
      ? prefsRef.current.searchHistory
      : []
  );

  const [highlightEnabled, setHighlightEnabled] = useState(
    typeof prefsRef.current.highlightEnabled === "boolean"
      ? prefsRef.current.highlightEnabled
      : true
  );
  const [copyStatus, setCopyStatus] = useState("idle"); // idle | success | error
  const [highlightId, setHighlightId] = useState(null);
  const [bookmarks, setBookmarks] = useState(
    Array.isArray(prefsRef.current.bookmarks) ? prefsRef.current.bookmarks : []
  );
  const [completedSections, setCompletedSections] = useState(
    Array.isArray(prefsRef.current.completedSections)
      ? prefsRef.current.completedSections
      : []
  );
  const [fontScale, setFontScale] = useState(
    typeof prefsRef.current.fontScale === "number"
      ? prefsRef.current.fontScale
      : 100
  ); // 80 - 150

  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const contentRef = useRef(null);
  const searchInputRef = useRef(null);

  // Config légal depuis i18n
  const config = t("legal.config", { returnObjects: true }) || {};
  const platformName = config.platformName || "Bibliothèque Numérique Mada";
  const lastUpdate = config.lastUpdate || "";
  const jurisdiction = config.jurisdiction || "";
  const contactEmail = config.contactEmail || "contact@example.com";

  // Index de recherche basé sur la langue active
  const searchIndex = useMemo(
    () =>
      LEGAL_SECTIONS.map((item) => ({
        ...item,
        title: t(`${item.i18nKey}.title`),
        body: t(`${item.i18nKey}.body`),
      })),
    [t, i18n.language]
  );

  // Sauvegarde des préférences (mise en page)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefsToSave = {
      activeTab,
      darkMode,
      fontScale,
      bookmarks,
      completedSections,
      highlightEnabled,
      searchHistory,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefsToSave));
    } catch (e) {
      console.error("Error saving legal preferences:", e);
    }
  }, [
    activeTab,
    darkMode,
    fontScale,
    bookmarks,
    completedSections,
    highlightEnabled,
    searchHistory,
  ]);

  // Focus auto sur l’input quand l’overlay de recherche s’ouvre
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Suivi du scroll (progress + section active + bouton back-to-top)
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight =
        (document.documentElement.scrollHeight || 0) - window.innerHeight;

      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
      setShowBackToTop(scrollTop > 320);

      // Scroll spy
      if (contentRef.current) {
        const sections =
          contentRef.current.querySelectorAll("[data-section-id]");
        let currentId = null;
        let minOffset = Infinity;

        sections.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 80 && rect.top < minOffset) {
            minOffset = rect.top;
            currentId = el.getAttribute("data-section-id");
          }
        });

        setActiveSectionId(currentId);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Helper snippet
  const makeSnippet = (text, query) => {
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) {
      return text.slice(0, 140) + (text.length > 140 ? "…" : "");
    }
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + q.length + 60);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = "…" + snippet;
    if (end < text.length) snippet = snippet + "…";
    return snippet;
  };

  const runSearch = (query) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return searchIndex
      .filter((item) =>
        (item.title + " " + item.body).toLowerCase().includes(q)
      )
      .map((item) => ({
        ...item,
        snippet: makeSnippet(item.body, query),
      }));
  };

  const addToSearchHistory = (raw) => {
    const term = raw.trim();
    if (!term) return;
    setSearchHistory((prev) => {
      const exists = prev.find(
        (q) => q.toLowerCase() === term.toLowerCase()
      );
      const filtered = prev.filter(
        (q) => q.toLowerCase() !== term.toLowerCase()
      );
      const base = exists ? filtered : filtered;
      return [term, ...base].slice(0, 10);
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    const results = runSearch(value);
    setSearchResults(results);
    addToSearchHistory(value);
  };

  const scrollToSection = (targetId, targetTab) => {
    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
      setTimeout(() => scrollToSection(targetId), 0);
      return;
    }

    if (!contentRef.current) return;
    const el = contentRef.current.querySelector(
      `[data-section-id="${targetId}"]`
    );
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: y, behavior: "smooth" });

    setHighlightId(targetId);
    setTimeout(() => setHighlightId(null), 1800);
  };

  const handleSearchResultClick = (result) => {
    setIsSearchOpen(false);
    scrollToSection(result.id, result.tab);
  };

  const handleCopy = async () => {
    try {
      const allText = searchIndex
        .map((item) => `${item.title}\n\n${item.body}`)
        .join("\n\n----------------------\n\n");
      await navigator.clipboard.writeText(allText);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 1500);
    } catch (e) {
      console.error(e);
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 1500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleBookmark = (sectionId) => {
    setBookmarks((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleCompleted = (sectionId) => {
    setCompletedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleFontScaleChange = (type) => {
    setFontScale((prev) => {
      if (type === "smaller") return Math.max(80, prev - 10);
      if (type === "larger") return Math.min(150, prev + 10);
      return 100;
    });
  };

  // THEME + GLASS
  const pageBg = darkMode
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
    : "bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-900";

  const cardBg = darkMode ? "bg-slate-900/70" : "bg-white/40";
  const borderColor = darkMode ? "border-slate-800/80" : "border-white/60";
  const subtleText = darkMode ? "text-slate-400" : "text-slate-500";
  const headingText = darkMode ? "text-slate-50" : "text-slate-900";

  const cardBase =
    "rounded-2xl border shadow-sm shadow-slate-900/10 backdrop-blur-xl";

  const tabLabel =
    activeTab === "terms"
      ? t("legal.ui.tabs.terms", {
          defaultValue: "Conditions générales",
        })
      : activeTab === "privacy"
      ? t("legal.ui.tabs.privacy", {
          defaultValue: "Politique de confidentialité",
        })
      : t("legal.ui.tabs.cookies", {
          defaultValue: "Politique des cookies",
        });

  return (
    <div className={classNames(pageBg, "min-h-screen py-6 sm:py-10")}>
      <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {/* <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50/50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {t("legal.ui.badge")}
            </div> */}
            <h1
              className={classNames(
                headingText,
                "text-xl sm:text-2xl font-semibold tracking-tight"
              )}
            >
              {t("legal.ui.headerTitle")}
            </h1>
            <p className={classNames(subtleText, "text-xs sm:text-sm")}>
              {t("legal.ui.headerIntro")}
            </p>
            <p className={classNames(subtleText, "text-xs sm:text-[11px]")}>
              {platformName}
              {lastUpdate
                ? ` • ${t("common.lastUpdate", { defaultValue: lastUpdate })}`
                : ""}
              {jurisdiction ? ` • ${jurisdiction}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mode clair / sombre */}
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

            {/* Bouton recherche mobile (ouvre l’overlay) */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label={t("legal.ui.searchButton", {
                defaultValue: "Rechercher dans les textes",
              })}
              title={t("legal.ui.searchButton", {
                defaultValue: "Rechercher dans les textes",
              })}
              className={classNames(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition backdrop-blur-sm lg:hidden",
                darkMode
                  ? "border-slate-700 bg-slate-900/80 hover:bg-slate-800"
                  : "border-slate-200/80 bg-white/80 hover:bg-white"
              )}
            >
              <FiSearch className="h-4 w-4" />
              <span>{t("legal.ui.searchButton", { defaultValue: "Recherche" })}</span>
            </button>
          </div>
        </header>

        {/* Barre de progression de lecture */}
        <div className="mb-4 h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-800/70 overflow-hidden backdrop-blur-sm">
          <div
            className="h-full rounded-full bg-sky-500/80 transition-[width] duration-200"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* TABS + CONTROLES */}
        <div className={classNames(cardBase, cardBg, borderColor, "mb-4 sm:mb-6")}>
          <div className="flex flex-col gap-2 border-b border-transparent px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Tabs – version glass + contrastée */}
              <div
                className={classNames(
                  "inline-flex items-center rounded-2xl border px-1.5 py-1 text-[11px] sm:text-xs backdrop-blur-md shadow-sm",
                  darkMode
                    ? "bg-slate-900/70 border-slate-700/80 shadow-black/30"
                    : "bg-white/55 border-white/80 shadow-slate-900/10"
                )}
              >
                {["terms", "privacy", "cookies"].map((tab) => {
                  const isActive = activeTab === tab;
                  const label =
                    tab === "terms"
                      ? t("legal.ui.tabs.terms", {
                          defaultValue: "Conditions générales",
                        })
                      : tab === "privacy"
                      ? t("legal.ui.tabs.privacy", {
                          defaultValue: "Politique de confidentialité",
                        })
                      : t("legal.ui.tabs.cookies", {
                          defaultValue: "Politique des cookies",
                        });

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={classNames(
                        "relative inline-flex items-center rounded-2xl px-3 sm:px-3.5 py-1.5 font-medium transition-all",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-0",
                        isActive
                          ? darkMode
                            ? "bg-gradient-to-r from-sky-500/80 to-indigo-500/80 text-white shadow-md shadow-sky-500/40"
                            : "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/40"
                          : darkMode
                          ? "text-slate-300 hover:bg-slate-800/80"
                          : "text-slate-700 hover:bg-slate-100/80"
                      )}
                    >
                      <span className="whitespace-nowrap">{label}</span>
                      {isActive && (
                        <span
                          className={classNames(
                            "pointer-events-none absolute -bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full",
                            darkMode
                              ? "bg-sky-400/90"
                              : "bg-sky-500/90"
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Contrôles : taille de police + surlignage */}
              <div className="flex items-center gap-2 text-[11px]">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/70 px-2 py-1 backdrop-blur-sm">
                  <FiType className="h-3.5 w-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => handleFontScaleChange("smaller")}
                    className="px-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  >
                    A-
                  </button>
                  <span className="px-1 text-[10px] tabular-nums">
                    {fontScale}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFontScaleChange("larger")}
                    className="px-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  >
                    A+
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setHighlightEnabled((v) => !v)}
                  className={classNames(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1",
                    highlightEnabled
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/70 dark:bg-emerald-900/40 dark:text-emerald-100"
                      : "border-slate-200/80 bg-white/60 text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300"
                  )}
                >
                  <span className="text-[10px]">
                    {t("legal.ui.highlightToggle", {
                      defaultValue: "Surlignage",
                    })}
                  </span>
                  <span
                    className={classNames(
                      "inline-flex h-3.5 w-6 items-center rounded-full p-[1px] transition-colors",
                      highlightEnabled
                        ? "bg-emerald-500/70"
                        : "bg-slate-400/60"
                    )}
                  >
                    <span
                      className={classNames(
                        "h-3 w-3 rounded-full bg-white shadow-sm transition-transform",
                        highlightEnabled ? "translate-x-2.5" : "translate-x-0"
                      )}
                    />
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={classNames(subtleText, "text-[11px] sm:text-xs")}>
                {t("legal.ui.searchHint")}
              </p>
              <p className={classNames(subtleText, "text-[11px] sm:text-xs")}>
                {t("legal.ui.readingNow", {
                  defaultValue: "Vous lisez : {{tab}}",
                  tab: tabLabel,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* CONTENU PRINCIPAL */}
        <main
          ref={contentRef}
          className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]"
        >
          {/* Colonne principale */}
          <section
            className={classNames(
              cardBase,
              cardBg,
              borderColor,
              "px-4 sm:px-6 py-4 sm:py-5 overflow-hidden transition-opacity duration-200"
            )}
          >
            <SectionList
              tab={activeTab}
              darkMode={darkMode}
              highlightId={highlightId}
              searchQuery={searchQuery}
              bookmarks={bookmarks}
              completedSections={completedSections}
              highlightEnabled={highlightEnabled}
              onToggleBookmark={toggleBookmark}
              onToggleCompleted={toggleCompleted}
              fontScale={fontScale}
            />
          </section>

          {/* Colonne droite : sommaire + recherche */}
          <aside
            className={classNames(
              cardBase,
              cardBg,
              borderColor,
              "hidden lg:flex flex-col px-4 py-4"
            )}
          >
            {/* Table des matières enrichie avec fond bien visible */}
            <TableOfContents
              activeTab={activeTab}
              darkMode={darkMode}
              bookmarks={bookmarks}
              activeSectionId={activeSectionId}
              completedSections={completedSections}
              onNavigate={scrollToSection}
            />

            {/* Bloc recherche */}
            <div className="mt-4 flex items-center justify-between gap-2 mb-2">
              <div>
                <h2
                  className={classNames(
                    headingText,
                    "text-sm font-semibold tracking-tight"
                  )}
                >
                  {t("legal.ui.searchButton")}
                </h2>
                <p className={classNames(subtleText, "text-[11px] mt-0.5")}>
                  {t("legal.ui.searchHint")}
                </p>
              </div>
              <FiSearch className={classNames(subtleText, "h-4 w-4")} />
            </div>

            {/* Champ de recherche */}
            <div className="mb-3">
              <div
                className={classNames(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-sm z-0",
                  darkMode
                    ? "border-slate-700 bg-slate-900/80"
                    : "border-slate-200/80 bg-white/80"
                )}
              >
                <FiSearch
                  className={classNames(
                    subtleText,
                    "h-3.5 w-3.5 flex-shrink-0"
                  )}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={t("legal.ui.searchPlaceholder")}
                  aria-label={t("legal.ui.searchPlaceholder")}
                  className={classNames(
                    "flex-1 bg-transparent text-xs outline-none z-1",
                    darkMode ? "text-slate-50" : "text-slate-900"
                  )}
                />
              </div>
            </div>

            {/* Historique de recherche */}
            {searchHistory.length > 0 && (
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className={subtleText}>
                    {t("legal.ui.searchHistoryTitle", {
                      defaultValue: "Dernières recherches",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={clearSearchHistory}
                    className={classNames(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10px] transition",
                      darkMode
                        ? "border-slate-700 text-slate-300 hover:bg-slate-800/80"
                        : "border-slate-200 text-slate-500 hover:bg-slate-100/80"
                    )}
                  >
                    <FiTrash2 className="h-3 w-3" />
                    <span>
                      {t("legal.ui.clearHistory", {
                        defaultValue: "Effacer",
                      })}
                    </span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {searchHistory.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setSearchQuery(term);
                        const res = runSearch(term);
                        setSearchResults(res);
                      }}
                      className={classNames(
                        "rounded-full border px-2 py-[2px] text-[11px] transition",
                        darkMode
                          ? "border-slate-700 text-slate-200 hover:bg-slate-800/80"
                          : "border-slate-200 text-slate-700 hover:bg-white"
                      )}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Résultats de recherche */}
            <div className="flex-1 overflow-auto space-y-1.5 text-xs pr-1">
              <SearchResults
                searchQuery={searchQuery}
                searchResults={searchResults}
                onResultClick={handleSearchResultClick}
                darkMode={darkMode}
                highlightEnabled={highlightEnabled}
              />
            </div>

            <footer className="mt-3 border-t border-slate-200/60 dark:border-slate-800/80 pt-2">
              <p className={classNames(subtleText, "text-[11px]")}>
                {t("legal.ui.footerQuestion", { email: contactEmail })}
              </p>
            </footer>
          </aside>
        </main>

        {/* FOOTER : Print + Copy (actions globales) */}
        <footer className="mt-4 sm:mt-6 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={handlePrint}
            aria-label={t("legal.ui.printFull", {
              defaultValue: "Imprimer la page",
            })}
            title={t("legal.ui.printFull", {
              defaultValue: "Imprimer la page",
            })}
            className={classNames(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
              "border-slate-200/80 bg-white/70 hover:bg-white hover:border-slate-300",
              "shadow-sm shadow-slate-900/10 backdrop-blur-sm"
            )}
          >
            <FiPrinter className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            aria-label={t("legal.ui.copyAll", {
              defaultValue: "Copier tout le contenu",
            })}
            title={t("legal.ui.copyAll", {
              defaultValue: "Copier tout le contenu",
            })}
            className={classNames(
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
              "border-slate-200/80 bg-white/70 hover:bg-white hover:border-slate-300",
              "shadow-sm shadow-slate-900/10 backdrop-blur-sm"
            )}
          >
            <FiCopy className="h-4 w-4" aria-hidden="true" />
          </button>
        </footer>

        {/* Bouton retour en haut */}
        {showBackToTop && (
          <button
            type="button"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
            className={classNames(
              "fixed bottom-5 right-4 sm:right-6 inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs shadow-lg",
              "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50",
              "dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800/90",
              "backdrop-blur-xl transition"
            )}
          >
            <FiArrowUp className="h-4 w-4" />
          </button>
        )}

        {/* Overlay de recherche mobile / tablette */}
        {isSearchOpen && (
          <SearchOverlay
            darkMode={darkMode}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchHistory={searchHistory}
            onClose={() => setIsSearchOpen(false)}
            onChange={handleSearchChange}
            onResultClick={handleSearchResultClick}
            onHistoryClick={(term) => {
              setSearchQuery(term);
              const res = runSearch(term);
              setSearchResults(res);
            }}
            onClearHistory={clearSearchHistory}
            highlightEnabled={highlightEnabled}
            searchInputRef={searchInputRef}
          />
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------
 * LISTE DE SECTIONS (DRY)
 * -------------------------------------------------- */
function SectionList({
  tab,
  darkMode,
  highlightId,
  searchQuery,
  bookmarks,
  completedSections,
  highlightEnabled,
  onToggleBookmark,
  onToggleCompleted,
  fontScale,
}) {
  const { t } = useTranslation();
  const sections = LEGAL_SECTIONS.filter((s) => s.tab === tab);

  const baseSection =
    "transition-colors duration-500 rounded-xl px-2 -mx-1 sm:-mx-2";

  // tailles dynamiques en fonction du % choisi
  const paragraphStyle = {
    fontSize: `${fontScale / 100}rem`, // 100 -> 1rem, 150 -> 1.5rem
  };
  const headingStyle = {
    fontSize: `${(fontScale / 100) * 1.1}rem`,
  };

  if (!sections.length) {
    return (
      <p
        className={classNames(
          darkMode ? "text-slate-300" : "text-slate-600",
          "text-sm"
        )}
      >
        {t("legal.ui.noSections", {
          defaultValue: "Aucune section disponible.",
        })}
      </p>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {sections.map((section) => {
        const title = t(`${section.i18nKey}.title`);
        const body = t(`${section.i18nKey}.body`);
        const paragraphs = body.split("\n\n");
        const isBookmarked = bookmarks.includes(section.id);
        const isCompleted = completedSections.includes(section.id);

        return (
          <section
            key={section.id}
            id={section.id}
            data-section-id={section.id}
            className={classNames(
              baseSection,
              "pt-1.5 pb-2 sm:pb-2.5",
              highlightId === section.id
                ? darkMode
                  ? "bg-sky-500/10"
                  : "bg-sky-100/80"
                : ""
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2
                  style={headingStyle}
                  className={classNames(
                    "font-semibold",
                    darkMode ? "text-slate-50" : "text-gray-900"
                  )}
                >
                  <HighlightedText
                    text={title}
                    query={searchQuery}
                    enable={highlightEnabled}
                  />
                </h2>

                {/* Badges de statut */}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  {isCompleted && (
                    <span
                      className={classNames(
                        "inline-flex items-center rounded-full px-2 py-[2px] font-medium",
                        "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      )}
                    >
                      ●{" "}
                      {t("legal.ui.sectionDone", {
                        defaultValue: "Lu",
                      })}
                    </span>
                  )}
                  {isBookmarked && (
                    <span
                      className={classNames(
                        "inline-flex items-center rounded-full px-2 py-[2px] font-medium",
                        "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                      )}
                    >
                      ★{" "}
                      {t("legal.ui.sectionFav", {
                        defaultValue: "Favori",
                      })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {/* Favori */}
                <button
                  type="button"
                  onClick={() => onToggleBookmark(section.id)}
                  aria-label={
                    isBookmarked
                      ? "Retirer des favoris"
                      : "Ajouter aux favoris"
                  }
                  className={classNames(
                    "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition",
                    darkMode
                      ? "border-slate-700 text-slate-300 hover:bg-slate-800/80"
                      : "border-slate-200 text-slate-500 hover:bg-slate-100/80"
                  )}
                >
                  <FiBookmark
                    className={classNames(
                      "h-3.5 w-3.5",
                      isBookmarked
                        ? "text-amber-500 fill-amber-400"
                        : "text-inherit"
                    )}
                  />
                </button>

                {/* Marquer lu */}
                <button
                  type="button"
                  onClick={() => onToggleCompleted(section.id)}
                  aria-label={
                    isCompleted
                      ? t("legal.ui.markUnread", {
                          defaultValue: "Marquer comme non lu",
                        })
                      : t("legal.ui.markRead", {
                          defaultValue: "Marquer comme lu",
                        })
                  }
                  className={classNames(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition",
                    isCompleted
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/70 dark:bg-emerald-900/40 dark:text-emerald-100"
                      : darkMode
                      ? "border-slate-700 text-slate-300 hover:bg-slate-800/80"
                      : "border-slate-200 text-slate-500 hover:bg-slate-100/80"
                  )}
                >
                  <span className="text-[10px]">
                    {isCompleted ? "✓" : "•"}
                  </span>
                </button>
              </div>
            </div>

            {paragraphs.map((p, idx) => (
              <p
                key={idx}
                style={paragraphStyle}
                className={classNames(
                  "mt-1.5 leading-relaxed",
                  darkMode ? "text-slate-300" : "text-gray-700"
                )}
              >
                <HighlightedText
                  text={p}
                  query={searchQuery}
                  enable={highlightEnabled}
                />
              </p>
            ))}
          </section>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------
 * HIGHLIGHT TEXTE
 * -------------------------------------------------- */
function HighlightedText({ text, query, enable = true }) {
  if (!enable || !query || !query.trim()) return text;

  const safeQuery = escapeRegExp(query.trim());
  if (!safeQuery) return text;

  const regex = new RegExp(`(${safeQuery})`, "ig");
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  const lowerQuery = query.trim().toLowerCase();

  return (
    <>
      {parts.map((part, index) => {
        if (part.toLowerCase() === lowerQuery) {
          return (
            <mark
              key={index}
              className="rounded px-0.5 bg-yellow-200/70 text-inherit"
            >
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

/* --------------------------------------------------
 * RÉSULTATS DE RECHERCHE
 * -------------------------------------------------- */
function SearchResults({
  searchQuery,
  searchResults,
  onResultClick,
  darkMode,
  highlightEnabled,
}) {
  const { t } = useTranslation();
  const subtleText = darkMode ? "text-slate-400" : "text-slate-500";

  if (!searchQuery.trim()) {
    return (
      <p className={classNames(subtleText, "text-[11px]")}>
        {t("legal.ui.searchEmpty")}
      </p>
    );
  }

  if (!searchResults.length) {
    return (
      <p className={classNames(subtleText, "text-[11px]")}>
        {t("legal.ui.searchNoResult", { query: searchQuery })}
      </p>
    );
  }

  return (
    <>
      <p className={classNames(subtleText, "text-[11px] mb-1")}>
        {t("legal.ui.searchResultsCount", {
          defaultValue:
            "{{count}} résultat(s) trouvé(s) dans les documents légaux.",
          count: searchResults.length,
        })}
      </p>
      {searchResults.map((result) => (
        <button
          key={result.id}
          type="button"
          onClick={() => onResultClick(result)}
          className={classNames(
            "w-full text-left rounded-xl border px-2.5 py-2 transition group backdrop-blur-sm",
            darkMode
              ? "border-slate-800/80 bg-slate-900/60 hover:bg-slate-900"
              : "border-slate-200/80 bg-slate-50/80 hover:bg-white"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={classNames(
                "inline-flex items-center rounded-full px-1.5 py-[2px] text-[10px] font-medium",
                result.tab === "terms"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200"
                  : result.tab === "privacy"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
              )}
            >
              {result.tab === "terms" &&
                t("legal.ui.tabs.terms", {
                  defaultValue: "Conditions générales",
                })}
              {result.tab === "privacy" &&
                t("legal.ui.tabs.privacy", {
                  defaultValue: "Politique de confidentialité",
                })}
              {result.tab === "cookies" &&
                t("legal.ui.tabs.cookies", {
                  defaultValue: "Politique des cookies",
                })}
            </span>
            <FiChevronRight
              className={classNames(
                "h-3.5 w-3.5 flex-shrink-0 transition",
                subtleText,
                "group-hover:translate-x-0.5"
              )}
            />
          </div>
          <p
            className={classNames(
              "mt-1 text-[11px] font-semibold line-clamp-1",
              darkMode ? "text-slate-50" : "text-slate-900"
            )}
          >
            <HighlightedText
              text={result.title}
              query={searchQuery}
              enable={highlightEnabled}
            />
          </p>
          <p
            className={classNames(
              "mt-1 text-[11px] line-clamp-3",
              subtleText
            )}
          >
            <HighlightedText
              text={result.snippet}
              query={searchQuery}
              enable={highlightEnabled}
            />
          </p>
        </button>
      ))}
    </>
  );
}

/* --------------------------------------------------
 * TABLE DES MATIÈRES (Sommaire)
 * -------------------------------------------------- */
function TableOfContents({
  activeTab,
  darkMode,
  bookmarks,
  completedSections,
  activeSectionId,
  onNavigate,
}) {
  const { t } = useTranslation();
  const sections = LEGAL_SECTIONS.filter((s) => s.tab === activeTab);
  const subtleText = darkMode ? "text-slate-400" : "text-slate-500";
  const headingText = darkMode ? "text-slate-50" : "text-slate-900";

  if (!sections.length) return null;

  const bookmarkedSections = sections.filter((s) =>
    bookmarks.includes(s.id)
  );

  return (
    <div
      className={classNames(
        "sticky top-4 rounded-2xl p-3 sm:p-4 border backdrop-blur-xl z-50",
        darkMode
          ? "bg-slate-950/85 border-slate-800/20 shadow-sm shadow-black/40"
          : "bg-white/90 border-slate-200 shadow-sm shadow-slate-900/10"
      )}
    >
      <h2
        className={classNames(
          headingText,
          "text-xs font-semibold uppercase tracking-wide mb-1.5"
        )}
      >
        {t("legal.ui.tocTitle", { defaultValue: "Sommaire" })}
      </h2>
      <p className={classNames(subtleText, "text-[11px] mb-2")}>
        {t("legal.ui.tocHint", {
          defaultValue: "Cliquez pour accéder à une section précise.",
        })}
      </p>

      {/* Favoris */}
      {bookmarkedSections.length > 0 && (
        <div className="mb-3">
          <p
            className={classNames(
              subtleText,
              "text-[11px] font-medium mb-1 flex items-center gap-1"
            )}
          >
            <FiBookmark className="h-3.5 w-3.5 text-amber-500" />
            {t("legal.ui.bookmarksTitle", { defaultValue: "Favoris" })}
          </p>
          <nav className="space-y-1 text-xs mb-2">
            {bookmarkedSections.map((section) => {
              const isCompleted = completedSections.includes(section.id);
              const isActive = activeSectionId === section.id;
              return (
                <button
                  key={`bm-${section.id}`}
                  type="button"
                  onClick={() => onNavigate(section.id, section.tab)}
                  className={classNames(
                    "w-full text-left rounded-xl border px-2.5 py-1.5 transition text-[11px]",
                    isActive
                      ? darkMode
                        ? "border-amber-400 bg-amber-500/20 text-amber-50"
                        : "border-amber-500 bg-amber-100 text-amber-900"
                      : darkMode
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                      : "border-amber-200/80 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
                  )}
                >
                  {t(`${section.i18nKey}.title`)}
                  {isCompleted && " • ✓"}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Toutes les sections */}
      <p
        className={classNames(
          subtleText,
          "text-[11px] font-medium mb-1 mt-1"
        )}
      >
        {t("legal.ui.tocSections", { defaultValue: "Sections" })}
      </p>
      <nav className="space-y-1.5 text-xs">
        {sections.map((section) => {
          const isActive = activeSectionId === section.id;
          const isCompleted = completedSections.includes(section.id);

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onNavigate(section.id, section.tab)}
              className={classNames(
                "w-full text-left rounded-xl border px-2.5 py-1.5 transition text-[11px]",
                isActive
                  ? darkMode
                    ? "border-sky-500 bg-sky-500/20 text-sky-50"
                    : "border-sky-500 bg-sky-100 text-sky-900"
                  : darkMode
                  ? "border-slate-800/80 bg-slate-900/60 hover:bg-slate-900"
                  : "border-slate-200/80 bg-white/70 hover:bg-white"
              )}
            >
              {t(`${section.i18nKey}.title`)}
              {isCompleted && " • ✓"}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* --------------------------------------------------
 * OVERLAY DE RECHERCHE (MOBILE / TABLETTE)
 * -------------------------------------------------- */
function SearchOverlay({
  darkMode,
  searchQuery,
  searchResults,
  searchHistory,
  onChange,
  onClose,
  onResultClick,
  onHistoryClick,
  onClearHistory,
  highlightEnabled,
  searchInputRef,
}) {
  const { t } = useTranslation();

  const subtleText = darkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = darkMode ? "bg-slate-900/85" : "bg-white/80";
  const borderColor = darkMode ? "border-slate-800/80" : "border-white/60";

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md lg:hidden transition-opacity"
      onClick={handleBackdropClick}
    >
      <div
        className={classNames(
          cardBg,
          borderColor,
          "w-full max-w-lg rounded-t-2xl sm:rounded-2xl border shadow-xl shadow-black/40 px-4 py-3 sm:px-5 sm:py-4 max-h-[80vh] flex flex-col backdrop-blur-xl transform transition-transform duration-200 translate-y-0"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold">
              {t("legal.ui.searchButton")}
            </h2>
            <p className={classNames(subtleText, "text-[11px] mt-0.5")}>
              {t("legal.ui.searchHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            title={t("common.close")}
            className={classNames(
              "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs backdrop-blur-sm",
              darkMode
                ? "border-slate-700 text-slate-300 hover:bg-slate-800/80"
                : "border-slate-200/80 text-slate-600 hover:bg-slate-100/80"
            )}
          >
            <FiX className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Champ de recherche */}
        <div className="mb-3">
          <div
            className={classNames(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-sm",
              darkMode
                ? "border-slate-700 bg-slate-900/80"
                : "border-slate-200/80 bg-white/80"
            )}
          >
            <FiSearch
              className={classNames(
                subtleText,
                "h-3.5 w-3.5 flex-shrink-0"
              )}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={onChange}
              placeholder={t("legal.ui.searchPlaceholder")}
              aria-label={t("legal.ui.searchPlaceholder")}
              className={classNames(
                "flex-1 bg-transparent text-xs outline-none",
                darkMode ? "text-slate-50" : "text-slate-900"
              )}
            />
          </div>
        </div>

        {/* Historique mobile */}
        {searchHistory.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className={subtleText}>
                {t("legal.ui.searchHistoryTitle", {
                  defaultValue: "Dernières recherches",
                })}
              </span>
              <button
                type="button"
                onClick={onClearHistory}
                className={classNames(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10px] transition",
                  darkMode
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800/80"
                    : "border-slate-200 text-slate-500 hover:bg-slate-100/80"
                )}
              >
                <FiTrash2 className="h-3 w-3" />
                <span>
                  {t("legal.ui.clearHistory", {
                    defaultValue: "Effacer",
                  })}
                </span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {searchHistory.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => onHistoryClick(term)}
                  className={classNames(
                    "rounded-full border px-2 py-[2px] text-[11px] transition",
                    darkMode
                      ? "border-slate-700 text-slate-200 hover:bg-slate-800/80"
                      : "border-slate-200 text-slate-700 hover:bg-white"
                  )}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto space-y-1.5 text-xs pb-1 mt-1">
          <SearchResults
            searchQuery={searchQuery}
            searchResults={searchResults}
            darkMode={darkMode}
            highlightEnabled={highlightEnabled}
            onResultClick={(result) => {
              onResultClick(result);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
