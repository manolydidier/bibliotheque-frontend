import React from 'react';
import { FaStar, FaPencilAlt, FaTrashAlt, FaDownload } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Une fonction utilitaire pour gérer la logique du badge, rendant le composant principal plus propre
const getBadgeInfo = (type) => {
    switch (type) {
        case 'image':
            return { color: 'bg-green-100 text-green-800', text: 'Image' };
        case 'video':
            return { color: 'bg-purple-100 text-purple-800', text: 'Vidéo' };
        case 'pdf':
            return { color: 'bg-red-100 text-red-800', text: 'PDF' };
        case 'word':
            return { color: 'bg-blue-100 text-blue-800', text: 'Word' };
        case 'excel':
            return { color: 'bg-green-100 text-green-800', text: 'Excel' };
        default:
            return { color: 'bg-gray-100 text-gray-800', text: type };
    }
};

const MediaCard = ({ media }) => {
    const badge = getBadgeInfo(media.type);
    
    return (
        <Link to={`/visualiseur/${encodeURIComponent(media.id)}`}>
            <div className="media-card bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="relative">
                    <img src={media.thumbnail} alt={media.title} className="w-full h-48 object-cover" />
                    <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded ${badge.color}`}>{badge.text}</span>
                    {media.favorite && (
                        <span className="absolute top-2 left-2 text-yellow-400">
                            <FaStar size={20} />
                        </span>
                    )}
                </div>
                <div className="p-4">
                    <h3 className="font-medium text-gray-800 mb-1 truncate" title={media.title}>{media.title}</h3>
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span>{media.category}</span>
                        <span>{media.size}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{new Date(media.date).toLocaleDateString()}</span>
                        <div className="flex space-x-3">
                            <button className="text-gray-400 hover:text-blue-500" title="Modifier"><FaPencilAlt /></button>
                            <button className="text-gray-400 hover:text-red-500" title="Supprimer"><FaTrashAlt /></button>
                            <a href={media.fileUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-500" title="Télécharger">
                                <FaDownload />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default MediaCard;