import React from 'react'
import { FaFileAlt, FaClock, FaDownload } from 'react-icons/fa';

const Actu = () => {
    return (
        <div className='mt-20 min-h-screen flex flex-col items-center justify-center'>
            <div className='w-full max-w-6xl text-center'>
                <h2 className="text-3xl md:text-4xl font-bold text-title mb-4">
                    Actualités sur notre plateforme
                </h2>
                <div className="w-36 h-1 bg-[#1690FF] mx-auto  mb-10"></div>
            </div>
            <div className="card sticky-article bg-white rounded-lg shadow-lg mb-10">                        
            <div className="grid md:grid-cols-2">
                <div className="overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80" 
                         alt="Développement durable" 
                         className="cover-image w-full h-full"/>
                </div>
                <div className="p-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="tag-hover bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium transition-transform">Développement durable</span>
                        <span className="tag-hover bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium transition-transform">Afrique</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Stratégies innovantes pour le développement durable en Afrique subsaharienne</h2>
                    <p className="text-gray-600 mb-6">Par <span className="text-indigo-600 font-medium">Dr. Aminata Diallo</span> · Publié le 12 juillet 2023</p>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Une analyse approfondie des approches innovantes adoptées par les communautés locales pour répondre aux défis du développement durable. Ce rapport présente 12 études de cas provenant de 6 pays différents...
                    </p>
                    <div className="flex flex-wrap justify-between items-center">
                        <div className="flex items-center space-x-4 mb-4 md:mb-0">
                            <span className="text-gray-500 text-sm flex items-center">
                                <FaFileAlt className="mr-2" /> Rapport complet
                            </span>
                            <span className="text-gray-500 text-sm flex items-center">
                                <FaClock className="mr-2" /> 25 min. lecture
                            </span>
                        </div>
                        <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center">
                            <FaDownload className="mr-2" /> Télécharger
                        </button>
                    </div>
                </div>
            </div>
        </div>

        </div>
    )
}

export default Actu