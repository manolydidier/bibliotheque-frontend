import React from "react";
import { useTranslation } from "react-i18next";
import {
  FiInfo,
  FiUsers,
  FiBookOpen,
  FiShield,
  FiGlobe,
  FiTarget,
  FiCheckCircle,
} from "react-icons/fi";
import Footer from "../UserManagementDashboard/Components/Accueil/Footer";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function AboutPage() {
  const { t } = useTranslation();

  // 🎨 Light mode only
  const pageBg =
    "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900";
  const cardBase =
    "rounded-3xl border shadow-sm shadow-slate-900/5 backdrop-blur-xl";
  const cardBg = "bg-white/80";
  const borderColor = "border-slate-200/80";
  const subtleText = "text-slate-500";
  const headingText = "text-slate-900";

  const features = [
    {
      icon: <FiBookOpen className="h-6 w-6 text-sky-500" />,
      title: t("about.features.access.title", {
        defaultValue: "Accès centralisé aux ressources",
      }),
      body: t("about.features.access.body", {
        defaultValue:
          "Retrouvez en un seul endroit les contenus, documents et outils mis à disposition par l'organisation.",
      }),
      gradient: "from-sky-50 to-sky-100/40",
      badge: t("about.features.access.badge", {
        defaultValue: "Clarté",
      }),
    },
    {
      icon: <FiUsers className="h-6 w-6 text-emerald-500" />,
      title: t("about.features.collaboration.title", {
        defaultValue: "Collaboration et partage",
      }),
      body: t("about.features.collaboration.body", {
        defaultValue:
          "Facilitez le travail en équipe grâce à une structure claire, des parcours utilisateurs simples et une navigation intuitive.",
      }),
      gradient: "from-emerald-50 to-emerald-100/40",
      badge: t("about.features.collaboration.badge", {
        defaultValue: "Efficacité",
      }),
    },
    {
      icon: <FiShield className="h-6 w-6 text-amber-500" />,
      title: t("about.features.security.title", {
        defaultValue: "Sécurité et confidentialité",
      }),
      body: t("about.features.security.body", {
        defaultValue:
          "Les données sont protégées selon les politiques internes : gestion des accès, confidentialité des informations et traçabilité.",
      }),
      gradient: "from-amber-50 to-amber-100/40",
      badge: t("about.features.security.badge", {
        defaultValue: "Fiabilité",
      }),
    },
    {
      icon: <FiGlobe className="h-6 w-6 text-violet-500" />,
      title: t("about.features.inclusion.title", {
        defaultValue: "Accessibilité et inclusion",
      }),
      body: t("about.features.inclusion.body", {
        defaultValue:
          "La plateforme est pensée pour rester lisible, responsive et accessible quel que soit le support utilisé (ordinateur, tablette, mobile).",
      }),
      gradient: "from-violet-50 to-violet-100/40",
      badge: t("about.features.inclusion.badge", {
        defaultValue: "Simplicité",
      }),
    },
  ];

  const quickStats = [
    {
      label: t("about.stats.clarity", { defaultValue: "Clarté du parcours" }),
      value: "95%",
      hint: t("about.stats.clarityHint", {
        defaultValue: "Parcours utilisateur unifié",
      }),
    },
    {
      label: t("about.stats.efficiency", {
        defaultValue: "Efficacité d'accès",
      }),
      value: "×3",
      hint: t("about.stats.efficiencyHint", {
        defaultValue: "Accès plus rapide aux bons contenus",
      }),
    },
    {
      label: t("about.stats.satisfaction", {
        defaultValue: "Satisfaction perçue",
      }),
      value: "4.8/5",
      hint: t("about.stats.satisfactionHint", {
        defaultValue: "Feedback des utilisateurs pilotes",
      }),
    },
  ];

  return (
    <>
    <div className={classNames(pageBg, "min-h-screen py-8 sm:py-12 mt-12")}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-sky-50 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-sky-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
              {t("about.badge", { defaultValue: "À propos" })}
              <span className="text-slate-300">•</span>
              <span>
                {t("about.badgeExtra", {
                  defaultValue: "Conçue avec CARE et SAF/FJKM",
                })}
              </span>
            </div>

            <h1
              className={classNames(
                headingText,
                "text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight"
              )}
            >
              {t("about.headerTitle", {
                defaultValue: "À propos de la plateforme",
              })}
            </h1>

            <p
              className={classNames(
                subtleText,
                "text-sm sm:text-base leading-relaxed"
              )}
            >
              {t("about.headerIntro", {
                defaultValue:
                  "Cette plateforme a été conçue comme un espace unique pour organiser, consulter et valoriser vos ressources numériques, avec une attention particulière portée à la clarté, la simplicité et aux besoins concrets du terrain.",
              })}
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] sm:text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2.5 py-1 text-slate-700 hover:bg-slate-900/10 transition-colors">
                <FiCheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                {t("about.value.clarity", { defaultValue: "Clarté" })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2.5 py-1 text-slate-700 hover:bg-slate-900/10 transition-colors">
                <FiCheckCircle className="h-3.5 w-3.5 text-sky-500" />
                {t("about.value.efficiency", { defaultValue: "Efficacité" })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2.5 py-1 text-slate-700 hover:bg-slate-900/10 transition-colors">
                <FiCheckCircle className="h-3.5 w-3.5 text-violet-500" />
                {t("about.value.simplicity", { defaultValue: "Simplicité" })}
              </span>
            </div>
          </div>

          {/* Illustration principale sticky (héros) */}
          <div className="w-full lg:w-[40%]">
            <div className="lg:sticky lg:top-10">
              <div
                className={classNames(
                  cardBase,
                  cardBg,
                  borderColor,
                  "overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                )}
              >
                <div className="relative h-52 sm:h-60 md:h-64 overflow-hidden">
                  <img
                    src="https://images.pexels.com/photos/1181615/pexels-photo-1181615.jpeg?auto=compress&cs=tinysrgb&w=1600"
                    alt={t("about.heroImage.alt", {
                      defaultValue:
                        "Équipe collaborant autour d'un ordinateur dans un espace de travail lumineux",
                    })}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.05]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent" />
                </div>
                <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2">
                  <p className="text-[11px] sm:text-xs font-medium text-slate-700 uppercase tracking-[0.16em]">
                    {t("about.heroImage.badge", {
                      defaultValue: "Espace documentation utilisateur",
                    })}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600">
                    {t("about.heroImage.caption", {
                      defaultValue:
                        "Une bibliothèque numérique pensée pour les équipes de terrain, les responsables de programme et les partenaires.",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENU */}
        <main className="space-y-8 sm:space-y-10">
          {/* Bloc mission / vision + stats rapides */}
          <section
            className={classNames(
              cardBase,
              cardBg,
              borderColor,
              "p-5 sm:p-6 md:p-7 hover:shadow-md transition-shadow duration-300"
            )}
          >
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)] items-start">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FiTarget className="h-5 w-5 text-sky-500" />
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                    {t("about.missionTitle", {
                      defaultValue: "Objectif et philosophie",
                    })}
                  </h2>
                </div>

                {/* Section dépliable simple */}
                <details className="group rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5 sm:py-4 transition-colors hover:bg-slate-50 cursor-pointer">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
                    <span className="text-sm sm:text-base font-medium text-slate-900">
                      {t("about.missionSummary", {
                        defaultValue: "Pourquoi cette plateforme existe-t-elle ?",
                      })}
                    </span>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/5 text-slate-600 text-xs group-open:rotate-90 transition-transform">
                      ▶
                    </span>
                  </summary>
                  <p className="mt-2.5 text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                    {t("about.missionBody", {
                      defaultValue:
                        "La plateforme vise à rendre les contenus facilement accessibles, structurés et réutilisables. Elle s'adresse aussi bien aux nouveaux utilisateurs qu'aux profils avancés, en proposant un environnement cohérent : documentation, guide d'utilisation, FAQ et politiques légales sont regroupés pour offrir un parcours clair. Elle a été conçue avec soin grâce à la collaboration entre CARE et SAF/FJKM, en tenant compte des besoins concrets des équipes et des partenaires.",
                    })}
                  </p>
                </details>
              </div>

              {/* Stats rapides */}
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-slate-500 mb-1">
                  {t("about.statsTitle", {
                    defaultValue: "Quelques repères clés :",
                  })}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {quickStats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-3.5 sm:py-3 flex flex-col justify-between hover:bg-slate-50 hover:shadow-sm transition-all"
                    >
                      <div className="text-xs sm:text-[13px] font-medium text-slate-600">
                        {stat.label}
                      </div>
                      <div className="mt-1 text-lg sm:text-xl font-semibold text-slate-900">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-[11px] sm:text-xs text-slate-500">
                        {stat.hint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Bloc fonctionnalités clés */}
          <section
            className={classNames(
              cardBase,
              cardBg,
              borderColor,
              "p-5 sm:p-6 md:p-7 hover:shadow-md transition-shadow duration-300"
            )}
          >
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2.5">
              {t("about.featuresTitle", {
                defaultValue: "Fonctionnalités clés",
              })}
            </h2>
            <p className="text-sm sm:text-[15px] text-slate-600 mb-5">
              {t("about.featuresIntro", {
                defaultValue:
                  "Voici quelques éléments qui structurent l'expérience utilisateur sur la plateforme :",
              })}
            </p>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className={classNames(
                    "group relative overflow-hidden rounded-2xl border px-4 py-3.5 sm:px-4.5 sm:py-4 flex gap-3 sm:gap-4 items-start transition-all duration-300",
                    borderColor,
                    `bg-gradient-to-br ${feature.gradient}`,
                    "hover:-translate-y-[2px] hover:shadow-md hover:shadow-slate-900/10"
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm sm:text-[15px] font-semibold text-slate-900">
                        {feature.title}
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-[2px] text-[10px] font-medium text-slate-700 border border-white/80">
                        ✦ {feature.badge}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {feature.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Bloc public / support */}
          <section
            className={classNames(
              cardBase,
              cardBg,
              borderColor,
              "p-5 sm:p-6 md:p-7 hover:shadow-md transition-shadow duration-300"
            )}
          >
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-2 list-none hover:text-sky-600 transition-colors">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-1">
                    {t("about.audienceTitle", {
                      defaultValue: "Pour qui ?",
                    })}
                  </h2>
                  <p className="text-sm sm:text-[15px] text-slate-600">
                    {t("about.audienceIntro", {
                      defaultValue:
                        "Une plateforme pensée pour différents profils d'utilisateurs.",
                    })}
                  </p>
                </div>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/5 text-slate-600 text-xs group-open:rotate-90 transition-transform">
                  ▶
                </span>
              </summary>

              <div className="mt-3 space-y-3 text-sm sm:text-[15px] text-slate-700">
                <p>
                  {t("about.audienceBody", {
                    defaultValue:
                      "L'interface est pensée pour différents profils : lecteurs, contributeurs, administrateurs, partenaires techniques, etc. Chaque utilisateur dispose d'un point d'entrée clair vers les contenus et fonctionnalités qui le concernent.",
                  })}
                </p>
                <p>
                  {t("about.supportHint", {
                    defaultValue:
                      "Pour en savoir plus sur l'utilisation de la plateforme au quotidien, vous pouvez consulter le guide d'utilisation, la documentation détaillée ou la FAQ.",
                  })}
                </p>
              </div>
            </details>
          </section>

          {/* Bloc gouvernance / données */}
          <section
            className={classNames(
              cardBase,
              cardBg,
              borderColor,
              "p-5 sm:p-6 md:p-7 hover:shadow-md transition-shadow duration-300"
            )}
          >
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
              {t("about.governanceTitle", {
                defaultValue: "Gouvernance des données et cadre d'utilisation",
              })}
            </h2>
            <p className="text-sm sm:text-[15px] text-slate-700 mb-3 leading-relaxed">
              {t("about.governanceBody1", {
                defaultValue:
                  "L'utilisation de la plateforme s'inscrit dans un cadre défini par les politiques de confidentialité, les conditions générales d'utilisation et, le cas échéant, les règles de l'organisation ou de l'institution qui la porte.",
              })}
            </p>
            <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">
              {t("about.governanceBody2", {
                defaultValue:
                  "Cette page « À propos » ne remplace pas les textes légaux, mais offre une vue d'ensemble claire et accessible sur l'esprit de la plateforme et ses principaux enjeux pour les utilisateurs.",
              })}
            </p>
          </section>

          {/* 🖼️ Nouvelle section illustration avec image sticky */}
          <section
            className={classNames(
              cardBase,
              cardBg,
              borderColor,
              "p-5 sm:p-6 md:p-7 hover:shadow-md transition-shadow duration-300"
            )}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                  {t("about.illustrationTitle", {
                    defaultValue: "Une plateforme pensée pour le terrain",
                  })}
                </h2>
                <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                  {t("about.illustrationBody1", {
                    defaultValue:
                      "Les contenus ne sont pas seulement rangés : ils sont organisés pour servir de support aux ateliers, aux réunions de coordination, aux formations et au suivi des projets. L'objectif est de réduire le temps passé à chercher les bons fichiers, pour laisser plus de place au travail de fond.",
                  })}
                </p>
                <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                  {t("about.illustrationBody2", {
                    defaultValue:
                      "Grâce à la collaboration entre CARE et SAF/FJKM, la plateforme intègre à la fois les exigences de qualité documentaire et les réalités opérationnelles du terrain, en milieu urbain comme en milieu rural.",
                  })}
                </p>

                <ul className="mt-2 space-y-1.5 text-sm sm:text-[15px] text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-sky-500 mt-0.5">✦</span>
                    <span>{t("about.illustrationPoint1", {
                      defaultValue: "Préparer un atelier en quelques minutes",
                    })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✦</span>
                    <span>{t("about.illustrationPoint2", {
                      defaultValue:
                        "Retrouver facilement les supports validés et à jour",
                    })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">✦</span>
                    <span>{t("about.illustrationPoint3", {
                      defaultValue:
                        "Partager les résultats avec les partenaires en toute transparence",
                    })}</span>
                  </li>
                </ul>
              </div>

              {/* Image sticky à droite */}
              <div className="lg:sticky lg:top-20">
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="relative h-56 sm:h-64 md:h-72 overflow-hidden">
                    <img
                      src="https://images.pexels.com/photos/1181341/pexels-photo-1181341.jpeg?auto=compress&cs=tinysrgb&w=1600"
                      alt={t("about.illustrationAlt", {
                        defaultValue:
                          "Personnes travaillant ensemble avec des documents et un ordinateur sur une table",
                      })}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.06]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent" />
                  </div>
                  <div className="px-4 py-3 sm:px-5 sm:py-4">
                    <p className="text-[11px] sm:text-xs font-medium text-slate-700 uppercase tracking-[0.16em] mb-1">
                      {t("about.illustrationBadge", {
                        defaultValue: "Illustration de l'usage terrain",
                      })}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600">
                      {t("about.illustrationCaption", {
                        defaultValue:
                          "Un espace commun où documents de travail, supports de formation et ressources de plaidoyer restent accessibles au même endroit.",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
      <Footer/>
</>
  );
}