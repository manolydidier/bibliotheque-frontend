import { useEffect } from "react";

function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaProperty(property, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel, href) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function SeoHead({
  title,
  description,
  keywords,
  canonical,
  robots = "index,follow",
  image, // URL image pour OG/Twitter
  type = "article",
  locale = "fr_FR",
  siteName = "Mon Site",
  jsonLd, // objet JSON-LD facultatif
}) {
  useEffect(() => {
    if (title) document.title = title;

    setMeta("description", description);
    setMeta("keywords", keywords);
    setMeta("robots", robots);
    setLink("canonical", canonical);

    // Open Graph
    setMetaProperty("og:title", title);
    setMetaProperty("og:description", description);
    setMetaProperty("og:type", type);
    setMetaProperty("og:site_name", siteName);
    setMetaProperty("og:locale", locale);
    setMetaProperty("og:image", image);
    if (canonical) setMetaProperty("og:url", canonical);

    // Twitter
    setMeta("twitter:card", image ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (image) setMeta("twitter:image", image);

    // JSON-LD (remplace le script à chaque navigation)
    const id = "__seo_jsonld__";
    const old = document.getElementById(id);
    if (old) old.remove();
    if (jsonLd) {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.id = id;
      s.text = JSON.stringify(jsonLd);
      document.head.appendChild(s);
    }
  }, [title, description, keywords, canonical, robots, image, type, locale, siteName, jsonLd]);

  return null;
}
