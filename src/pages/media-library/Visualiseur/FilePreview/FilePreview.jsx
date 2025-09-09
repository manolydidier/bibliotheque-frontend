// ------------------------------
// File: media-library/parts/Visualiseur/FilePreview/FilePreview.jsx
// Orchestrateur d'aperçus (tabs + type de média)
// ------------------------------
import React, { useMemo } from 'react';
import ImagePreview from './ImagePreview';
import VideoPreview from './VideoPreview';
import PdfFilePreview from './PdfFilePreview';
import WordPreview from './WordPreview';
import ExcelPreview from './ExcelPreview';
import MetaPreview from './metaPreview';
import VersionPreview from './VersionPreview';
import StatistiquePreview from './StatistiquePreview';

// Transforme une URL relative en absolue selon VITE_API_BASE_URL (en retirant /api)
const toAbsolute = (u) => {
  if (!u) return null;
  const s = String(u);
  if (/^https?:\/\//i.test(s)) return s;
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/i, '');
  return base ? `${base}/${s.replace(/^\/+/, '')}` : s;
};

// Essaye de récupérer le média prioritaire d’un article
const pickPrimaryMedia = (file) => {
  // 1) featured_image (string ou { url })
  if (typeof file?.featured_image === 'string') {
    return { url: toAbsolute(file.featured_image), mime: file?.featured_image_mime || '' };
  }
  if (file?.featured_image?.url) {
    return { url: toAbsolute(file.featured_image.url), mime: file?.featured_image?.mime || file?.featured_image?.type || '' };
  }
  // 2) premier media[]
  const m = Array.isArray(file?.media) ? file.media[0] : null;
  if (m?.url) return { url: toAbsolute(m.url), mime: m.mime || m.type || '' };
  return { url: null, mime: '' };
};

// Déduit une “famille” à partir du mime/extension
const guessKind = (media, file) => {
  const mime = (media?.mime || '').toLowerCase();
  const url = (media?.url || '').toLowerCase();
  const ext = url.split('?')[0].split('#')[0].split('.').pop() || '';

  if (mime.startsWith('image/') || ['jpg','jpeg','png','webp','gif','svg','avif'].includes(ext)) return 'image';
  if (mime.startsWith('video/') || ['mp4','webm','ogg','mov','mkv'].includes(ext)) return 'video';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if ([
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc','docx'
  ].includes(mime) || ['doc','docx'].includes(ext)) return 'word';
  if ([
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls','xlsx'
  ].includes(mime) || ['xls','xlsx'].includes(ext)) return 'excel';

  // Pas de média : si l’article a du contenu texte => fallback “article”
  if (!media?.url && typeof file?.content === 'string' && file.content.trim()) return 'article';
  return 'unknown';
};

export default function FilePreview({ file, activeTab }) {
  // Onglets “métier”
  if (activeTab === 'Métadonnées') {
    // Tu peux adapter la prop selon l’API de ton composant
    return <MetaPreview item={file} />;
  }
  if (activeTab === 'Versions') {
    return <VersionPreview history={file?.history || []} />;
  }
  if (activeTab === 'Statistiques') {
    return (
      <StatistiquePreview
        stats={{
          views: file?.view_count ?? 0,
          shares: file?.share_count ?? 0,
          comments: file?.comment_count ?? 0,
          rating: file?.rating_average ? Number(file.rating_average) : null,
          rating_count: file?.rating_count ?? 0,
        }}
      />
    );
  }

  // Onglet par défaut: Visualisation
  const media = useMemo(() => pickPrimaryMedia(file), [file]);
  const kind  = useMemo(() => guessKind(media, file), [media, file]);

  switch (kind) {
    case 'image':
      return <ImagePreview src={media.url} alt={file?.featured_image_alt || file?.title} />;
    case 'video':
      return <VideoPreview src={media.url} mime={media.mime} />;
    case 'pdf':
      return <PdfFilePreview src={media.url} />;
    case 'word':
      return <WordPreview src={media.url} />;
    case 'excel':
      return <ExcelPreview src={media.url} />;
    case 'article':
      return (
        <article className="prose max-w-none">
          <h2 className="text-xl font-semibold mb-2">{file?.title}</h2>
          <div className="whitespace-pre-line text-gray-800 leading-relaxed">
            {file?.content}
          </div>
        </article>
      );
    default:
      return (
        <div className="text-sm text-gray-500">
          Aucun aperçu disponible pour ce type de fichier.
        </div>
      );
  }
}
