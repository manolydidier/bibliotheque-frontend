import { FaFilePdf } from "react-icons/fa";

export default function PdfPreview({ file }) {
    return (
        <div className="w-full h-full flex flex-col">
            <div className="w-full h-4/5 bg-gray-100 border-2 border-gray-300 rounded-lg flex flex-col">
                <div className="bg-gray-200 p-2 flex items-center">
                    <i className="fas fa-file-pdf text-red-500 mr-2"></i>
                    <FaFilePdf className=" text-red-500 mr-2"/>
                    <span className="font-medium">{file.title}</span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <h3 className="text-xl font-semibold mb-4">{file.title}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h4 className="font-medium text-gray-700 mb-2">Statistiques</h4>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Pages</span>
                                <span className="font-medium">12</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Mots</span>
                                <span className="font-medium">3,450</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Taille</span>
                                <span className="font-medium">${file.size}</span>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h4 className="font-medium text-gray-700 mb-2">Activité</h4>
                            <div className="text-sm mb-1">
                                <div className="flex justify-between mb-1">
                                    <span>Ouvert</span>
                                    <span className="font-medium">5 fois</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-blue-600 h-1.5 rounded-full" style={{width: '60%'}}></div>
                                </div>
                            </div>
                            <div className="text-sm">
                                <div className="flex justify-between mb-1">
                                    <span>Partagé</span>
                                    <span className="font-medium">3 fois</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-green-600 h-1.5 rounded-full" style={{width: '30%'}}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-white rounded shadow">
                            <h4 className="font-medium">Page 1 - Résumé</h4>
                            <p className="text-sm text-gray-600 mt-2">Ce document présente les résultats du projet pour le trimestre 3 de l'année 2023.</p>
                            <div className="mt-3 flex space-x-2">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">Résumé</span>
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">Statistiques</span>
                            </div>
                        </div>
                        <div className="p-4 bg-white rounded shadow">
                            <h4 className="font-medium">Page 2 - Graphiques</h4>
                            <p className="text-sm text-gray-600 mt-2">Visualisation des données trimestrielles avec comparaison année sur année.</p>
                            <div className="mt-2 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm">
                                [Graphique des performances]
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-2 flex justify-between items-center text-sm text-gray-600">
                    <span>Page 1 sur 2</span>
                    <div className="flex space-x-2">
                        <button className="p-1 hover:bg-gray-200 rounded"><i className="fas fa-chevron-left"></i></button>
                        <button className="p-1 hover:bg-gray-200 rounded"><i className="fas fa-chevron-right"></i></button>
                        <button className="p-1 hover:bg-gray-200 rounded"><i className="fas fa-search-plus"></i></button>
                        <button className="p-1 hover:bg-gray-200 rounded"><i className="fas fa-search-minus"></i></button>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                <a href="${file.fileUrl}" target="_blank" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
                    <i className="fas fa-external-link-alt mr-2"></i>
                    <span>Ouvrir dans un nouvel onglet</span>
                </a>
            </div>
        </div>
    );
}