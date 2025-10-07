// src/pages/articles/TrashedPage.jsx
import React, { useEffect, useState } from 'react';
import { destroyArticle, listTrashedArticles, restoreArticle } from './articles';
import { Link } from 'react-router-dom';
import Toast from '../../../../../component/toast/Toaster';


const TrashedPage = () => {
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(10);
  const [data, setData] = useState({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listTrashedArticles({ page, per_page: per });
      // Le contrôleur renvoie 'data' = paginator complet
      const pg = res?.data;
      setData(pg || { data: [], meta: { current_page: 1, last_page: 1, total: 0 } });
    } catch (e) {
      setToast({ type:'error', message: e?.response?.data?.message || 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, per]); // eslint-disable-line

  const doRestore = async (id) => {
    try { await restoreArticle(id); setToast({ type:'success', message:'Article restauré' }); load(); }
    catch (e) { setToast({ type:'error', message: e?.response?.data?.message || 'Erreur' }); }
  };

  const doDestroy = async (id) => {
    if (!window.confirm('Suppression définitive ?')) return;
    try { await destroyArticle(id); setToast({ type:'success', message:'Supprimé définitivement' }); load(); }
    catch (e) { setToast({ type:'error', message: e?.response?.data?.message || 'Erreur' }); }
  };

  return (
    <div className="p-6 space-y-4">
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Corbeille des articles</h2>
        <Link to="/articles" className="px-3 py-2 border rounded">Retour</Link>
      </div>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Titre</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Supprimé le</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map(a => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{a.id}</td>
                <td className="p-3">{a.title}</td>
                <td className="p-3">{a.slug}</td>
                <td className="p-3">{a.deleted_at}</td>
                <td className="p-3 flex gap-2">
                  <button className="px-2 py-1 rounded border" onClick={()=>doRestore(a.id)}>Restaurer</button>
                  <button className="px-2 py-1 rounded border text-red-600" onClick={()=>doDestroy(a.id)}>Suppr. def.</button>
                </td>
              </tr>
            ))}
            {(!loading && data.data.length === 0) && (
              <tr><td className="p-4 text-gray-500" colSpan={5}>Corbeille vide</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <select value={per} onChange={e=>{ setPer(Number(e.target.value)); setPage(1); }}
                className="border rounded px-2 py-1">
          <option>10</option><option>20</option><option>50</option>
        </select>
        <button className="px-3 py-1 border rounded" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Préc.</button>
        <span className="text-sm text-gray-600">Page {data.meta.current_page} / {data.meta.last_page}</span>
        <button className="px-3 py-1 border rounded" disabled={page>=data.meta.last_page} onClick={()=>setPage(p=>p+1)}>Suiv.</button>
      </div>
    </div>
  );
};

export default TrashedPage;
