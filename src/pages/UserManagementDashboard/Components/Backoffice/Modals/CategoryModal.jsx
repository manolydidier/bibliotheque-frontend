import React,{useState,useEffect} from 'react'
import { useCategories } from '../../../../../hooks/useCategory';

const CategoryModal = ({isOpen, onClose}) => {

    const { categories, loading, error, createCategory, deleteCategory, searchCategoriesLocal } = useCategories();
    const [newCategory, setNewCategory] = useState({
        name: '',
        description: '',
        color: '#3B82F6'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createCategory(newCategory);
            setNewCategory({ name: '', description: '', color: '#3B82F6' });
           
        } catch (error) {
            console.error('Erreur:', error);
        }
        onClose()
    };

    if (!isOpen) {
        return null;
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-30  flex items-center justify-center overflow-y-auto pt-6  p-4">
            <div className=" w-full max-w-screen-lg bg-white rounded-xl shadow-sm p-6 mt-6 ">
                {/* Formulaire de création */}
                <form onSubmit={handleSubmit} className="category-form">
                    <div className="mb-5">
                        <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                            Nom de la categorie
                        </label>
                        <input
                            type="text"
                            id='nom'
                            placeholder="Nom de la catégorie *"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            required
                            className="block w-full px-3 py-2  border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div className="mb-5">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            placeholder="Description"
                            id='description'
                            value={newCategory.description}
                            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                            className="block w-full px-3 py-2  border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="couleur" className="block text-sm font-medium text-gray-700 mb-1">
                            Couleur
                        </label>
                        <input
                            type="color"
                            id='couleur'
                            value={newCategory.color}
                            onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                            className="form-color"
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

export default CategoryModal