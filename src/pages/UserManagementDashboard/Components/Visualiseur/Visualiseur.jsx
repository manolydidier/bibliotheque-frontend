import React, { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import FileDetails from './FileDetails';
import FilePreview from './FilePreview/FilePreview';
import FullscreenModal from './FullScreenModal';
import mediaData from '../Backoffice/Data';
import Tabs from './Tabs';
import { FaArrowLeft, FaArrowRight, FaExpand, FaRedo, FaShare, FaDownload, FaShareSquare, FaShareAlt } from 'react-icons/fa';
import { useParams } from 'react-router-dom';

const Visualiseur = () => {
    //const file = mediaData[2];
    const {photoName} = useParams();
    // The photoName from the URL is a string. We compare it to media.id, which might be a number.
    // To ensure a correct strict comparison (===), we convert media.id to a string.
    const file = mediaData.find(media => String(media.id) === decodeURIComponent(photoName));
    console.log(file)
    const [activeTab, setActiveTab] = useState('Visualisation');
    const { setTitle } = useOutletContext();
    


    useEffect(() => {
        setTitle("Visualiseur");
    }, [setTitle])

    if (!file) {
        return <div className="p-4 text-center text-red-500">Fichier non trouvé. Vérifiez l'ID dans l'URL.</div>;
    }

    
    return (
        <>
            <div className='bg-white rounded-xl shadow-sm '>
                <div className="border-b border-gray-200 p-4 flex justify-between items-center">

                    {/* Barre d'outils */}
                    <div className="flex items-center space-x-4">
                        <button className="text-gray-600 hover:text-blue-600">                            
                            <FaArrowLeft className='mr-2' />
                        </button>
                        <button className="text-gray-600 hover:text-blue-600">                            
                            <FaArrowRight className='mr-2' />
                        </button>
                        <button className="text-gray-600 hover:text-blue-600">                            
                            <FaRedo className='mr-2'/>
                        </button>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button id="fullscreen-btn" className="text-gray-600 hover:text-blue-600 flex items-center">                            
                            <FaExpand className='mr-2'/>
                            <span>Plein écran</span>
                        </button>
                        <button className="text-gray-600 hover:text-blue-600 flex items-center">                            
                            <FaDownload className='mr-2'/>
                            <span>Télécharger</span>
                        </button>
                        <button className="text-gray-600 hover:text-blue-600 flex items-center">                           
                            <FaShareAlt className='mr-2'/>
                            <span>Partager</span>
                        </button>
                    </div>
                </div>
                <div className=' flex flew-row '>
                    <div className='flex-1 p-6'>
                        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                        <FilePreview file={file} activeTab={activeTab} />
                    </div>
                    <div className='w-1/3 border-l border-gray-200'>
                        <FileDetails file={file} />
                    </div>

                </div>

            </div>

        </>
    )
}

export default Visualiseur