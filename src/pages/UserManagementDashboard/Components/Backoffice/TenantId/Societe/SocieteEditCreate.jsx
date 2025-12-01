// src/pages/societes/SocieteEditCreate.jsx
// ⚠️ adapte le chemin selon ton arborescence

import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiCheckCircle, FiList, FiRefreshCw, FiEdit3 } from 'react-icons/fi';
import SocieteForm from './SocieteForm';

const SocieteEditCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const isEditRoute = Boolean(id);

  // Pour forcer un remount du formulaire (reset complet)
  const [formKey, setFormKey] = useState(0);

  // Dernière société sauvegardée (retournée par l’API)
  const [lastSavedSociete, setLastSavedSociete] = useState(null);

  // Contrôle de la modale post-submit
  const [showChoiceModal, setShowChoiceModal] = useState(false);

  // Si la route /societes/:id/edit vient avec state={societe}, on la récupère
  const initialSociete = location.state?.societe || null;

  const handleSaved = (societe) => {
    setLastSavedSociete(societe || null);
    setShowChoiceModal(true);
  };

  const closeModal = () => setShowChoiceModal(false);

  const goToList = () => {
    setShowChoiceModal(false);
    navigate('/societes');
  };

  const stayAndEdit = () => {
    // Cas création -> après save on bascule vers la route d’édition
    if (!isEditRoute && lastSavedSociete?.id) {
      setShowChoiceModal(false);
      navigate(`/societes/${lastSavedSociete.id}/edit`, {
        state: { societe: lastSavedSociete },
      });
    } else {
      // Cas édition -> on reste sur place
      setShowChoiceModal(false);
    }
  };

  const stayAndNew = () => {
    setShowChoiceModal(false);
    setLastSavedSociete(null);

    if (isEditRoute) {
      // On était en édition : on repart sur la route de création
      navigate('/societes/new');
    } else {
      // On était déjà sur /new : on force un remount pour vider le formulaire
      setFormKey((k) => k + 1);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-100 relative">
      <SocieteForm
        key={formKey}
        initial={initialSociete}
        onSaved={handleSaved}
      />

      {/* Modale de choix après sauvegarde */}
      {showChoiceModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 relative overflow-hidden">
            {/* Glow */}
            <div className="pointer-events-none absolute -inset-16 bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-fuchsia-500/10" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 text-white shadow-lg">
                  <FiCheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Société enregistrée
                  </h2>
                  <p className="text-xs text-slate-500">
                    Que souhaitez-vous faire maintenant&nbsp;?
                  </p>
                </div>
              </div>

              {lastSavedSociete?.name || lastSavedSociete?.nom ? (
                <p className="text-sm text-slate-600 mb-4">
                  <span className="font-medium">
                    {lastSavedSociete.nom || lastSavedSociete.name}
                  </span>{' '}
                  a bien été enregistrée.
                </p>
              ) : (
                <p className="text-sm text-slate-600 mb-4">
                  La société a bien été enregistrée.
                </p>
              )}

              <div className="space-y-2 mb-5">
                <button
                  type="button"
                  onClick={goToList}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
                >
                  <FiList className="w-4 h-4" />
                  Aller à la liste des sociétés
                </button>

                <button
                  type="button"
                  onClick={stayAndEdit}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 transition"
                >
                  <FiEdit3 className="w-4 h-4" />
                  Rester et éditer cette société
                </button>

                <button
                  type="button"
                  onClick={stayAndNew}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 transition"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Rester et créer une nouvelle société
                </button>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocieteEditCreate;
