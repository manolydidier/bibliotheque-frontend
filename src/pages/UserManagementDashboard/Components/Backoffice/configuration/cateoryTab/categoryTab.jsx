import React, { useState, useEffect } from "react";
import { useCategories } from "../../../../../../hooks/useCategory";
import CategoryModal from "../../Modals/CategoryModal";
import { FaPenAlt, FaTrashAlt } from "react-icons/fa";

export default function CategoryTab() {
    const [add, setAdd]= useState(false);

    const { categories, loading, error, deleteCategory, searchCategoriesLocal } = useCategories();   
    const [searchTerm, setSearchTerm] = useState('');
    // Filtrage local des catégories
    const filteredCategories = searchCategoriesLocal(searchTerm);

    if (loading) return <div className="loading">Chargement...</div>;

    return (
        <div className="category-manager">
            <div className="flex justify-between mb-8">
                <input
                    type="text"
                    placeholder="Rechercher une catégorie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-1/3 p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button 
                    onClick={() => setAdd(!add)}
                    type="submit" className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'>
                    Créer
                </button>
            </div>                
            <CategoryModal isOpen={add} onClose={() => setAdd(false)} /> 

            {error && (
                <div className="error-message">
                    {typeof error === 'object' ? JSON.stringify(error) : error}
                </div>
            )}
                    
            {/* Liste des catégories */}
            <div className="categories-list">
                <h3>Catégories ({filteredCategories.length})</h3>

                {filteredCategories.map(category => (
                    <div key={category.id} className="mt-4 p-3 bg-gray-50 rounded-lg w-1/2" style={{ borderLeft: `4px solid ${category.color || '#ccc'}` }}>
                        <div className="flex justify-between items-center">
                            <p className="font-semibold" style={{ color: category.color }}>{category.name}</p>                           
                            <div className="flex flex-row gap-3">
                                <FaPenAlt className="text-sm text-gray-500"/>
                                <FaTrashAlt onClick={() => deleteCategory(category.id)} className="text-sm text-red-300"/>                                
                            </div>
                        </div>

                        {category.description && (
                            <p className="text-sm text-gray-600">{category.description}</p>
                        )}

                        <div className="category-actions">
                            
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}