// src/pages/articles/ArticleEditCreate.jsx
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ArticleForm from './ArticleForm';
import Toast from '../../../../../component/toast/Toaster';
import { FiChevronLeft } from 'react-icons/fi';

const ArticleEditCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const initial = location.state?.article || null;

  const [toast, setToast] = React.useState(null);

  // --- Scroll container + auto-hide header ---
  const scrollRef = React.useRef(null);
  const lastY = React.useRef(0);
  const [showHeader, setShowHeader] = React.useState(true);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      const goingDown = y > lastY.current;
      lastY.current = y;
      // cache le header si on descend, montre si on remonte
      setShowHeader(!goingDown || y < 8);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const onSaved = () => {
    setToast({ type: 'success', message: id ? 'Article mis à jour' : 'Article créé' });
  };

  return (
    <div className="h-screen w-full overflow-auto  bg-white">
      {/* Toaster (fixe) */}
      {toast && (
        <div className="fixed right-4 top-4 z-[10000]">
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Header sticky ultra-compact + auto-hide */}
      <header
        className={`sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur
        transition-transform duration-200 ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="mx-auto max-w-screen-2xl px-3">
          <div className="flex items-center justify-between h-11">
            <h2 className="text-sm font-semibold truncate">
              {id ? 'Éditer article' : 'Créer un article'}
            </h2>
            <button
              onClick={() => navigate('/articlescontroler')}
              className="inline-flex items-center gap-2 px-2 py-1.5 border rounded-lg text-sm hover:bg-slate-50"
              title="Retour"
            >
              <FiChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>
          </div>
        </div>
      </header>

      {/* Zone de travail scrollable (économie d’espace) */}
      <div ref={scrollRef} className="h-[100%] "> 
        <div className="mx-auto max-w-screen-2xl px-3 py-3">
          <ArticleForm initial={initial} onSaved={onSaved} />
        </div>
      </div>
    </div>
  );
};

export default ArticleEditCreate;
