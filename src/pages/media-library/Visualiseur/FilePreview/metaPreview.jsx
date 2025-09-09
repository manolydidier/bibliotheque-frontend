export default function MetaDataPreview({file}) {
    return (
        <div className="w-full h-full p-6 overflow-auto">
            <h3 className="text-xl font-semibold mb-6">Métadonnées techniques</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <tbody className="divide-y divide-gray-200">
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Nom du fichier</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Présentation projet Q3.pdf</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Type</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Document PDF</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Taille</td>
                            <td className="px-4 py-3 text-sm text-gray-600">4.2 MB</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Date de création</td>
                            <td className="px-4 py-3 text-sm text-gray-600">15/05/2023 14:30</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Dernière modification</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Aujourd'hui 09:15</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Auteur</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Jean Dupont</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Titre</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Présentation du projet Q3</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Sujet</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Rapport trimestriel</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Mots-clés</td>
                            <td className="px-4 py-3 text-sm text-gray-600">rapport, projet, trimestre</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Logiciel</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Microsoft Word 16.0</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Version PDF</td>
                            <td className="px-4 py-3 text-sm text-gray-600">1.7</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Pages</td>
                            <td className="px-4 py-3 text-sm text-gray-600">12</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Protégé</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Non</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}