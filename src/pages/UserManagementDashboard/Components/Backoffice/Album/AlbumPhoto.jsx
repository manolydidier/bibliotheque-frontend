import React, { useState, useEffect } from 'react'
import {
    FaFolderOpen,
    FaArrowUp,
    FaFile,
    FaStar,
    FaBook,
    FaArrowDown,
    FaSearch,
    FaFilter,
    FaThLarge,
    FaTable,
    FaPlus,
    FaDownload,
    FaComment,
    FaComments,
    FaCloud,
    FaTimes
} from 'react-icons/fa';
import { FaCloudArrowUp, FaPhotoFilm } from 'react-icons/fa6';
import AlbumModal from '../Modals/AlbumModal';
import PhotoModal from '../Modals/PhotoModal';
import { useOutletContext } from 'react-router-dom';
const AlbumPhoto = () => {
    const {setTitle} = useOutletContext();
    
    useEffect(() => {
        setTitle("Albums & Photos");
    }, [setTitle]);

    const [isGrille, setIsGrille] = useState(true);
    const [isFilter, setIsFilter] = useState(false);
    const [open, setopen] = useState(false);

    const stats = [
        { title: 'Photos totales', value: 12, icon: <FaPhotoFilm className="text-indigo-600" />, pourcentage: "8%", color: "indigo" },
        { title: 'Albums', value: 6, icon: <FaBook className="text-purple-600" />, pourcentage: "3%", color: "purple" },
        { title: 'Utilisateurs', value: 6, icon: <FaPhotoFilm className="text-yellow-600" />, pourcentage: "5%", color: "yellow" },
        { title: 'Commentaires', value: 4, icon: <FaComments className="text-red-600" />, pourcentage: "1%", color: "red" }
    ]

    const [activeTab, setActiveTab] = useState('photos');
    console.log(activeTab);
    const tabs = [
        { id: 'photos', label: 'Photos' },
        { id: 'albums', label: 'Albums' },
        { id: 'utilisateurs', label: 'Utilisateurs' },
        { id: 'commentaires', label: 'Commentaires' },
    ];

    const submitAlbum =(value)=>{
        console.log(value)
    }

    const submitPhoto = (value)=>{
        console.log(value)
    }

    return (
        <div>
            {/* les STATS */}
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
                        <button id="add-media-btn" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2   rounded-md flex items-center" onClick={() => { setopen(!open) }}>
                            <FaPlus className="mr-2" />
                            <span>{activeTab}</span>
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

            </div>

            {/* Modal ajout album */}
            {activeTab === "albums"  &&
                <AlbumModal isOpen={open} onClose={() => { setopen(!open) }} onSubmit={submitAlbum} />
            }
            {/* Modal ajout photo */}

            {activeTab === "photos" && open &&
                <PhotoModal isOpen={open} onClose={() => { setopen(!open) }} onSubmit={submitPhoto}/>
            }
        </div>
    )
}

export default AlbumPhoto