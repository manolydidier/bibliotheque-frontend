import { FaFileExcel } from "react-icons/fa";

function Tableau({ n, file }) {    
    return (
        <>
            {Array.from({ length: n }, (_, i) => (
                <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-2 border border-gray-200">{i + 1}</td>
                    <td className="px-4 py-2 border border-gray-200">{['Ventes', 'Dépenses', 'Investissements', 'Remboursements'][i % 4]}</td>
                    <td className="px-4 py-2 border border-gray-200">${(Math.random() * 1000).toFixed(2)}</td>
                    <td className="px-4 py-2 border border-gray-200">{new Date(file.date).toLocaleDateString()}</td>
                </tr>
            ))}
        </>
    );
}
export default function ExcelPreview({ file }) {
    
    return (
        <div className="w-full h-full flex flex-col">
            <div className="w-full h-4/5 bg-white border border-gray-300 rounded-lg overflow-auto">
                <div className="sticky top-0 bg-gray-100 p-2 flex items-center border-b border-gray-300">                   
                    <FaFileExcel className=" text-green-500 mr-2"/>
                    <span className="font-medium">{file.title}</span>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-700 mb-2">Statistiques</h4>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Feuilles</span>
                                <span className="font-medium">3</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Lignes</span>
                                <span className="font-medium">256</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Taille</span>
                                <span className="font-medium">${file.size}</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-700 mb-2">Données clés</h4>
                            <div className="text-sm">
                                <div className="flex justify-between mb-1">
                                    <span>Valeur totale</span>
                                    <span className="font-medium">$12,450</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Moyenne</span>
                                    <span className="font-medium">$1,245</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h4 className="font-medium text-gray-700 mb-2">Aperçu des données</h4>
                    <table className="min-w-full border border-gray-200 mb-4">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-2 text-left border border-gray-200">ID</th>
                                <th className="px-4 py-2 text-left border border-gray-200">Nom</th>
                                <th className="px-4 py-2 text-left border border-gray-200">Valeur</th>
                                <th className="px-4 py-2 text-left border border-gray-200">Date</th>
                            </tr>
                        </thead>
                        <tbody>                           
                            <Tableau n={10} file={file}/>
                        </tbody>
                    </table>
                    <div className="bg-gray-100 p-3 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-2">Visualisation</h4>
                        <div className="h-40 bg-white rounded flex items-center justify-center text-gray-500 text-sm border border-gray-200">
                            [Graphique des données Excel]
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                <a href="${file.fileUrl}" target="_blank" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center">
                    <i className="fas fa-external-link-alt mr-2"></i>
                    <span>Ouvrir dans Excel</span>
                </a>
            </div>
        </div>
    )
}