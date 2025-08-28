import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { FaCloudArrowUp, FaPhotoFilm } from 'react-icons/fa6';



const PhotoModal = ({isOpen, onClose, onSubmit}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    visibility: '',
    tags:'',
    album:'',
    category:'',
    image:null
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    setFormData({ ...formData, image: file })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
  }



  return (
    <div className="fixed inset-0 bg-black bg-opacity-30  flex items-center justify-center overflow-y-auto pt-6  p-4">
      <div className=" w-full max-w-screen-lg bg-white rounded-xl shadow-sm p-6 mt-6 ">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Ajouter une nouvelle photo</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
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
                        <input type="file" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                </div>
                {/* Vous pouvez ajouter un aperçu du fichier ici en utilisant formData.file */}
              </div>

              <div className="mb-6">
                <label for="title"
                  className="block text-gray-700 text-sm font-medium mb-2">Titre</label>
                <input 
                  value={formData.title}
                  onChange={handleInputChange}
                  name="title"
                  type="text" id="title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>


              <div className="mb-6">
                <label for="description"
                  className="block text-gray-700 text-sm font-medium mb-2">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={handleInputChange}
                  name="description"
                  id="description" rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
              </div>
            </div>


            <div>

              <div className="mb-6">
                <label for="album"
                  className="block text-gray-700 text-sm font-medium mb-2">Album</label>
                <select id="album"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Sélectionner un album</option>
                  <option value="1">Vacances d'été</option>
                  <option value="2">Famille</option>
                  <option value="3">Mariage</option>
                  <option value="4">Anniversaires</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">Catégories</label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-blue-600 mr-2" />
                    <span className="text-sm">Famille</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-blue-600 mr-2" />
                    <span className="text-sm">Vacances</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-blue-600 mr-2" />
                    <span className="text-sm">Nature</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-blue-600 mr-2" />
                    <span className="text-sm">Portrait</span>
                  </label>
                </div>
              </div>


              <div className="mb-6">
                <label for="tags" className="block text-gray-700 text-sm font-medium mb-2">Tags</label>
                <input type="text" id="tags"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ajouter des tags séparés par des virgules" />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className="badge bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs flex items-center">
                    <span>Noël</span>
                    <button className="ml-1 text-blue-600 hover:text-blue-800">
                      <i className="fas fa-times text-xs"></i>
                      <FaTimes className="fas fa-times text-xs" />
                    </button>
                  </span>
                  <span
                    className="badge bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs flex items-center">
                    <span>Anniversaire</span>
                    <button className="ml-1 text-green-600 hover:text-green-800">
                      <i className="fas fa-times text-xs"></i>
                      <FaTimes className="fas fa-times text-xs" />

                    </button>
                  </span>
                </div>
              </div>


              <div className="mb-6">
                <label for="date" className="block text-gray-700 text-sm font-medium mb-2">Date</label>
                <input 
                  value={formData.date}
                  onChange={handleInputChange}
                  name="date"
                  type="date" id="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>


              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">Visibilité</label>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center">
                    <input type="radio" name="visibility" className="text-blue-600 mr-2" checked />
                    <span className="text-sm">Public</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="visibility" className="text-blue-600 mr-2" />
                    <span className="text-sm">Privé</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="visibility" className="text-blue-600 mr-2" />
                    <span className="text-sm">Partagé</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button type="button"
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-md"
              onClick={() => { onClose() }}
            >
              Annuler
            </button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PhotoModal