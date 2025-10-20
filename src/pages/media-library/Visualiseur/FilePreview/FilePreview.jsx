// src/media-library/parts/Visualiseur/FilePreview/FilePreview.jsx
import React, { useMemo } from "react";
import { toAbsolute, pickPrimaryMedia, guessKind } from "./helpers";

import ImagePreview from "./ImagePreview";
import VideoPreview from "./VideoPreview";
import AudioPreview from "./AudioPreview";
import PdfFilePreview from "./PdfFilePreview";
import WordPreview from "./WordPreview";
import ExcelPreview from "./ExcelPreview";
import PowerPointPreview from "./PowerPointPreview";
import ShapefilePreview from "./ShapefilePreview";
import OtherPreview from "./OtherPreview";

import MetaPreview from "./MetaPreview";
import VersionPreview from "./VersionPreview";
import StatistiquePreview from "./StatistiquePreview";

/**
 * Props attendues :
 * - file : un "article" ou un "media item"
 *   on essaie d'en déduire {url, mime} avec pickPrimaryMedia(file).
 * - activeTab : "Aperçu" | "Médias" | "Métadonnées" | "Versions" | "Statistiques"
 */
export default function FilePreview({ file, activeTab = "Aperçu" }) {
  // Onglets "métier" (tu peux renommer pour matcher ton UI)
  if (activeTab === "Métadonnées") return <MetaPreview item={file} />;
  if (activeTab === "Versions")     return <VersionPreview history={file?.history || []} />;
  if (activeTab === "Statistiques") {
    return (
      <StatistiquePreview
        stats={{
          views: file?.view_count ?? 0,
          shares: file?.share_count ?? 0,
          comments: file?.comment_count ?? 0,
          rating: Number.isFinite(Number(file?.rating_average)) ? Number(file.rating_average) : null,
          rating_count: file?.rating_count ?? 0,
        }}
      />
    );
  }

  // --------- Aperçu par type ---------
  // 1) prendre le média “prioritaire” de l’article (featured ou 1er media[])
  const media = useMemo(() => pickPrimaryMedia(file), [file]); // { url, mime, title? }
  // 2) déterminer la famille du fichier
  const kind  = useMemo(() => guessKind(media, file), [media, file]);

  // 3) route vers le bon viewer
  switch (kind) {
    case "image":
      return <ImagePreview src={toAbsolute(media.url)} alt={file?.featured_image_alt || file?.title} />;
    case "video":
      return <VideoPreview src={toAbsolute(media.url)} type={media.mime} />;
    case "audio":
      return <AudioPreview src={toAbsolute(media.url)} type={media.mime} />;
    case "pdf":
      return <PdfFilePreview src={toAbsolute(media.url)} title={file?.title} />;
    case "word":
      return <WordPreview src={toAbsolute(media.url)} title={file?.title} />;
    case "excel":
      return <ExcelPreview src={toAbsolute(media.url)} title={file?.title} size={file?.size} date={file?.published_at || file?.created_at} />;
    case "powerpoint":
      return <PowerPointPreview src={toAbsolute(media.url)} title={file?.title} />;
    case "shapefile":
      return <ShapefilePreview src={toAbsolute(media.url)} title={file?.title} />;
    case "article":
      return (
        <article className="prose max-w-none">
          <h2 className="text-xl font-semibold mb-2">{file?.title}</h2>
          <div className="whitespace-pre-line text-slate-800 leading-relaxed">{file?.content}</div>
        </article>
      );
    default:
      return <OtherPreview src={toAbsolute(media.url)} title={file?.title} />;
  }
}
