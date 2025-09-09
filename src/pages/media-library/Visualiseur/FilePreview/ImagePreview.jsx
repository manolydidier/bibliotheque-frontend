import React from 'react'

const ImagePreview = ({file}) => {
    return (
        <div className="w-full h-3/4 flex flex-col">
            <div className="flex-1 flex items-center justify-center bg-gray-100">
                <div className="max-w-full max-h-full">
                    <img src="${file.thumbnail}" alt="${file.title}" className="max-w-full max-h-[60vh] rounded-lg shadow-lg object-contain"/>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Métadonnées</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Dimensions</span>
                            <span>1920 × 1080 px</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Taille</span>
                            <span>${file.size}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Format</span>
                            <span>JPEG</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Date</span>
                            <span>${file.date}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Outils</h4>
                    <div className="flex space-x-2">
                        <button className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                            <i className="fas fa-crop"></i>
                        </button>
                        <button className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                            <i className="fas fa-adjust"></i>
                        </button>
                        <button className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                            <i className="fas fa-sliders-h"></i>
                        </button>
                        <button className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                            <i className="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                <a href="${file.fileUrl}" target="_blank" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
                    <i className="fas fa-external-link-alt mr-2"></i>
                    <span>Voir en haute résolution</span>
                </a>
            </div>
        </div>
    )
}

export default ImagePreview