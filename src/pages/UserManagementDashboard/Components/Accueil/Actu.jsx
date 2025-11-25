import React from "react";
import { FaFileAlt, FaClock, FaDownload } from "react-icons/fa";

const Actu = () => {
  return (
    <div className="bg-slate-50 py-16">
      <div className="max-w-screen-2xl mx-auto px-8">
        {/* Titre de section aligné avec le hero */}
        <div className="w-full text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Actualités de la plateforme
          </h2>
          <div className="w-36 h-1 bg-[#1690FF] mx-auto mb-4" />
          <p className="text-sm text-slate-500">
            Derniers rapports et ressources mis en avant sur la plateforme
            documentaire.
          </p>
        </div>

        {/* Carte principale d'actualité */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-10">
          <div className="grid md:grid-cols-2">
            <div className="overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80"
                alt="Développement durable"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-8">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  Développement durable
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium">
                  Afrique subsaharienne
                </span>
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium">
                  Rapport de recherche
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                Stratégies innovantes pour le développement durable en Afrique
                subsaharienne
              </h3>
              <p className="text-slate-600 mb-4 text-sm">
                Par{" "}
                <span className="text-indigo-600 font-medium">
                  Dr. Aminata Diallo
                </span>{" "}
                · Publié le 12 juillet 2023 · Disponible sur la plateforme
              </p>
              <p className="text-slate-700 mb-6 leading-relaxed text-sm md:text-base">
                Une analyse des approches innovantes adoptées par les
                communautés locales pour répondre aux défis du développement
                durable. Ce rapport présente 12 études de cas provenant de 6
                pays différents et met en avant des pistes concrètes pour les
                décideurs et partenaires.
              </p>
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-slate-500 text-sm flex items-center">
                    <FaFileAlt className="mr-2" /> Rapport PDF (120 pages)
                  </span>
                  <span className="text-slate-500 text-sm flex items-center">
                    <FaClock className="mr-2" /> Environ 25 min de lecture
                  </span>
                </div>
                <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold flex items-center">
                  <FaDownload className="mr-2" /> Télécharger le rapport
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tu pourras ajouter d'autres cartes d'actualités ici plus tard */}
      </div>
    </div>
  );
};

export default Actu;
