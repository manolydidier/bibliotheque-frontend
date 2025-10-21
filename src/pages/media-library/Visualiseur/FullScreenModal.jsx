// src/media-library/FullScreenModal.jsx
import React from "react";
import { FaTimes } from "react-icons/fa";
import FilePreview from "./FilePreview/FilePreview";

/**
 * Affiche un média en plein écran (Aperçu seul).
 * Props:
 *  - file: objet "article-like" (on injecte le média sélectionné en tête)
 *  - onClose: () => void
 */
export default function FullScreenModal({ file, onClose }) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="max-w-7xl w-full p-6 sm:p-10 lg:p-12">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
            <FilePreview file={file} activeTab="Aperçu" />
          </div>
        </div>
        <button
          onClick={onClose}
          className="absolute top-6 right-6 sm:top-8 sm:right-8 text-white/80 text-2xl sm:text-3xl hover:text-white transition-colors duration-300"
          aria-label="Fermer"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
}
