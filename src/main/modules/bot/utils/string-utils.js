function normalizeText(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          // substitution
          matrix[i][j - 1] + 1,
          // insertion
          matrix[i - 1][j] + 1
          // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
function findBestMatch(text, options) {
  if (options.length === 0) return text;
  const textLower = text.toLowerCase().trim();
  const exact = options.find((o) => o.toLowerCase() === textLower);
  if (exact) return exact;
  const contains = options.find(
    (o) => textLower.includes(o.toLowerCase()) || o.toLowerCase().includes(textLower)
  );
  if (contains) return contains;
  let bestOption = options[0];
  let bestDistance = Infinity;
  for (const option of options) {
    const distance = levenshteinDistance(textLower, option.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOption = option;
    }
  }
  return bestOption;
}
function stripMarkdownCodeBlock(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return text;
  const lines = trimmed.split("\n");
  let startIdx = 0;
  let endIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("```")) {
      if (startIdx === 0) {
        startIdx = i + 1;
      } else {
        endIdx = i;
        break;
      }
    }
  }
  return lines.slice(startIdx, endIdx).join("\n");
}
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function isUrl(text) {
  return text.startsWith("http://") || text.startsWith("https://") || text.includes(".com") || text.includes(".io") || text.includes(".org") || text.includes(".net");
}
function extractNumber(text) {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}
export {
  capitalize,
  extractNumber,
  findBestMatch,
  isUrl,
  levenshteinDistance,
  normalizeText,
  stripMarkdownCodeBlock,
  truncate
};
//# sourceMappingURL=string-utils.js.map
