import React,{useState} from 'react'
import { useTags } from '../../../../../hooks/UseTags';
import ErrorModal from './ErrorModal';
import { FaTimes } from 'react-icons/fa';

const TagModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const { tags, loading, error, createTag, deleteTag } = useTags();
    const [newTag, setNewTag] = useState({ name: '', description: '', color: '' });


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createTag(newTag);
            setNewTag({ name: '', description: '', color: '#fbfbfb' });
            onClose();
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    if (loading) return <div>Chargement...</div>;
    if (error) {
        // Affichez directement la modale d'erreur si une erreur existe.
        // La prop `isOpen` doit être `true`.
        // La fonction `onClose` de la modale d'erreur devrait probablement fermer la modale principale.
        return <ErrorModal isOpen={true} onClose={onClose} message={JSON.stringify(error)} />;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30  flex items-center justify-center overflow-y-auto pt-6  p-4">
            <div className=" w-full max-w-screen-lg bg-white rounded-xl shadow-sm p-6 mt-6 ">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Ajouter un nouveau tag</h2>
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
                            value={newTag.name}
                            onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
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
                            value={newTag.description}
                            onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
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
                            value={newTag.color}
                            onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-6 border-t mt-6">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Annuler
                        </button>
                        <button type="submit" className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'>
                            Créer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default TagModal