import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { FaCloudArrowUp, FaPhotoFilm } from 'react-icons/fa6';


const AlbumModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        visibility: '',
        photos: []
    })

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                title: '',
                description: '',
                date: '',
                visibility: '',
                photos: []
            })
        }
    },[isOpen])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
    }

    const handlePhotoUpload = (e) => {
        const files = e.target.files
        const newPhotos = Array.from(files).map(file => URL.createObjectURL(file))
        setFormData({ ...formData, photos: [...formData.photos, ...newPhotos] })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formData)
        onClose()
    }
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center overflow-y-auto pt-10 p-4 z-50">
            <div className="w-full max-w-screen-lg bg-white rounded-xl shadow-sm p-6">

                <h2 className="text-xl font-bold text-gray-800 mb-6">Créer un nouvel album</h2>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>

                            <div className="mb-6">
                                <label for="album-title" className="block text-gray-700 text-sm font-medium mb-2">Titre
                                    de l'album</label>
                                <input
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    name="title"
                                    type="text" id="album-title"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>


                            <div className="mb-6">
                                <label for="album-description"
                                    className="block text-gray-700 text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    name="description"
                                    id="album-description" rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
                            </div>


                            <div>
                                <div className="mb-6">
                                    <label className="block text-gray-700 text-sm font-medium mb-2">Image de couverture</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <FaCloudArrowUp className="text-4xl text-gray-400 mb-2" />
                                            <p className="text-gray-500 mb-1">Glissez-déposez votre fichier ici</p>
                                            <p className="text-gray-400 text-xs mb-3">ou</p>
                                            <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm cursor-pointer">
                                                Parcourir les fichiers
                                                <input type="file" className="hidden" onChange={handlePhotoUpload} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                {/* Vous pouvez ajouter un aperçu du fichier ici en utilisant formData.file */}
                            </div>
                        </div>


                        <div>

                            <div className="mb-6">
                                <label for="album-date"
                                    className="block text-gray-700 text-sm font-medium mb-2">Date</label>
                                <input 
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    name="date"
                                    type="date" id="album-date"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>


                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-medium mb-2">Visibilité</label>
                                <div className="flex flex-col space-y-2">
                                    <label className="flex items-center">
                                        <input type="radio" name="album-visibility" className="text-blue-600 mr-2"
                                            checked />
                                        <span className="text-sm">Public</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="radio" name="album-visibility" className="text-blue-600 mr-2" />
                                        <span className="text-sm">Privé</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="radio" name="album-visibility" className="text-blue-600 mr-2" />
                                        <span className="text-sm">Partagé</span>
                                    </label>
                                </div>
                            </div>


                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-medium mb-2">Photos dans
                                    l'album</label>
                                <div className="border border-gray-300 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium">Sélectionnez des photos</span>
                                        <label className="text-blue-600 hover:text-blue-800 text-sm">
                                            Ajouter
                                            <input name='photos' type="file" className="hidden" onChange={handlePhotoUpload} />
                                        </label>                                       
                                    </div>


                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <div className="flex items-center">
                                                <img src="https://source.unsplash.com/random/50x50/?portrait"
                                                    alt="Photo" className="w-8 h-8 rounded mr-2" />
                                                <span className="text-sm">Portrait.jpg</span>
                                            </div>
                                            <button type="button" className="text-red-500 hover:text-red-700">
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <div className="flex items-center">
                                                <img src="https://source.unsplash.com/random/50x50/?nature"
                                                    alt="Photo" className="w-8 h-8 rounded mr-2" />
                                                <span className="text-sm">Nature.jpg</span>
                                            </div>
                                            <button type="button" className="text-red-500 hover:text-red-700">
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                        <button type="button" id="cancel-form" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-md" onClick={onClose}>
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

export default AlbumModal