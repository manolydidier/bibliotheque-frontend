export default function WordPreview({ file }) {
    return (
        <div className="w-full h-full flex flex-col">
            <div className="w-full h-4/5 bg-gray-100 border-2 border-gray-300 rounded-lg flex flex-col">
                <div className="bg-gray-200 p-2 flex items-center">
                    <i className="fas fa-file-word text-blue-500 mr-2"></i>
                    <span className="font-medium">${file.title}</span>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-white">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-700 mb-2">Statistiques</h4>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Pages</span>
                                <span className="font-medium">8</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Mots</span>
                                <span className="font-medium">2,145</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Taille</span>
                                <span className="font-medium">${file.size}</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-700 mb-2">Activité</h4>
                            <div className="text-sm">
                                <div className="flex justify-between mb-1">
                                    <span>Modifié</span>
                                    <span className="font-medium">3 fois</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Partagé</span>
                                    <span className="font-medium">2 fois</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-center">${file.title.replace('.docx', '')}</h3>
                    <div className="prose max-w-none">
                        <p className="mb-4">Ce document contient la documentation technique pour le projet en cours. Il décrit en détail les spécifications, les exigences et les architectures du système.</p>

                        <h4 className="font-semibold mb-2">1. Introduction</h4>
                        <p className="mb-4">Cette section présente les objectifs et la portée du document. Le projet vise à développer une solution complète pour la gestion des données multimédia.</p>

                        <h4 className="font-semibold mb-2">2. Spécifications techniques</h4>
                        <ul className="list-disc pl-5 mb-4 space-y-1">
                            <li>Architecture microservices</li>
                            <li>Base de données MongoDB</li>
                            <li>Interface utilisateur React</li>
                            <li>API RESTful</li>
                        </ul>

                        <h4 className="font-semibold mb-2">3. Diagrammes</h4>
                        <div className="bg-gray-100 p-3 rounded-lg mb-4 flex items-center justify-center h-32 text-gray-500">
                            [Diagramme d'architecture]
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-2 flex justify-between items-center text-sm text-gray-600">
                    <span>Page 1 sur 2</span>
                    <div className="flex space-x-2">
                        <button className="p-1 hover:bg-gray-200 rounded"><i className="fas fa-chevron-left"></i></button>
                        <button className="p-1 hover:bg-gray-200 rounded"><i className="fas fa-chevron-right"></i></button>
                        <button className="p-1 hover:bg-gray-200 rounded"><i className="fas fa-search-plus"></i></button>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                <a href="${file.fileUrl}" target="_blank" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
                    <i className="fas fa-external-link-alt mr-2"></i>
                    <span>Ouvrir dans Word</span>
                </a>
            </div>
        </div>
    )
}