import React, { useState } from "react";
import { FaEdit, FaPen, FaTrash } from "react-icons/fa";

export default function TagsTab(){

    const [tags, setTags] = useState([]);

     return (
        <div className="">
            <div className="flex justify-between">
                <input className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-1/3 p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
                type="text" placeholder="Rechercher un tag"/>
                <button 
                type="submit" 
                className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                
                >
                    Créer 
                </button>
            </div>
            <div className="mt-8">
                <p className="text-lg font-semibold text-gray-700">Liste des Tags</p>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg w-1/2">
                    <div className="flex justify-between items-center">
                        <p className=" text-blue-700 font-semibold">Tag</p>
                        <div className="flex flex-row gap-2">
                             <FaPen className=" text-gray-400 text-sm" />                           
                        </div>

                    </div>
                    <p className="text-sm text-gray-600">Dercription lavaaaaaaaaaa</p>
                </div>
            </div>
        </div>
    )
}