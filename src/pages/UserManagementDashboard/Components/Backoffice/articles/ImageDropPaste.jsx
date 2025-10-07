// src/components/ImageDropPaste.jsx
import React, { useCallback, useEffect, useRef } from "react";
import { FiUpload, FiX } from "react-icons/fi";

/**
 * Zone d'upload universelle (clic, drag&drop, collage Ctrl/Cmd+V)
 *
 * Props:
 * - id: string (id HTML de l'input)
 * - label: string (titre affiché)
 * - accept: string (ex: "image/png, image/jpeg, image/webp, image/gif")
 * - file: File|null (fichier sélectionné)
 * - previewUrl: string (URL locale objectURL si file, sinon '')
 * - existingUrl: string (URL venant du backend si édition)
 * - alt: string (texte alternatif)
 * - onPickFile: (file: File|null) => void
 * - onChangeAlt?: (alt: string) => void
 * - showAlt?: boolean (afficher champ Alt sous la dropzone)
 * - inputClass?: string (classes tailwind pour l’input alt)
 * - errorNode?: ReactNode (afficher erreurs sous la zone)
 * - helperNode?: ReactNode (texte aide sous alt)
 */
export default function ImageDropPaste({
  id = "file-input",
  label = "Déposer une image ou cliquer",
  accept = "image/png, image/jpeg, image/webp, image/gif",
  file,
  previewUrl,
  existingUrl = "",
  alt = "",
  onPickFile,
  onChangeAlt,
  showAlt = false,
  inputClass = "",
  errorNode = null,
  helperNode = null,
}) {
  const inputRef = useRef(null);
  const zoneRef = useRef(null);

  const handleFiles = useCallback(
    (files) => {
      if (!files || !files.length) return;
      const f = Array.from(files).find((x) => x && x.type?.startsWith("image/"));
      if (f) onPickFile?.(f);
    },
    [onPickFile]
  );

  const onInputChange = (e) => handleFiles(e.target.files);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer?.files);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Coller (Ctrl/Cmd+V) — quand la zone a le focus
  const onPaste = (e) => {
    if (!zoneRef.current) return;
    if (!zoneRef.current.contains(document.activeElement)) return;
    const items = e.clipboardData?.items || [];
    for (const it of items) {
      if (it.type?.startsWith("image/")) {
        const blob = it.getAsFile();
        if (blob) {
          const f = new File([blob], `pasted-${Date.now()}.${guessExt(it.type)}`, { type: it.type });
          onPickFile?.(f);
          e.preventDefault();
          e.stopPropagation();
          break;
        }
      }
    }
  };

  const guessExt = (mime) => {
    if (mime === "image/png") return "png";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    return "img";
  };

  useEffect(() => {
    const z = zoneRef.current;
    if (!z) return;
    z.addEventListener("paste", onPaste);
    return () => z.removeEventListener("paste", onPaste);
    // eslint-disable-next-line
  }, [zoneRef.current, onPaste]);

  const displayUrl = previewUrl || existingUrl || "";

  return (
    <div className="space-y-4  min-w-0">
      <div
        ref={zoneRef}
        className="relative group"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <input
          ref={inputRef}
          type="file"
          id={id}
          accept={accept}
          onChange={onInputChange}
          className="hidden"
        />
        <label
          htmlFor={id}
          tabIndex={0}
          className="flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed border-slate-300 rounded-3xl
                    bg-gradient-to-br from-slate-50 to-white cursor-pointer
                    hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200 outline-none "
          title="Cliquer, glisser-déposer ou coller une image"
        >
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl">
            <FiUpload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-blue-600">{label}</p>
            <p className="text-sm text-slate-500 mt-2">
              PNG, JPG, WebP, GIF (2 Mo max). Vous pouvez aussi <b>coller</b> une image (Ctrl/Cmd+V).
            </p>
          </div>
        </label>

        {(file || existingUrl) && (
          <button
            type="button"
            onClick={() => onPickFile?.(null)}
            className="absolute top-3 right-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                      bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700"
            title="Retirer l'image"
          >
            <FiX className="w-4 h-4" />
            Retirer
          </button>
        )}
      </div>

      {/* Aperçu */}
      {displayUrl ? (
        <div className="w-full aspect-[1200/630] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
          <img
            src={displayUrl}
            alt={alt || "Aperçu"}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <p className="text-sm text-slate-500">Aucune image sélectionnée pour le moment.</p>
      )}

      {/* Champ Alt optionnel */}
      {showAlt && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Texte alternatif (Alt)</label>
          <input
            className={inputClass}
            value={alt}
            onChange={(e) => onChangeAlt?.(e.target.value)}
            placeholder="Description brève de l'image…"
          />
          {helperNode}
        </div>
      )}

      {/* Erreurs backend sous la zone */}
      {errorNode}
    </div>
  );
}
