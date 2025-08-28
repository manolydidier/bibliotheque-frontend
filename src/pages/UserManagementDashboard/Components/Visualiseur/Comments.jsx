
import React, { useState } from "react";
import { FaUser } from "react-icons/fa";

export default function Comments({onSubmit}) {
    const [comment, setComment] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if(!comment) return;       
        onSubmit(comment);
        setComments([...comments, {
            id: comments.length + 1,
            author: 'Jean Dupont',
            date: '2 jours',
            content: comment,
            color: getRandomColor()
        }])
        setComment('');
    }


    const getRandomColor = () => {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    console.log(getRandomColor())


    const [comments, setComments] =useState( [
        {
            id: 1,
            author: 'Jean Dupont',
            date: '2 jours',
            content:'Ce fichier contient des informations très utiles pour le projet en cours.',
            color: getRandomColor()

        },
        {
            id: 2,
            author: 'Marie Martin',
            date: 'Aujourd\'hui',
            content:'Pourriez-vous ajouter les données du dernier trimestre ?',
            color: getRandomColor()
        }
    ])

    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Commentaires</h2>

            <div className="comment-box bg-gray-50 p-4 rounded-lg mb-4">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex mb-4">
                        <div
                            style={{ backgroundColor: comment.color }}
                            className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
                        >
                            <FaUser className="text-white text-sm" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">{comment.author}</p>
                            <p className="text-xs text-gray-500">{comment.date}</p>
                            <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                    </div>

                ))}

            </div>

            <div className="flex items-start">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">                    
                    <FaUser className="fas fa-user text-gray-600 text-sm"/>
                </div>
                <form
                    className="flex-1"
                    onSubmit={handleSubmit}
                >
                <div className="flex-1">
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows="2" placeholder="Ajouter un commentaire..."></textarea>
                    <button type="submit" value="Envoyer" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm">Envoyer</button>
                </div>
                </form>
            </div>

        </div>
    )
}