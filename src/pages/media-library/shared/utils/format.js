
// ------------------------------
// File: media-library/shared/utils/format.js
// ------------------------------
export const cls = (...xs) => xs.filter(Boolean).join(" ");
export const KB = 1024;
export const MB = 1024 * KB;
export const GB = 1024 * MB;
export const formatBytes = (n = 0) => {
  if (n >= GB) return (n / GB).toFixed(2) + " GB";
  if (n >= MB) return (n / MB).toFixed(2) + " MB";
  if (n >= KB) return (n / KB).toFixed(1) + " KB";
  return n + " B";
};
export const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });