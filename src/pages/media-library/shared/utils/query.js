export const parseSearch = (query) => {
  if (!query) return { tokens: [], q: '' };
  
  const tokens = [];
  let q = query;
  
  // Extraction des tokens de type key:value
  const tokenRegex = /(\w+):([^\s"]+|"[^"]*")/g;
  let match;
  
  while ((match = tokenRegex.exec(query)) !== null) {
    tokens.push({
      k: match[1],
      v: match[2].replace(/^"|"$/g, ''),
      op: '='
    });
    q = q.replace(match[0], '');
  }
  
  return { tokens, q: q.trim() };
};

export const toBytes = (sizeString) => {
  if (!sizeString) return 0;
  
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024
  };
  
  const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*([a-z]*)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  return value * (units[unit] || 1);
};