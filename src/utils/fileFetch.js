// src/utils/fileFetch.js
export const PROXY_PATH =
  import.meta.env.VITE_FILE_PROXY || "/api/file-proxy?url=";

export async function fetchArrayBufferWithFallback(url) {
  // 1) tentative directe
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  } catch (e) {
    // 2) via le proxy Laravel
    const proxied = `${PROXY_PATH}${encodeURIComponent(url)}`;
    const res2 = await fetch(proxied);
    if (!res2.ok) throw new Error(`Proxy HTTP ${res2.status}`);
    return await res2.arrayBuffer();
  }
}
