// ------------------------------
// File: media-library/parts/ListTable.jsx (Adapté pour les articles)
// ------------------------------
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FaRegStar, FaStar, FaEye, FaShareAlt, FaUser, FaComment, FaThumbsUp } from "react-icons/fa";
import { SortIcon } from "../shared/atoms/atoms";
import { formatDate } from "../shared/utils/format";
import { isFav, toggleFav, isRead, markRead } from "../shared/store/markers";

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
    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-600 cursor-pointer select-none" onClick={toggle}>
      {label} <SortIcon state={state} />
    </th>
  );
};

export default function ListTable({ rows, sort, setSort, routeBase }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2" />
            <TableHeaderCell label="Titre" sortKey="title" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Auteur" sortKey="author" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Catégorie" sortKey="category" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Publié le" sortKey="published_at" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Vues" sortKey="view_count" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Commentaires" sortKey="comment_count" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Note" sortKey="rating_average" sort={sort} setSort={setSort} />
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((article) => {
            const fav = isFav(article.id);
            const read = isRead(article.id);
            const to = `${routeBase}/${encodeURIComponent(String(article.slug))}`;
            const primaryCategory = article.categories.length > 0 ? article.categories[0].name : "Non catégorisé";
            
            return (
              <tr key={article.id} className="hover:bg-slate-50/50">
                <td className="px-3 py-2">
                  {article.featured_image_url ? (
                    <img src={article.featured_image_url} alt="thumb" className="w-10 h-10 object-cover rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">📝</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {!read && <span className="w-2 h-2 bg-blue-500 rounded-full" title="Non lu" />}
                    <Link to={to} className="font-medium hover:underline" onClick={() => markRead(article.id)}>
                      {article.title}
                    </Link>
                  </div>
                  <div className="text-xs text-slate-500 truncate max-w-[360px]">{article.excerpt}</div>
                </td>
                <td className="px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-slate-400" size={12} />
                    {article.author?.name || "Auteur inconnu"}
                  </div>
                </td>
                <td className="px-3 py-2 text-sm">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                    {primaryCategory}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm">{formatDate(article.published_at)}</td>
                <td className="px-3 py-2 text-sm">
                  <div className="flex items-center gap-1">
                    <FaEye className="text-slate-400" size={12} />
                    {article.formatted_view_count || article.view_count}
                  </div>
                </td>
                <td className="px-3 py-2 text-sm">
                  <div className="flex items-center gap-1">
                    <FaComment className="text-slate-400" size={12} />
                    {article.formatted_comment_count || article.comment_count}
                  </div>
                </td>
                <td className="px-3 py-2 text-sm">
                  <div className="flex items-center gap-1">
                    <FaThumbsUp className="text-slate-400" size={12} />
                    {article.formatted_rating || article.rating_average}/5
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <button className="px-2 py-1.5 rounded-md border mr-2" onClick={() => toggleFav(article.id)}>
                    {fav ? <FaStar className="text-yellow-600" /> : <FaRegStar />}
                  </button>
                  <Link
                    to={to}
                    className="px-2 py-1.5 rounded-md border mr-2 inline-block"
                    onClick={() => markRead(article.id)}
                  >
                    <FaEye />
                  </Link>
                  <button className="px-2 py-1.5 rounded-md border" onClick={() => alert("Partager (mock)")}>
                    <FaShareAlt />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}