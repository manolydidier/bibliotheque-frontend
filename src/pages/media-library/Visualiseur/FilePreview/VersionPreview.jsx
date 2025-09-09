import { FaFilePdf } from "react-icons/fa";

export default function VersionPreview({file}){
    return (
        <div className="w-full h-full p-6 overflow-auto">
            <h3 className="text-xl font-semibold mb-6">Gestion des versions</h3>
            <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow flex items-start">
                    <div className="mr-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FaFilePdf className="text-blue-600" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-medium">Version actuelle</h4>
                                <p className="text-sm text-gray-500">Modifié aujourd'hui à 09:15</p>
                            </div>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">Actuel</span>
                        </div>
                        <div className="mt-2 flex space-x-3">
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Télécharger</button>
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Partager</button>
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Plus d'options</button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow flex items-start">
                    <div className="mr-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <FaFilePdf className="text-gray-600" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-medium">Version 1.1</h4>
                                <p className="text-sm text-gray-500">Modifié hier à 16:30</p>
                            </div>
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs">Précédent</span>
                        </div>
                        <p className="text-sm mt-1">Ajout des graphiques de performance</p>
                        <div className="mt-2 flex space-x-3">
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Télécharger</button>
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Restaurer</button>
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Plus d'options</button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow flex items-start">
                    <div className="mr-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <FaFilePdf className="text-gray-600" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-medium">Version 1.0</h4>
                                <p className="text-sm text-gray-500">Créé le 15/05/2023</p>
                            </div>
                        </div>
                        <p className="text-sm mt-1">Version initiale du document</p>
                        <div className="mt-2 flex space-x-3">
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Télécharger</button>
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Restaurer</button>
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Plus d'options</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}