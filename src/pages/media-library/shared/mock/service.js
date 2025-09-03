


// ------------------------------
// File: media-library/shared/mock/service.js
// ------------------------------
import { TYPES, TAGS, CATS } from "../constants";
import { parseSearch } from "../utils/query";

const uid = () => Math.random().toString(36).slice(2, 10);
const extFor = (t) => ({ image: "jpg", video: "mp4", audio: "mp3", pdf: "pdf", word: "docx", excel: "xlsx", archive: "zip", other: "txt" }[t]);
const KB = 1024; const MB = 1024 * KB;

export const MOCK_MEDIA = Array.from({ length: 157 }).map((_, i) => {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const createdAt = new Date(Date.now() - Math.random() * 330 * 24 * 3600 * 1000).toISOString();
  const updatedAt = new Date(Date.now() - Math.random() * 60 * 24 * 3600 * 1000).toISOString();
  const sizeBytes = Math.floor(Math.random() * 200 * MB + 30 * KB);
  const name = `${type === "image" ? "IMG" : type === "video" ? "VID" : type === "audio" ? "AUD" : type.toUpperCase()}_${i + 1}.${extFor(type)}`;
  const id = uid();
  return {
    id,
    name,
    type,
    ext: extFor(type),
    sizeBytes,
    category: CATS[Math.floor(Math.random() * CATS.length)],
    tags: Array.from(new Set(Array.from({ length: 1 + (Math.random() * 3) | 0 }).map(() => TAGS[Math.floor(Math.random() * TAGS.length)]))),
    owner: ["Alice", "Bob", "Chantal", "Dina", "Eric"][Math.floor(Math.random() * 5)],
    createdAt,
    updatedAt,
    description: "Résumé: Sed ut perspiciatis unde omnis iste natus error sit voluptatem.",
    thumbnail: Math.random() < 0.35 && type === "image" ? `https://picsum.photos/seed/${id}/600/400` : null,
    favorite: Math.random() < 0.2,
  };
});

export async function mockFetchMedia({ page, perPage, search, filters, sort, items }) {
  let rows = [...(items || MOCK_MEDIA)];
  if (search) {
    const { tokens, q } = parseSearch(search);
    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s) ||
          r.tags.some((t) => t.toLowerCase().includes(s)) ||
          r.owner.toLowerCase().includes(s)
      );
    }
    tokens.forEach((t) => {
      if (t.k === "type") rows = rows.filter((r) => r.type.toLowerCase() === t.v.toLowerCase());
      if (t.k === "tag") rows = rows.filter((r) => r.tags.map((x) => x.toLowerCase()).includes(t.v.toLowerCase()));
      if (t.k === "ext") rows = rows.filter((r) => r.ext.toLowerCase() === t.v.toLowerCase());
      if (t.k === "owner") rows = rows.filter((r) => r.owner.toLowerCase().includes(t.v.toLowerCase()));
      if (t.k === "before") rows = rows.filter((r) => new Date(r.createdAt) <= new Date(t.v));
      if (t.k === "after") rows = rows.filter((r) => new Date(r.createdAt) >= new Date(t.v));
      if (t.k === "size") rows = rows.filter((r) => (t.op === ">" ? r.sizeBytes > t.v : r.sizeBytes < t.v));
    });
  }

  if (filters?.types?.length) rows = rows.filter((r) => filters.types.includes(r.type));
  if (filters?.categories?.length) rows = rows.filter((r) => filters.categories.includes(r.category));
  if (filters?.tags?.length) rows = rows.filter((r) => r.tags.some((x) => filters.tags.includes(x)));
  if (filters?.owners?.length) rows = rows.filter((r) => filters.owners.includes(r.owner));
  if (filters?.favoritesOnly) rows = rows.filter((r) => !!r.favorite);
  if (filters?.dateFrom) rows = rows.filter((r) => new Date(r.createdAt) >= new Date(filters.dateFrom));
  if (filters?.dateTo) rows = rows.filter((r) => new Date(r.createdAt) <= new Date(filters.dateTo));
  if (filters?.sizeMin) rows = rows.filter((r) => r.sizeBytes >= filters.sizeMin);
  if (filters?.sizeMax) rows = rows.filter((r) => r.sizeBytes <= filters.sizeMax);

  if (sort?.length) {
    rows.sort((a, b) => {
      for (const { key, dir } of sort) {
        const va = a[key];
        const vb = b[key];
        if (va == null && vb == null) continue;
        if (va == null) return dir === "asc" ? -1 : 1;
        if (vb == null) return dir === "asc" ? 1 : -1;
        if (va < vb) return dir === "asc" ? -1 : 1;
        if (va > vb) return dir === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  const total = rows.length;
  const start = (page - 1) * perPage;
  const data = rows.slice(start, start + perPage);
  await new Promise((r) => setTimeout(r, 120));
  return { data, total };
}
