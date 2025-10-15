import React from "react";
import { FaArrowLeft, FaArrowRight, FaRedo, FaExpand, FaDownload } from "react-icons/fa";
import ShareButton from "../share/ShareButton";

export default function Toolbar({ onBack, onRefresh, onFullscreen, onDownload, shareData }) {
  return (
    <div className="border-b border-slate-200/30 p-4 sm:p-5 lg:p-6 flex justify-between items-center bg-gradient-to-r from-white/30 to-transparent">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button onClick={onBack} className="p-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 transition-all duration-300" title="Retour">
          <FaArrowLeft />
        </button>
        <button className="p-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 transition-all duration-300" title="Avancer">
          <FaArrowRight />
        </button>
        <button onClick={onRefresh} className="p-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 transition-all duration-300" title="Rafraîchir">
          <FaRedo />
        </button>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        <button onClick={onFullscreen} className="px-4 sm:px-5 lg:px-6 py-3 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 border border-slate-300/60 transition-all duration-300">
          <FaExpand className="mr-2 inline" />
          <span>Plein écran</span>
        </button>
        <button onClick={onDownload} className="px-4 sm:px-5 lg:px-6 py-3 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/80 border border-slate-300/60 transition-all duration-300">
          <FaDownload className="mr-2 inline" />
          <span>Télécharger</span>
        </button>

        <ShareButton
          title={shareData?.title}
          excerpt={shareData?.excerpt}
          url={shareData?.url}
          articleId={shareData?.articleId}
        />
      </div>
    </div>
  );
}
