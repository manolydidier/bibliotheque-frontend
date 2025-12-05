// src/media-library/shared/filters.js
// Centralise la forme par défaut des filtres + la normalisation

/** Forme par défaut des filtres (référence commune) */
export const DEFAULT_FILTERS = {
  categories: [],
  tags: [],
  authors: [],
  featuredOnly: false,
  stickyOnly: false,
  unreadOnly: false, // côté client uniquement
  dateFrom: "",
  dateTo: "",
  ratingMin: 0,
  ratingMax: 5,
};

/** Force n’importe quelle valeur en filtre “propre” et jamais undefined */
export function toSafeFilters(maybe) {
  const f = maybe && typeof maybe === "object" ? maybe : {};

  return {
    categories: Array.isArray(f.categories) ? f.categories.map(String) : [],
    tags: Array.isArray(f.tags) ? f.tags.map(String) : [],
    authors: Array.isArray(f.authors) ? f.authors.map(String) : [],
    featuredOnly: !!f.featuredOnly,
    stickyOnly: !!f.stickyOnly,
    unreadOnly: !!f.unreadOnly,
    dateFrom: typeof f.dateFrom === "string" ? f.dateFrom : "",
    dateTo: typeof f.dateTo === "string" ? f.dateTo : "",
    ratingMin: Number.isFinite(f.ratingMin) ? Number(f.ratingMin) : 0,
    ratingMax: Number.isFinite(f.ratingMax) ? Number(f.ratingMax) : 5,
  };
}

/** Égalité superficielle entre deux objets de filtres */
export function filtersShallowEqual(a = {}, b = {}) {
  const arrEqual = (x = [], y = []) => {
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) {
      if (String(x[i]) !== String(y[i])) return false;
    }
    return true;
  };

  return (
    arrEqual(a.categories, b.categories) &&
    arrEqual(a.tags, b.tags) &&
    arrEqual(a.authors, b.authors) &&
    Boolean(a.featuredOnly) === Boolean(b.featuredOnly) &&
    Boolean(a.stickyOnly) === Boolean(b.stickyOnly) &&
    Boolean(a.unreadOnly) === Boolean(b.unreadOnly) &&
    String(a.dateFrom || "") === String(b.dateFrom || "") &&
    String(a.dateTo || "") === String(b.dateTo || "") &&
    Number(a.ratingMin || 0) === Number(b.ratingMin || 0) &&
    Number(a.ratingMax || 5) === Number(b.ratingMax || 5)
  );
}
