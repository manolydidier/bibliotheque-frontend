// src/pages/HomeMiradia.jsx
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import Slide from "./Slider";
import Footer from "./Footer";

import OrganigrammeMIRADIA from "./organigramme/OrganigrammeMIRADIA";
import PartnersStrip from "./partenairemiradia/PartnersStrip";
import Objectif from "./objectifmiradia/Objectif";
import ContactPage from "./contact/Contact";
import NavBarMiradia from "../../component/navbar/NavbarMiradia";
import ArticleMiradiaPublic from "./articles/ArticleMiradiaPublic";
import Organisation from "./organigramme/Organisation";

/* ─────────────────────────────────────────────
   Hook : déclenche une classe CSS au scroll
───────────────────────────────────────────── */
const useScrollReveal = (options = {}) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el); // déclenche une seule fois
        }
      },
      { threshold: 0.12, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
};

/* ─────────────────────────────────────────────
   Wrapper animé — chaque section l'utilise
───────────────────────────────────────────── */
const AnimatedSection = ({ id, children, animation = "fade-up", delay = 0 }) => {
  const ref = useScrollReveal();

  return (
    <section
      id={id}
      ref={ref}
      className={`reveal reveal--${animation}`}
      style={{ "--delay": `${delay}ms` }}
    >
      {children}
    </section>
  );
};

/* ─────────────────────────────────────────────
   Styles d'animation injectés une seule fois
───────────────────────────────────────────── */
const AnimationStyles = () => (
  <style>{`
    /* ── Base : invisible avant trigger ── */
    .reveal {
      opacity: 0;
      transition:
        opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) var(--delay, 0ms),
        transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) var(--delay, 0ms);
      will-change: opacity, transform;
    }

    /* ── Variantes ── */
    .reveal--fade-up    { transform: translateY(40px); }
    .reveal--fade-down  { transform: translateY(-40px); }
    .reveal--fade-left  { transform: translateX(-50px); }
    .reveal--fade-right { transform: translateX(50px); }
    .reveal--zoom-in    { transform: scale(0.94); }
    .reveal--fade       { transform: none; }

    /* ── État visible ── */
    .reveal.is-visible {
      opacity: 1;
      transform: translate(0, 0) scale(1);
    }

    /* ── Hero : pas de délai, apparition immédiate ── */
    #hero {
      opacity: 1 !important;
      transform: none !important;
    }
  `}</style>
);

/* ─────────────────────────────────────────────
   Composant principal
───────────────────────────────────────────── */
const HomeMiradia = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <AnimationStyles />

      <NavBarMiradia />

      {/* Hero — toujours visible, pas d'animation de masquage */}
      <section id="hero">
        <Slide />
      </section>

      {/* Objectif — remonte depuis le bas */}
      <AnimatedSection id="objectif" animation="fade-up">
        <Objectif />
      </AnimatedSection>

      {/* Actualités — légère apparition avec zoom */}
      <AnimatedSection id="actualites" animation="zoom-in" delay={50}>
        <ArticleMiradiaPublic />
      </AnimatedSection>

      {/* Partenaires — glisse depuis la gauche */}
      <AnimatedSection id="partners" animation="fade-left">
        <PartnersStrip />
      </AnimatedSection>

      {/* Organigramme — remonte depuis le bas */}
      <AnimatedSection id="organigramme" animation="fade-up" delay={80}>
        <OrganigrammeMIRADIA />
      </AnimatedSection>

      {/* Organisation — glisse depuis la droite */}
      <AnimatedSection id="organisation" animation="fade-right">
        <Organisation />
      </AnimatedSection>

      {/* Contact — simple fondu */}
      <AnimatedSection id="contact" animation="fade" delay={60}>
        <ContactPage />
      </AnimatedSection>

      <Footer />
    </div>
  );
};

export default HomeMiradia;