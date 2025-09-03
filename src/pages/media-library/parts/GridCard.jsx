// ------------------------------
// File: media-library/parts/GridCard.jsx
// ------------------------------
import { Link } from "react-router-dom";
import { FaRegStar, FaStar, FaEye, FaDownload, FaShareAlt, FaCheckCircle } from "react-icons/fa";
import { TypeBadge, FileGlyph, Badge } from "../shared/atoms/atoms";
import { formatBytes, formatDate } from "../shared/utils/format";
import { isFav, toggleFav, isRead, markRead } from "../shared/store/markers";

export default function GridCard({ item, routeBase, onOpen }) {
  const fav = isFav(item.id);
  const read = isRead(item.id);
  const to = `${routeBase}/${encodeURIComponent(String(item.id))}`;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="thumb" className="w-16 h-16 object-cover rounded-xl" />
          ) : (
            <FileGlyph type={item.type} />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold truncate max-w-[200px]" title={item.name}>{item.name}</h4>
              {read ? <FaCheckCircle className="text-green-500" title="Lu" /> : <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" title="Non lu" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <TypeBadge type={item.type} />
              <Badge color="blue">{item.category}</Badge>
            </div>
          </div>
        </div>
        <button className={`p-2 rounded-md border ${fav ? "text-yellow-600 border-yellow-200" : "text-slate-600"}`} onClick={() => toggleFav(item.id)} title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}>
          {fav ? <FaStar /> : <FaRegStar />}
        </button>
      </div>

      <div className="px-4 pb-2 text-sm text-slate-600 line-clamp-2">{item.description}</div>

      <div className="mt-auto">
        <div className="bg-blue-50/70 px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            <span className="mr-4">{formatBytes(item.sizeBytes)}</span>
            <span className="mr-4">{formatDate(item.createdAt)}</span>
            <span>par {item.owner}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <Link to={to} className="hover:text-blue-600" title="Ouvrir / Visualiser" onClick={() => { markRead(item.id); onOpen?.(item); }}>
              <FaEye />
            </Link>
            <button className="hover:text-blue-600" title="Télécharger" onClick={() => alert("Téléchargement mock")}> <FaDownload /> </button>
            <button className="hover:text-blue-600" title="Partager" onClick={() => alert("Lien copié (mock)")}> <FaShareAlt /> </button>
          </div>
        </div>
      </div>
    </div>
  );
}
