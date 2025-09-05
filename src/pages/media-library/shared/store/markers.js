const MARKERS_KEY = 'article-markers';

export const getMarkers = () => {
  try {
    return JSON.parse(localStorage.getItem(MARKERS_KEY)) || { favs: [], read: [] };
  } catch {
    return { favs: [], read: [] };
  }
};

export const setMarkers = (markers) => {
  try {
    localStorage.setItem(MARKERS_KEY, JSON.stringify(markers));
  } catch (error) {
    console.error('Error saving markers', error);
  }
};

export const isFav = (id) => {
  const markers = getMarkers();
  return markers.favs.includes(id);
};

export const toggleFav = (id) => {
  const markers = getMarkers();
  if (markers.favs.includes(id)) {
    markers.favs = markers.favs.filter(item => item !== id);
  } else {
    markers.favs.push(id);
  }
  setMarkers(markers);
};

export const isRead = (id) => {
  const markers = getMarkers();
  return markers.read.includes(id);
};

export const markRead = (id) => {
  const markers = getMarkers();
  if (!markers.read.includes(id)) {
    markers.read.push(id);
    setMarkers(markers);
  }
};