import React,{useEffect, useState} from 'react'
import { useTags } from '../configuration/tagTab/useTags';
import ErrorModal from './ErrorModal';
import { FaTimes } from 'react-icons/fa';

const TagModal = ({ isOpen, onClose, tag = null, onSuccess }) => {
    if (!isOpen) return null;

    // On ne récupère que ce qui est nécessaire pour la modale
    const { createTag, updateTag, error: submissionError } = useTags();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#CCCCCC'
    });

    // Ce `useEffect` garantit que le formulaire est correctement
    // rempli ou réinitialisé chaque fois que la modale s'ouvre ou que le tag change.
    useEffect(() => {
        if (isOpen) {
            if (tag && tag.id) {
                setFormData({
                    name: tag.name || '',
                    description: tag.description || '',
                    color: tag.color || '#CCCCCC'
                });
            } else {
                // Réinitialise pour la création
                setFormData({ name: '', description: '', color: '#CCCCCC' });
            }
        }
    }, [isOpen, tag]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (tag && tag.id) {
                await updateTag(tag.id, formData);
            } else {
                await createTag(formData);
            }           
            onSuccess();
        } catch (error) {
            console.error('Erreur:', error);           
        }
    };

    if (submissionError) {
        return <ErrorModal isOpen={true} onClose={onClose} message={JSON.stringify(submissionError)} />;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30  flex items-center justify-center overflow-y-auto pt-6  p-4">
            <div className=" w-full max-w-screen-lg bg-white rounded-xl shadow-sm p-6 mt-6 ">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">{tag && tag.id ? 'Modifier le tag' : 'Ajouter un nouveau tag'}</h2>
                    <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                {/* Formulaire de création */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="tagName" className="block text-sm font-medium text-gray-700 mb-1">
                            Nom du tag
                        </label>
                        <input
                            id="tagName"
                            type="text"
                            placeholder="Nom du tag"
                            className="block w-full px-3 py-2  border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="tagDescription" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            id="tagDescription"
                            placeholder="Description"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <label htmlFor="tagColor" className="block text-sm font-medium text-gray-700">
                            Couleur
                        </label>
                        <input
                            id="tagColor"
                            type="color"
                            className="p-1 h-10 w-14 block bg-white border border-gray-300 rounded-md cursor-pointer"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-6 border-t mt-6">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Annuler
                        </button>
                         
                        <button type="submit" className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'>
                            {tag && tag.id ? 'Modifier' : 'Créer'}                       
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default TagModal