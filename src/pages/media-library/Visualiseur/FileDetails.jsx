import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileImage } from '@fortawesome/free-solid-svg-icons';
import Comments from './Comments';
import { formatDate } from '../shared/utils/format';

const getContrastingTextColor = (hexColor) => {
  if (!hexColor || hexColor.length < 4) return '#1F2937';
  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#1F2937' : '#FFFFFF';
};

export default function FileDetails({ file }) {
  const tags = file?.tags || [];
  const categories = file?.categories || [];
  const initialComments = file?.approvedComments || file?.approved_comments || file?.comments || [];

  return (
    <div>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Détails</h2>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-md flex items-center justify-center bg-yellow-100 text-yellow-600">
              <FontAwesomeIcon icon={faFileImage} className="text-xl" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-800">{file.title}</h3>
              <p className="text-sm text-gray-500">Article • {file.word_count || 0} mots</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-500">Publié</p>
              <p className="font-medium">{file.published_at ? formatDate(file.published_at) : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Dernière maj</p>
              <p className="font-medium">{file.updated_at ? formatDate(file.updated_at) : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Lecture</p>
              <p className="font-medium">{file.reading_time ? `${file.reading_time} min` : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Vues</p>
              <p className="font-medium">{file.view_count ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Note</p>
              <p className="font-medium">
                {file.rating_average ? Number(file.rating_average).toFixed(2) : '—'} ({file.rating_count ?? 0})
              </p>
            </div>
            <div>
              <p className="text-gray-500">Statut</p>
              <p className="font-medium">{file.status} / {file.visibility}</p>
            </div>
          </div>

          {!!categories.length && (
            <div className="mb-4">
              <p className="text-gray-500 mb-2">Catégories</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span key={c.id}
                        className={`px-2 py-1 rounded-md text-xs border ${c?.pivot?.is_primary ? 'border-blue-400' : 'border-gray-200'}`}
                        style={{ backgroundColor: c.color || '#F3F4F6', color: getContrastingTextColor(c.color || '#F3F4F6') }}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-gray-500 mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {(tags || []).map(tag => (
                <span key={tag.id}
                      className="px-2 py-1 rounded-md text-xs"
                      style={{ backgroundColor: tag.color || '#E5E7EB', color: getContrastingTextColor(tag.color || '#E5E7EB') }}>
                  {tag.name}
                </span>
              ))}
              {(!tags || tags.length === 0) && <span className="text-xs text-gray-500">Aucun tag</span>}
            </div>
          </div>
        </div>

        <Comments initialComments={initialComments} onSubmit={(v) => console.log('comment:', v)} />
      </div>
    </div>
  );
}
