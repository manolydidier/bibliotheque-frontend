// src/pages/articles/ArticleEditCreate.jsx
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ArticleForm from './ArticleForm';
import Toast from '../../../../../component/toast/Toaster';

const ArticleEditCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const initial = location.state?.article || null;
  const [toast, setToast] = React.useState(null);

  const onSaved = (art) => {
    setToast({ type:'success', message: id ? 'Article mis à jour' : 'Article créé' });
    setTimeout(()=> navigate('/articles'), 700);
  };

  return (
    <div className="p-6 space-y-4">
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{id ? 'Éditer article' : 'Créer un article'}</h2>
        <button onClick={()=>navigate('/articles')} className="px-3 py-2 border rounded">Retour</button>
      </div>
      <ArticleForm initial={initial} onSaved={onSaved} />
    </div>
  );
};

export default ArticleEditCreate;
