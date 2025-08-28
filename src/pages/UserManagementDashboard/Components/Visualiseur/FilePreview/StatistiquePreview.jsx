import React from 'react'
import { FaEye, FaEdit, FaShareAlt } from 'react-icons/fa';


export default function StatisticsPreview({ file }) {
    return (
        <div>
            <div className="w-full h-full p-6">
                <h3 className="text-xl font-semibold mb-6">Statistiques du fichier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h4 className="font-medium text-gray-700 mb-4">Utilisation</h4>
                        <div className="h-40 flex items-center justify-center text-gray-500">
                            [Graphique d'utilisation]
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h4 className="font-medium text-gray-700 mb-4">Activité récente</h4>
                        <div className="space-y-3">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                    <FaEye className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Consulté 5 fois</p>
                                    <p className="text-xs text-gray-500">Dernière consultation: aujourd'hui</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                    <FaEdit className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Modifié 2 fois</p>
                                    <p className="text-xs text-gray-500">Dernière modification: hier</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                    <FaShareAlt className="text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Partagé 3 fois</p>
                                    <p className="text-xs text-gray-500">Dernier partage: il y a 2 jours</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h4 className="font-medium text-gray-700 mb-4">Historique des versions</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Version</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Taille</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Modifié par</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="px-4 py-2 text-sm">v1.2</td>
                                    <td className="px-4 py-2 text-sm">Aujourd'hui</td>
                                    <td className="px-4 py-2 text-sm">4.2 MB</td>
                                    <td className="px-4 py-2 text-sm">Vous</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="px-4 py-2 text-sm">v1.1</td>
                                    <td className="px-4 py-2 text-sm">Hier</td>
                                    <td className="px-4 py-2 text-sm">4.0 MB</td>
                                    <td className="px-4 py-2 text-sm">Marie Martin</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 text-sm">v1.0</td>
                                    <td className="px-4 py-2 text-sm">15/05/2023</td>
                                    <td className="px-4 py-2 text-sm">3.8 MB</td>
                                    <td className="px-4 py-2 text-sm">Jean Dupont</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}