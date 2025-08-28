import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { FaCloudArrowUp, FaPhotoFilm } from 'react-icons/fa6';

const MediaModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        title: '',
        type: '',
        category: '',
        date: '',
        isFavorite: false,
        file: null
    });

    // Réinitialise le formulaire quand la modale s'ouvre
    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: '',
                type: '',
                category: '',
                date: '',
                isFavorite: false,
                file: null
            });
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        setFormData(prevData => ({
            ...prevData,
            file: e.target.files[0]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData); // Remonte les données au parent
        onClose(); // Ferme la modale
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center overflow-y-auto pt-10 p-4 z-50">
            <div className="w-full max-w-screen-lg bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Ajouter un nouveau média</h2>
                    <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-medium mb-2">Fichier média</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <FaCloudArrowUp className="text-4xl text-gray-400 mb-2" />
                                        <p className="text-gray-500 mb-1">Glissez-déposez votre fichier ici</p>
                                        <p className="text-gray-400 text-xs mb-3">ou</p>
                                        <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm cursor-pointer">
                                            Parcourir les fichiers
                                            <input type="file" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {/* Vous pouvez ajouter un aperçu du fichier ici en utilisant formData.file */}
                        </div>

                        <div>                                                        
                            <div>

                                <div className="mb-6">
                                    <label for="media-title" className="block text-gray-700 text-sm font-medium mb-2">Titre</label>
                                    <input 
                                        value={formData.title}
                                        onChange={handleChange}
                                        name="title" 
                                        type="text" id="media-title" 
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div className="mb-6">
                                    <label for="media-type" className="block text-gray-700 text-sm font-medium mb-2">Type</label>
                                    <select name='type' value={formData.type} onChange={handleChange} id="media-type" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                                        <option value="">Sélectionner un type</option>
                                        <option value="image">Image</option>
                                        <option value="video">Vidéo</option>
                                        <option value="pdf">PDF</option>
                                        <option value="word">Document Word</option>
                                        <option value="excel">Feuille Excel</option>
                                    </select>
                                </div>


                                <div className="mb-6">
                                    <label for="media-category" className="block text-gray-700 text-sm font-medium mb-2">Catégorie</label>
                                    <select name='category' value={formData.category} onChange={handleChange} id="media-category" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                                        <option value="">Sélectionner une catégorie</option>
                                        <option value="Travail">Travail</option>
                                        <option value="Personnel">Personnel</option>
                                        <option value="Vacances">Vacances</option>
                                        <option value="Études">Études</option>
                                        <option value="Projets">Projets</option>
                                    </select>
                                </div>


                                <div className="mb-6">
                                    <label for="media-date" className="block text-gray-700 text-sm font-medium mb-2">Date</label>
                                    <input name='date' value={formData.date} onChange={handleChange} type="date" id="media-date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>


                                <div className="mb-6">
                                    <label className="block text-gray-700 text-sm font-medium mb-2">Options</label>
                                    <div className="flex items-center">
                                        <input name='isFavorite' value={formData.isFavorite} onChange={handleChange} type="checkbox" id="media-favorite" className="rounded text-blue-600 mr-2" />
                                        <label for="media-favorite" className="text-sm">Marquer comme favori</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                        <button type="button" id="cancel-form" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-md" onClick={() => { setAjout(!ajout) }}>
                            Annuler
                        </button>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md">
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default MediaModal