import React from 'react';
import {
    FaImage, FaVideo, FaFilePdf, FaFileWord, FaFileExcel, FaFile,
    FaPencilAlt, FaTrashAlt, FaDownload, FaStar, FaRegStar
} from 'react-icons/fa';

// Fonction utilitaire pour obtenir l'icône et la couleur correspondantes
const getTypeDetails = (type) => {
    switch (type) {
        case 'image': return { Icon: FaImage, color: 'text-green-500' };
        case 'video': return { Icon: FaVideo, color: 'text-purple-500' };
        case 'pdf': return { Icon: FaFilePdf, color: 'text-red-500' };
        case 'word': return { Icon: FaFileWord, color: 'text-blue-500' };
        case 'excel': return { Icon: FaFileExcel, color: 'text-green-600' };
        default: return { Icon: FaFile, color: 'text-gray-500' };
    }
};

const MediaTableRow = ({ media }) => {
    const { Icon, color } = getTypeDetails(media.type);

    return (
        <tr className="hover:bg-gray-50 transition-colors duration-200">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded object-cover" src={media.thumbnail} alt={media.title} />
                    </div>
                    <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 truncate" style={{maxWidth: '200px'}} title={media.title}>
                            {media.title}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <Icon className={`mr-2 ${color}`} />
                    <span className="text-sm text-gray-500 capitalize">{media.type}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {media.category}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {media.size}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(media.date).toLocaleDateString()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-3">                    
                    <button className="text-gray-400 hover:text-blue-500" title="Modifier">
                        <FaPencilAlt />
                    </button>
                    <button className="text-gray-400 hover:text-red-500" title="Supprimer">
                        <FaTrashAlt />
                    </button>
                    <a href={media.fileUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-500" title="Télécharger">
                        <FaDownload />
                    </a>
                    <button className="text-gray-400 hover:text-yellow-500" title={media.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}>
                        {media.favorite ? <FaStar className="text-yellow-400" /> : <FaRegStar />}
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default MediaTableRow;