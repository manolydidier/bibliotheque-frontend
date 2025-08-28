import React from "react";
import Comments from "./Comments";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel, faFileWord, faImage, faFileVideo, faFile, faPlus } from '@fortawesome/free-solid-svg-icons';

export default function FileDetails({ file }) {
    const getFileIconClass = (type) => {
        switch(type) {
            case 'pdf': return 'pdf bg-red-100 text-red-600';
            case 'excel': return 'excel bg-green-100 text-green-600';
            case 'word': return 'word bg-blue-100 text-blue-600';
            case 'image': return 'image bg-yellow-100 text-yellow-600';
            case 'video': return 'video bg-purple-100 text-purple-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getFileIcon = (type) => {
        switch(type) {
            case 'pdf': return faFilePdf;
            case 'excel': return faFileExcel;
            case 'word': return faFileWord;
            case 'image': return faImage;
            case 'video': return faFileVideo;
            default: return faFile;
        }
    };

    const commentSubmit = (value)=>{
        console.log(value)
    }
    return (
        <div className="">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Détails du fichier</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex items-center mb-4">
                        <div className={`file-icon w-10 h-10 rounded-md flex items-center justify-center ${getFileIconClass(file.type)}`}>
                            <FontAwesomeIcon icon={getFileIcon(file.type)} className="text-xl" />
                        </div>
                        <div className="ml-3">
                            <h3 className="font-medium text-gray-800">{file.title}</h3>
                            <p className="text-sm text-gray-500">{file.type.toUpperCase()} • {file.size}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                            <p className="text-gray-500">Date de création</p>
                            <p className="font-medium">{file.date}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Dernière modification</p>
                            <p className="font-medium">{file.date}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Taille</p>
                            <p className="font-medium">{file.size}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Format</p>
                            <p className="font-medium">{file.type.toUpperCase()}</p>
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <p className="text-gray-500 mb-2">Catégorie</p>
                        <p className="text-sm">{file.category}</p>
                    </div>
                    
                    <div>
                        <p className="text-gray-500 mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                            <span className="tag bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                                {file.favorite ? 'Favori' : 'Nouveau'}
                            </span>
                            <span className="tag bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">
                                {file.category}
                            </span>
                            <button className="tag bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs flex items-center">
                                <FontAwesomeIcon icon={faPlus} className="mr-1 text-xs" />
                                <span>Ajouter</span>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Comment section */}
                <Comments onSubmit={commentSubmit}/>
            </div>
        </div>
    );
}