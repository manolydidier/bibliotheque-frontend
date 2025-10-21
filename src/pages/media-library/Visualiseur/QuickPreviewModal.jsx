// src/media-library/QuickPreviewModal.jsx
import React from "react";
import { FaTimes } from "react-icons/fa";
import FilePreview from "./FilePreview/FilePreview";

/**
 * Modal d'aperçu rapide (indépendant des Tabs)
 * Props:
 *  - file: objet "article-like" (on peut y injecter le média sélectionné en tête)
 *  - onClose: () => void
 */
export default function QuickPreviewModal({ file, onClose }) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Fermer"
          title="Fermer"
        >
          <FaTimes />
        </button>

        <div className="max-h-[90vh] overflow-auto">
          {/* Rend le fichier via FilePreview, sans dépendre des Tabs */}
          <FilePreview file={file} activeTab="Aperçu" />
        </div>
      </div>
    </div>
  );
}
