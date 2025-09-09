import React from 'react'

const VideoPreview = ({file}) => {
    return (
        <div className="w-full  flex flex-col">
            <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
                <div className="w-full relative pt-[56.25%]"> 
                    <img src="${file.thumbnail}" alt="${file.title}" className="absolute inset-0 w-full h-full object-cover"/>
                        <button className="absolute inset-0 flex items-center justify-center w-full h-full bg-black bg-opacity-30">
                            <i className="fas fa-play text-white text-4xl opacity-80"></i>
                        </button>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Informations</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Durée</span>
                            <span>5:30</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Taille</span>
                            <span>{file.size}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Format</span>
                            <span>MP4</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Résolution</span>
                            <span>1080p</span>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Statistiques</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Vues</span>
                            <span>24</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Partages</span>
                            <span>3</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Taux de complétion</span>
                            <span>68%</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                <a href="${file.fileUrl}" target="_blank" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
                    <i className="fas fa-external-link-alt mr-2"></i>
                    <span>Lire la vidéo</span>
                </a>
            </div>
        </div>
    )
}

export default VideoPreview