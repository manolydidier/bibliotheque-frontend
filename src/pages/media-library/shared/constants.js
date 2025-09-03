// ------------------------------
// File: media-library/shared/constants.js
// ------------------------------
export const TYPES = ["image", "video", "audio", "pdf", "word", "excel", "archive", "other"];
export const TAGS = ["Rapport", "Travail", "Personnel", "Urgent", "Terrain", "Budget", "RH"];
export const CATS = ["Projet", "Études", "Mission", "Archives", "Formation", "Support"];

// ------------------------------
// File: media-library/shared/hooks/useDebouncedValue.js
// ------------------------------
import { useEffect, useState } from "react";
export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}