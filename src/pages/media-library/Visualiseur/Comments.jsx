import React, { useMemo, useState } from "react";
import { FaUser } from "react-icons/fa";

export default function Comments({ initialComments = [], onSubmit }) {
  const seed = useMemo(() => Math.random().toString(36).slice(2, 7), []);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(() =>
    (initialComments || []).map((c, i) => ({
      id: c.id || i + 1,
      author: c.author?.name || c.user?.name || 'Anonyme',
      date: c.created_at ? new Date(c.created_at).toLocaleDateString() : '—',
      content: c.content || c.body || '',
      color: getRandomColor(seed + i)
    }))
  );

  function getRandomColor(key = '') {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return `#${'00000'.substring(0, 6 - c.length) + c}`;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = comment.trim();
    if (!val) return;
    onSubmit?.(val);
    setComments(prev => ([...prev, {
      id: prev.length ? prev[prev.length - 1].id + 1 : 1,
      author: 'Vous',
      date: 'Maintenant',
      content: val,
      color: getRandomColor(seed + (prev.length + 1))
    }]));
    setComment('');
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Commentaires</h2>
      <div className="comment-box bg-gray-50 p-4 rounded-lg mb-4">
        {comments.length === 0 && <p className="text-sm text-gray-500">Aucun commentaire.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex mb-4">
            <div style={{ backgroundColor: c.color }} className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
              <FaUser className="text-white text-sm" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{c.author}</p>
              <p className="text-xs text-gray-500">{c.date}</p>
              <p className="text-sm mt-1 whitespace-pre-line">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
          <FaUser className="text-gray-600 text-sm"/>
        </div>
        <form className="flex-1" onSubmit={handleSubmit}>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows="2" placeholder="Ajouter un commentaire..."></textarea>
          <button type="submit" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm">Envoyer</button>
        </form>
      </div>
    </div>
  );
}
