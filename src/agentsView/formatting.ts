export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function toTitleCaseWords(input: string): string {
  const normalized = input
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!normalized) return normalized;

  const words = normalized.split(' ');
  const mapped = words.map((word) => {
    const w = word.toLowerCase();
    if (w === 'tv') return 'TV';
    if (w === 'ai') return 'AI';
    if (w === 'opsec') return 'OPSEC';
    if (w === 'df') return 'DF';
    if (w === 'r&d') return 'R&D';
    if (w === 'sci' || w === 'sci-fi' || w === 'scifi') return 'Sci-Fi';
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  // If we normalized sci-fi into two tokens ("Sci" "Fi"), stitch it back.
  return mapped.join(' ').replace(/\bSci Fi\b/g, 'Sci-Fi');
}

export function displayLanguageCode(codeRaw: string): string {
  const code = codeRaw.trim().toLowerCase();
  if (!code) return codeRaw;
  // Prefer Intl when available; fall back to code.
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'language' });
    const name = dn.of(code);
    return name ? toTitleCaseWords(name) : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}
