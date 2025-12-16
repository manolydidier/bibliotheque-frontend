// src/pages/HomeMiradia.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

// ⚠️ Vérifie bien le chemin : "components" avec un S

import Slide from './Slider';
import NavBarMiradia from '../../component/navbar/NavbarMiradia';
import Footer from './Footer';
import ContactPage from '../UserManagementDashboard/Components/Accueil/Contact';
import Objectif from '../UserManagementDashboard/Components/Accueil/objectif';
import PartnersStrip from '../UserManagementDashboard/Components/Accueil/PartnersStrip';
import OrganigrammeMIRADIA from './organigramme/OrganigrammeMIRADIA';

const HomeMiradia = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <NavBarMiradia />

      <main className="pt-20">
        {/* HERO = enfant Slide */}
        <Slide />

        {/* Section fonctionnalités */}
        <section
          id="features"
          className="
            relative py-16 md:py-20
            border-t border-slate-200/70 dark:border-slate-800/80
            bg-white/80 dark:bg-slate-950
            transition-colors duration-300
          "
        >
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <h2 className="text-xl md:text-2xl font-semibold mb-2">
              {t('features.title', 'Pensé pour le terrain et les décideurs')}
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 mb-8 max-w-2xl">
              {t(
                'features.subtitle',
                'Miradia simplifie la collecte, le classement et la restitution des données issues de formulaires, rapports et pièces justificatives.'
              )}
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                title={t('features.card1.title', 'Formulaires et rapports')}
                desc={t(
                  'features.card1.desc',
                  'Templates adaptés à vos protocoles : supervision CSB, suivi de projet, reporting communautaire…'
                )}
              />
              <FeatureCard
                title={t('features.card2.title', 'Pièces jointes et preuves')}
                desc={t(
                  'features.card2.desc',
                  'Photos, PDF, signatures, notes vocales… le tout lié au bon rapport, sans perte.'
                )}
              />
              <FeatureCard
                title={t('features.card3.title', 'Synthèses automatiques')}
                desc={t(
                  'features.card3.desc',
                  'Consolidation par zone, période, projet : prêt pour vos rapports internes et bailleurs.'
                )}
              />
            </div>
          </div>
        </section>

        {/* Section workflow */}
        <section
          id="workflow"
          className="
            relative py-16 md:py-20
            bg-slate-50 dark:bg-gradient-to-b
            dark:from-slate-950 dark:via-slate-950 dark:to-slate-950
            transition-colors duration-300
          "
        >
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <h2 className="text-xl md:text-2xl font-semibold mb-2">
              {t('workflow.title', 'Un flux simple, de la collecte à la décision')}
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 mb-8 max-w-2xl">
              {t(
                'workflow.subtitle',
                'Miradia accompagne chaque étape : saisie sur le terrain, validation, centralisation, analyse.'
              )}
            </p>

            <div className="grid md:grid-cols-4 gap-4 md:gap-5 text-sm">
              <StepCard
                step="1"
                title={t('workflow.step1.title', 'Saisie terrain')}
                desc={t(
                  'workflow.step1.desc',
                  'Les agents saisissent les formulaires et attachent les preuves même hors connexion.'
                )}
              />
              <StepCard
                step="2"
                title={t('workflow.step2.title', 'Validation')}
                desc={t(
                  'workflow.step2.desc',
                  'Le back-office vérifie, commente et valide les rapports selon vos règles internes.'
                )}
              />
              <StepCard
                step="3"
                title={t('workflow.step3.title', 'Consolidation')}
                desc={t(
                  'workflow.step3.desc',
                  'Les données sont regroupées par projet, district, CSB ou période.'
                )}
              />
              <StepCard
                step="4"
                title={t('workflow.step4.title', 'Décision')}
                desc={t(
                  'workflow.step4.desc',
                  'Tableaux, exports et indicateurs pour piloter et rendre compte aux partenaires.'
                )}
              />
            </div>
          </div>
        </section>

        {/* Section pricing */}
        <section
          id="pricing"
          className="
            relative py-16 md:py-20
            border-t border-slate-200/70 dark:border-slate-800/80
            bg-white/80 dark:bg-slate-950
            transition-colors duration-300
          "
        >
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <h2 className="text-xl md:text-2xl font-semibold mb-2">
              {t('pricing.title', 'Une tarification adaptée aux projets')}
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 mb-8 max-w-2xl">
              {t(
                'pricing.subtitle',
                'Miradia se module selon votre taille de projet, nombre de sites et besoins d’accompagnement.'
              )}
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <PricingCard
                label={t('pricing.card1.label', 'Pilote')}
                desc={t(
                  'pricing.card1.desc',
                  'Pour tester sur une zone ou un projet limité.'
                )}
              />
              <PricingCard
                highlight
                label={t('pricing.card2.label', 'Programme')}
                desc={t(
                  'pricing.card2.desc',
                  'Pour les ONG, institutions et programmes multi-sites.'
                )}
              />
              <PricingCard
                label={t('pricing.card3.label', 'Sur-mesure')}
                desc={t(
                  'pricing.card3.desc',
                  'Intégrations avancées, multi-pays, accompagnement long terme.'
                )}
              />
            </div>
          </div>
        </section>

        {/* Section contact */}
        <section
          id="contact"
          className="
            relative py-16 md:py-20
            border-t border-slate-200/70 dark:border-slate-800/80
            bg-slate-50 dark:bg-slate-950
            transition-colors duration-300
          "
        >
          <div className="max-w-3xl mx-auto px-4 md:px-6">
            <h2 className="text-xl md:text-2xl font-semibold mb-2">
              {t('contact.title', 'Parlons de votre contexte')}
            </h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 mb-6">
              {t(
                'contact.subtitle',
                'Expliquez-nous vos réalités terrain (zones, équipes, types de formulaires) et nous verrons comment adapter Miradia.'
              )}
            </p>

            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 p-5 md:p-6 space-y-3 transition-colors duration-300">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  'contact.placeholder',
                  'Ici tu pourras brancher ton vrai formulaire de contact (Miradia), ou un lien vers ton back-office / API.'
                )}
              </p>
            </div>
          </div>
        </section>
      </main>
      <Objectif />
       <PartnersStrip/>
       <OrganigrammeMIRADIA/>
      <ContactPage/>
      <Footer/>
    </div>
  );
};

const FeatureCard = ({ title, desc }) => (
  <div
    className="
      rounded-2xl border
      border-slate-200 bg-white/80
      dark:border-slate-800 dark:bg-slate-900/80
      p-4 md:p-5 flex flex-col gap-2
      transition-colors duration-300
    "
  >
    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
  </div>
);

const StepCard = ({ step, title, desc }) => (
  <div
    className="
      rounded-2xl border
      border-slate-200 bg-white/80
      dark:border-slate-800 dark:bg-slate-900/80
      p-4 flex flex-col gap-2
      transition-colors duration-300
    "
  >
    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500 text-[11px] font-semibold text-slate-950">
      {step}
    </div>
    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
  </div>
);

const PricingCard = ({ label, desc, highlight }) => (
  <div
    className={`
      rounded-2xl p-4 md:p-5 border transition-colors duration-300
      ${
        highlight
          ? 'border-cyan-400/70 bg-white dark:bg-slate-900/90 shadow-[0_18px_60px_rgba(8,47,73,.9)]'
          : 'border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80'
      }
    `}
  >
    <div className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-900/80 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 mb-3">
      {label}
    </div>
    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{desc}</p>
    <p className="text-[11px] text-slate-500 dark:text-slate-400">
      Sur devis selon votre contexte.
    </p>
  </div>
);

export default HomeMiradia;
