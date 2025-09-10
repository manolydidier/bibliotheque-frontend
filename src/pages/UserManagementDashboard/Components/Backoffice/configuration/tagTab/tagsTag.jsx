import React, { useState } from "react";
import { FaEdit, FaPen, FaTrash } from "react-icons/fa";
import { useTags } from "../../../../../../hooks/UseTags";
import { FaPenAlt, FaTrashAlt } from "react-icons/fa";
import TagModal from "../../Modals/TagModal";
import LoadingComponent from "../../../../../../component/loading/LoadingComponent";
import ArticleList from "../../Modals/ArticleModal";
export default function TagsTab() {

    const { tags, loading, error, createTag, deleteTag, researchTag } = useTags();

    const [openTagModal, setOpenTagModal] = useState(false)
    const [openArticleForm, setOpenArticleForm] = useState(false)

    const [searchTerm, setSearchTerm] = useState('');

    const filteredTags = researchTag(searchTerm);

    const [tag, setTag] = useState(null);

    if (loading) return <LoadingComponent />;
        
    return (
        <div className="">
            <div className="flex justify-between">
                <input className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-1/3 p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    type="text" placeholder="Rechercher un tag" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <button
                    type="submit"
                    className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    onClick={() => setOpenTagModal(true)}
                >
                    Créer
                </button>
                <TagModal isOpen={openTagModal} onClose={() => {setOpenTagModal(false); setTag(null)}} tag={tag} />
            </div>
            <button
                    type="submit"
                    className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    onClick={() => setOpenArticleForm(true)}
                >
                    Créer article 
            </button>
            <ArticleList/>
            <div className="mt-8">                
                <div className="categories-list">
                    <h3>Tags ({filteredTags.length})</h3>

                    {filteredTags.map(tag=> (
                        <div key={tag.id} className="mt-4 p-3 bg-gray-50 rounded-lg w-full lg:w-1/2" style={{ borderLeft: `4px solid ${tag.color || '#ccc'}` }}>
                            <div className="flex justify-between items-center">
                                <p className="font-semibold" style={{ color: tag.color }}>{tag.name}</p>
                                <div className="flex flex-row gap-3">
                                    <FaPenAlt className="text-sm text-gray-500" onClick={() => {setTag(tag); setOpenTagModal(true)}} />
                                    <FaTrashAlt onClick={() => deleteTag(tag.id)} className="text-sm text-red-300" />
                                </div>
                            </div>

                            {tag.description && (
                                <p className="text-sm text-gray-600">{tag.description}</p>
                            )}

                            <div className="category-actions">

                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}