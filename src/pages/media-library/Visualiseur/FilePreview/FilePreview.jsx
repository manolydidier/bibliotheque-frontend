// src/media-library/parts/Visualiseur/FilePreview/FilePreview.jsx
import React, { useMemo } from "react";
import { toAbsolute, pickPrimaryMedia, guessKind } from "./helpers";

import ImagePreview from "./ImagePreview";
import VideoPreview from "./VideoPreview";
import AudioPreview from "./AudioPreview";
import PdfFilePreview from "./PdfFilePreview";
import WordPreview from "./WordPreview";
import ExcelPreview from "./ExcelPreview";

// ⬇️ remplace l’import “pro” par la version simple
import PowerPointPreview from "./PowerPointPreview";
import HtmlPreviewPro from "./HtmlPreviewPro";
import ShapefilePreviewPro from "./ShapefilePreview";

import OtherPreview from "./OtherPreview";
import MetaPreview from "./MetaPreview";
import VersionPreview from "./VersionPreview";
import StatistiquePreview from "./StatistiquePreview";

export default function FilePreview({ file, activeTab = "Aperçu" }) {
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

  const media = useMemo(() => pickPrimaryMedia(file), [file]); // {url,mime,title?}
  const kind  = useMemo(() => guessKind(media, file), [media, file]);

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
      // ⬇️ utilise le viewer simple
      return <PowerPointPreview src={toAbsolute(media.url)} title={file?.title} />;
    case "html":
      return <HtmlPreviewPro src={toAbsolute(media.url)} title={file?.title} />;
    case "shapefile":
      return <ShapefilePreviewPro src={toAbsolute(media.url)} title={file?.title} />;
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
