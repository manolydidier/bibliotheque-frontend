import React from "react";

import PdfPreview from "./PdfFilePreview";
import ExcelPreview from "./ExcelPreview";
import WordPreview from "./WordPreview";
import ImagePreview from "./ImagePreview";
import VideoPreview from "./VideoPreview";
import MetaDataPreview from "./metaPreview";
import StatisticsPreview from "./StatistiquePreview";
import VersionPreview from "./VersionPreview";

export default function FilePreview({ file, activeTab }) {
    if (activeTab === 'Métadonnées') return <MetaDataPreview file={file} />;
    if (activeTab === 'Statistiques') return <StatisticsPreview file={file} />;
    if (activeTab === 'Versions') return <VersionPreview file={file} />;

    switch(file.type) {
        case 'pdf': return <PdfPreview file={file} />;
        case 'excel': return <ExcelPreview file={file} />;
        case 'word': return <WordPreview file={file} />;
        case 'image': return <ImagePreview file={file} />;
        case 'video': return <VideoPreview file={file} />;
        default: return <DefaultPreview file={file} />;
    }
}

function DefaultPreview({ file }) {
    return (
        <div className="w-full h-screen  flex flex-col items-center justify-center">
            <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-file text-blue-600 text-3xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-800">{file.title}</h3>
                <p className="text-gray-600 mt-2">Aperçu non disponible pour ce type de fichier</p>
                <a 
                    href={file.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                    <i className="fas fa-download mr-2"></i>
                    Télécharger le fichier
                </a>
            </div>
        </div>
    );
}