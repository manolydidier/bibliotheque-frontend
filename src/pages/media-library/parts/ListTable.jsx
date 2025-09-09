import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FaRegStar, FaStar, FaEye, FaShareAlt, FaUser, FaThumbsUp, FaCalendarAlt, FaTag } from "react-icons/fa";
import { SortIcon } from "../shared/atoms/atoms";
import { isFav, toggleFav, isRead, markRead } from "../shared/store/markers";

function getCategoryFromTitle(title) {
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('intelligence artificielle') || titleLower.includes('ia')) return "Intelligence Artificielle";
  if (titleLower.includes('startup')) return "Startup";
  if (titleLower.includes('développement') || titleLower.includes('web')) return "Développement Web";
  if (titleLower.includes('marketing')) return "Business";
  if (titleLower.includes('technologie')) return "Mobile";
  return "Article";
}

// Helpers URL visualiseur
const cleanSlug = (x) => {
  const s = (x ?? '').toString().trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  return s;
};
const VISUALISEUR_BASE = "/media-library";
const buildVisualiserPath = (base, rec) => {
  const slug = cleanSlug(rec?.slug);
  const id   = rec?.id != null ? String(rec.id) : null;
  const key  = slug || id || '';
  return `${base || VISUALISEUR_BASE}/${encodeURIComponent(key)}`;
};

const TableHeaderCell = ({ label, sortKey, sort, setSort }) => {
  const state = useMemo(() => sort.find((s) => s.key === sortKey)?.dir, [sort, sortKey]);
  const toggle = () => {
    setSort((cur) => {
      const idx = cur.findIndex((s) => s.key === sortKey);
      if (idx === -1) return [{ key: sortKey, dir: "asc" }];
      const copy = [...cur];
      const curDir = copy[idx].dir;
      const nextDir = curDir === "asc" ? "desc" : curDir === "desc" ? null : "asc";
      if (!nextDir) return copy.filter((_, i) => i !== idx);
      copy[idx] = { key: sortKey, dir: nextDir };
      return copy;
    });
  };
  return (
    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100/50" onClick={toggle}>
      <div className="flex items-center gap-1">
        {label}
        <SortIcon state={state} />
      </div>
    </th>
  );
};

export default function ListTable({ rows, sort, setSort, routeBase }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
          <tr>
            <th className="px-3 py-3 text-xs font-medium text-slate-600">Image</th>
            <TableHeaderCell label="Titre" sortKey="title" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Auteur" sortKey="author_id" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Catégorie" sortKey="title" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Publié le" sortKey="published_at" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Vues" sortKey="view_count" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Note" sortKey="rating_average" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Statut" sortKey="status" sort={sort} setSort={setSort} />
            <th className="px-3 py-3 text-xs font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((article) => {
            const fav = isFav(article.id);
            const read = isRead(article.id);
            const to = buildVisualiserPath(routeBase, article);
            const primaryCategory = getCategoryFromTitle(article.title);

            const formattedViewCount = article.view_count > 1000
              ? `${(article.view_count / 1000).toFixed(1)}k`
              : `${article.view_count ?? 0}`;

            const formattedRating = article.rating_average
              ? parseFloat(article.rating_average).toFixed(1)
              : '0.0';

            const formattedDate = article.published_at ? new Date(article.published_at).toLocaleDateString('fr-FR', {
              day: '2-digit', month: '2-digit', year: 'numeric'
            }) : '—';

            return (
              <tr key={article.id} className="hover:bg-slate-50/50 transition-colors duration-200 group">
                <td className="px-3 py-4">
                  {article.featured_image_url ? (
                    <img
                      src={article.featured_image_url}
                      alt="thumb"
                      className="w-12 h-12 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center group-hover:from-slate-200 group-hover:to-slate-300 transition-colors duration-200">
                      📝
                    </div>
                  )}
                </td>

                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    {!read && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Non lu" />}
                    <div className="min-w-0 flex-1">
                      <Link
                        to={to}
                        className="font-semibold text-slate-900 hover:text-blue-600 transition-colors duration-200 block truncate"
                        onClick={() => markRead(article.id)}
                        title={article.title}
                      >
                        {article.title}
                      </Link>
                      <div className="text-xs text-slate-500 truncate max-w-[400px] mt-1">
                        {article.excerpt}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {article.is_featured && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⭐ À la une
                          </span>
                        )}
                        {article.is_sticky && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            📌 Épinglé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <FaUser className="text-slate-500" size={12} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">Auteur #{article.author_id}</div>
                      <div className="text-xs text-slate-500">ID: {article.author_id}</div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-sm">
                  <span className="inline-flex items-center px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition-colors duration-200">
                    <FaTag className="mr-1" size={10} />
                    {primaryCategory}
                  </span>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-slate-400" size={12} />
                    <div>
                      <div className="font-medium text-slate-900">{formattedDate}</div>
                      <div className="text-xs text-slate-500">
                        {article.published_at ? new Date(article.published_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FaEye className="text-blue-600" size={12} />
                    </div>
                    <div>
                      <div className="font-bold text-blue-700">{formattedViewCount}</div>
                      <div className="text-xs text-slate-500">vues</div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <FaThumbsUp className="text-amber-600" size={12} />
                    </div>
                    <div>
                      <div className="font-bold text-amber-700">{formattedRating}/5</div>
                      <div className="text-xs text-slate-500">{article.rating_count || 0} avis</div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        article.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : article.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {article.status === 'published' ? '✅ Publié' : 
                         article.status === 'draft' ? '📝 Brouillon' :
                         `📄 ${article.status}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {article.is_featured && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">⭐ Featured</span>
                      )}
                      {article.is_sticky && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">📌 Sticky</span>
                      )}
                      {article.visibility !== 'public' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">🔒 {article.visibility}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">Créé le {new Date(article.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                </td>

                <td className="px-3 py-4 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      className={`p-2 rounded-lg border transition-all duration-200 hover:scale-105 ${
                        fav ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'
                            : 'text-slate-400 bg-white border-slate-200 hover:text-amber-500 hover:border-amber-300'
                      }`}
                      onClick={() => toggleFav(article.id)}
                      title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                      {fav ? <FaStar size={14} /> : <FaRegStar size={14} />}
                    </button>

                    <Link
                      to={to}
                      className="p-2 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:scale-105 transition-all duration-200 inline-flex items-center justify-center"
                      onClick={() => markRead(article.id)}
                      title="Lire l'article"
                    >
                      <FaEye size={14} />
                    </Link>

                    <button
                      className="p-2 rounded-lg border text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100 hover:scale-105 transition-all duration-200"
                      onClick={() => {
                        const url = `${window.location.origin}${to}`;
                        if (navigator.share) {
                          navigator.share({ title: article.title, url });
                        } else if (navigator.clipboard) {
                          navigator.clipboard.writeText(url);
                        }
                      }}
                      title="Partager"
                    >
                      <FaShareAlt size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-6xl mb-4">📝</div>
          <div className="text-lg font-medium mb-2">Aucun article trouvé</div>
          <div className="text-sm">Essayez de modifier vos critères de recherche</div>
        </div>
      )}
    </div>
  );
}
