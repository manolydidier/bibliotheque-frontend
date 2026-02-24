// src/pages/HomeMiradia.jsx
import React from "react";
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

const HomeMiradia = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <NavBarMiradia />

      {/* ✅ Si ton navbar scrolle vers #hero, il faut aussi un id="hero" */}
      <section id="hero">
        <Slide />
      </section>

      <section id="objectif">
        <Objectif />
      </section>

      <section id="actualites">
        <ArticleMiradiaPublic />
      </section>

      <section id="partners">
        <PartnersStrip />
      </section>

      <section id="organigramme">
        <OrganigrammeMIRADIA />
      </section>

      <section id="organisation">
        <Organisation />
      </section>

      {/* ✅ IMPORTANT : c’est ça qui permet au bouton Contact de scroller */}
      <section id="contact">
        <ContactPage />
      </section>

      <Footer />
    </div>
  );
};

export default HomeMiradia;