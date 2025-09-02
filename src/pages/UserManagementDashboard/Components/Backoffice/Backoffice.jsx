import React, { useState, useMemo, useEffect } from 'react'
import {
    FaFolderOpen,
    FaArrowUp,
    FaFile,
    FaStar,
    FaArrowDown,
    FaSearch,
    FaFilter,
    FaThLarge,
    FaTable,
    FaPlus,
    FaDownload,
    FaTimes
} from 'react-icons/fa';
import { FaCloudArrowUp, FaPhotoFilm } from 'react-icons/fa6';
import mediaData from './Data';
import MediaCard from './MediaCard';
import MediaTableView from './MediaTableView';
import AlbumCard from './Album/AlbumCard';
import MediaModal from './Modals/MediaModal';
import { useOutletContext } from 'react-router-dom';

const Backoffice = () => {

    const { setTitle } = useOutletContext();

    useEffect(() => {
        setTitle("Gestions des médias");
    }, [setTitle]);

    // Données des médias
    const mediaArray = mediaData;
    const [isGrille, setIsGrille] = useState(true);
    const [isFilter, setIsFilter] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [ajout, setAjout] = useState(false);



    const displayedContent = useMemo(() => {
        if (activeTab === 'albums') {
            const groupedByCategory = mediaArray.reduce((acc, media) => {
                if (media.type === 'image' || media.type === 'video') {
                    const category = media.category || 'Sans catégorie';
                    (acc[category] = acc[category] || []).push(media);
                }
                return acc;
            }, {});

            return Object.entries(groupedByCategory).map(([category, items]) => ({
                id: category,
                title: category,
                items,
                count: items.length,
                thumbnail: items.find(item => item.type === 'image')?.thumbnail || items[0]?.thumbnail,
            }));
        }

        return mediaArray.filter(media => {
            if (activeTab === 'documents') return ['pdf', 'word', 'excel'].includes(media.type);
            if (activeTab === 'media') return ['image', 'video'].includes(media.type);
            return true; // pour 'all'
        });
    }, [activeTab, mediaArray]);

    const submitData = (val) => {
        console.log(val);
    }

    const tabs = [
        { id: 'all', label: 'Tous les médias' },
        { id: 'documents', label: 'Documents' },
        { id: 'media', label: 'Images/Vidéos' },
        { id: 'albums', label: 'Albums & Photos' },
    ];

    const stats = [
        { title: 'Médias totaux', value: 12, icon: <FaFolderOpen className="text-indigo-600" />, pourcentage: "8%", color: "indigo" },
        { title: 'Documents', value: 6, icon: <FaFile className="text-blue-600" />, pourcentage: "3%", color: "blue" },
        { title: 'Photos/Vidéos', value: 6, icon: <FaPhotoFilm className="text-green-600" />, pourcentage: "5%", color: "green" },
        { title: 'Favoris', value: 4, icon: <FaStar className="text-yellow-600" />, pourcentage: "1%", color: "yellow" }
    ]

    const token = localStorage.getItem('tokenGuard');
    if (!token) {
        window.location.href = '/auth';
    }

    return (
        <div>
            {/* les blocs de données */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {stats.map((stat, index) =>
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm">{stat.title}</p>
                                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                            </div>
                            <div className={`w-12 h-12 rounded-full bg-${stat.color}-100 flex items-center justify-center`}>
                                {stat.icon}
                            </div>
                        </div>
                        <p className="text-green-500 text-xs mt-2 flex items-center"><FaArrowUp className="mr-1" /> {stat.pourcentage} ce mois</p>
                    </div>
                )}
            </div>

            {/* onglet principaux */}

            <div className="bg-white rounded-xl shadow-sm mb-6">
                <div className="border-b border-gray-200 px-6">
                    <div className="flex -mb-px" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                     px-4 py-3 font-medium text-sm transition-colors duration-200 focus:outline-none
                                    ${activeTab === tab.id
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'border-b-2 border-transparent text-gray-500 hover:text-gray-800'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filtre et action */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <input type="text" id="search-input" placeholder="Rechercher..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-full md:w-64" />
                            <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        </div>
                        <button id="filter-toggle" onClick={() => { setIsFilter(!isFilter) }} className="flex items-center text-gray-600 hover:text-gray-900">
                            <FaFilter className="mr-1" />
                            <span className="text-sm">Filtres</span>
                        </button>
                    </div>
                    <div className="flex space-x-2">
                        <div className="flex bg-gray-100 rounded-md p-1">
                            <button className={` flex items-center view-toggle active px-3 py-1 rounded-md text-sm ${isGrille ? 'bg-blue-600 text-white' : 'bg-none'}`} onClick={() => { setIsGrille(true) }} data-view="grid">
                                <FaThLarge className="mr-1" /> Grille
                            </button>
                            <button className={`flex items-center view-toggle active px-3 py-1 rounded-md text-sm ${!isGrille ? 'bg-blue-600 text-white' : 'bg-none'}`} onClick={() => { setIsGrille(false) }} data-view="table">
                                <FaTable className="mr-1" /> Tableau
                            </button>
                        </div>
                        <button id="add-media-btn"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2   rounded-md flex items-center"
                            onClick={() => { setAjout(!ajout), console.log(ajout) }}
                        >
                            <FaPlus className="mr-2" />
                            <span>Ajouter un média</span>
                        </button>
                        <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2  rounded-md flex items-center">
                            <FaDownload className="mr-2" />
                            <span>Exporter</span>
                        </button>
                    </div>
                </div>

                {/* Filtres  */}
                <div id="filter-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilter ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 mt-0 opacity-0'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-2">Type</label>
                            <select id="filter-type" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm">
                                <option value="">Tous les types</option>
                                <option value="image">Image</option>
                                <option value="video">Vidéo</option>
                                <option value="pdf">PDF</option>
                                <option value="word">Word</option>
                                <option value="excel">Excel</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-2">Catégorie</label>
                            <select id="filter-category" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm">
                                <option value="">Toutes catégories</option>
                                <option value="Travail">Travail</option>
                                <option value="Personnel">Personnel</option>
                                <option value="Vacances">Vacances</option>
                                <option value="Études">Études</option>
                                <option value="Projets">Projets</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-2">Date de début</label>
                            <input type="date" id="filter-date-start" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-medium mb-2">Date de fin</label>
                            <input type="date" id="filter-date-end" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button id="reset-filters" className="text-gray-600 hover:text-gray-900 text-sm mr-3">Réinitialiser</button>
                        <button id="apply-filters" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Appliquer</button>
                    </div>
                </div>
            </div>
            {/* affichage des medias */}
            <div>
                {activeTab === 'albums' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                        {displayedContent.map(album => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </div>
                ) : isGrille ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                        {displayedContent.map(media => (
                            <MediaCard key={media.id} media={media} />
                        ))}
                    </div>
                ) : (
                    <MediaTableView mediaArray={displayedContent} />
                )}
            </div>

            {/* ajout d'un media */}
            <MediaModal isOpen={ajout} onClose={() => { setAjout(!ajout) }} onSubmit={submitData} />

        </div>
    )
}

export default Backoffice