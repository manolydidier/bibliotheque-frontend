// ------------------------------
// File: media-library/parts/ListTable.jsx
// ------------------------------
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FaRegStar, FaStar, FaDownload, FaShareAlt } from "react-icons/fa";
import { TypeBadge, SortIcon } from "../shared/atoms/atoms";
import { formatBytes, formatDate } from "../shared/utils/format";
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
            <TableHeaderCell label="Nom" sortKey="name" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Type" sortKey="type" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Ext" sortKey="ext" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Taille" sortKey="sizeBytes" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Catégorie" sortKey="category" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Propriétaire" sortKey="owner" sort={sort} setSort={setSort} />
            <TableHeaderCell label="Créé le" sortKey="createdAt" sort={sort} setSort={setSort} />
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((u) => {
            const fav = isFav(u.id);
            const read = isRead(u.id);
            const to = `${routeBase}/${encodeURIComponent(String(u.id))}`;
            return (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-3 py-2">
                  {u.thumbnail ? (
                    <img src={u.thumbnail} alt="thumb" className="w-10 h-10 object-cover rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">📄</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {!read && <span className="w-2 h-2 bg-blue-500 rounded-full" title="Non lu" />}
                    <Link to={to} className="font-medium hover:underline" onClick={() => markRead(u.id)}>
                      {u.name}
                    </Link>
                  </div>
                  <div className="text-xs text-slate-500 truncate max-w-[360px]">{u.description}</div>
                </td>
                <td className="px-3 py-2"><TypeBadge type={u.type} /></td>
                <td className="px-3 py-2 text-sm">{u.ext}</td>
                <td className="px-3 py-2 text-sm">{formatBytes(u.sizeBytes)}</td>
                <td className="px-3 py-2 text-sm">{u.category}</td>
                <td className="px-3 py-2 text-sm">{u.owner}</td>
                <td className="px-3 py-2 text-sm">{formatDate(u.createdAt)}</td>
                <td className="px-3 py-2 text-right">
                  <button className="px-2 py-1.5 rounded-md border mr-2" onClick={() => toggleFav(u.id)}>
                    {fav ? <FaStar className="text-yellow-600" /> : <FaRegStar />}
                  </button>
                  <button className="px-2 py-1.5 rounded-md border mr-2" onClick={() => alert("Téléchargement mock")}> <FaDownload /> </button>
                  <button className="px-2 py-1.5 rounded-md border" onClick={() => alert("Lien copié (mock)")}> <FaShareAlt /> </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}