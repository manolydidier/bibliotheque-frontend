import React, { useState, useRef, useEffect } from "react";
import {
  FaChevronUp, FaChevronDown, FaAtom, FaBrain, FaCrosshairs,
  FaChartLine, FaGlobe
} from "react-icons/fa";

export default function Objectif() {
  const [currentPage, setCurrentPage] = useState(0);
  const pageRefs = useRef([]);

  const pages = [
    // Page 2
    <div
      key="page-1"
      ref={(el) => (pageRefs.current[0] = el)}
      className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-slate-900 text-white"
    >
      <div className="w-full max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Nos objectifs 
        </h2>
        <div className="w-36 h-1 bg-white mx-auto  mb-10"></div>
        <p className="mb-5">Decouvrez nos buts et aspirations qui guident nos projets</p>
        <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-lg max-w-3xl mx-auto mb-12">
          <h3 className="flex  text-2xl font-semibold mb-10">
            <FaCrosshairs className="mr-3 text-white" /> Notre Mission
          </h3>
          <ul className="feature-list space-y-4 text-left text-gray-300">
            <li>
              <strong className="text-white">Démocratisation du savoir</strong>
              <br />
              Briser les barrières économiques et géographiques avec un accès
              universel à la connaissance.
            </li>
            <li>
              <strong className="text-white">Préservation numérique</strong>
              <br />
              Archivage immuable sur blockchain des œuvres menacées avec
              métadonnées enrichies.
            </li>
            <li>
              <strong className="text-white">Expérience sensorielle</strong>
              <br />
              Intégration multisensorielle (audio, haptique, visuel) pour une
              lecture immersive.
            </li>
            <li>
              <strong className="text-white">Écosystème ouvert</strong>
              <br />
              API modulaire permettant des extensions illimitées par la
              communauté.
            </li>
          </ul>
        </div>

        <div className="grid md:grid-cols-2 max-w-3xl mx-auto gap-8">
          <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl mb-4 text-white">
              <FaChartLine />
            </div>
            <h3 className="text-xl font-semibold mb-2">Croissance</h3>
            <p className="text-gray-300 text-sm">
              Objectif : 10 millions d'œuvres disponibles d'ici 2026 avec un
              taux de satisfaction de 98%.
            </p>
          </div>
          <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-lg hover:scale-105 transition-transform duration-300">
            <div className="text-4xl mb-4 text-white">
              <FaGlobe />
            </div>
            <h3 className="text-xl font-semibold mb-2">Impact</h3>
            <p className="text-gray-300 text-sm">
              Partenariats avec 500 institutions académiques mondiales pour un
              accès scientifique universel.
            </p>
          </div>

        </div>
      </div>
    </div>
  ];

  const scrollToPage = (index) => {
    setCurrentPage(index);
    pageRefs.current[index]?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown" && currentPage < pages.length - 1) {
        scrollToPage(currentPage + 1);
      } else if (e.key === "ArrowUp" && currentPage > 0) {
        scrollToPage(currentPage - 1);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentPage]);

  return (
    <>
      {pages}
    </>
  );
}
