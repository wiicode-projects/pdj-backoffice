/** Converts LegalDocument inline markers to HTML for Quill. */
export function inlineTextToHtml(text: string): string {
  if (!text.trim()) return '<p><br></p>';

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const withMarkers = escaped
    .replace(/\[strong:([^\]]+)\]/g, '<strong>$1</strong>')
    .replace(/\[link:([^|]+)\|([^\]]+)\]/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>')
    .replace(/\[mailto:([^|]+)\|([^\]]+)\]/g, '<a href="mailto:$1">$2</a>')
    .replace(/\[route:([^|]+)\|([^\]]+)\]/g, '<a href="$1">$2</a>')
    .replace(/\[tel:([^|]+)\|([^\]]+)\]/g, '<a href="tel:$1">$2</a>');

  const lines = withMarkers.split('\n');
  if (lines.length === 1) return `<p>${withMarkers}</p>`;
  return lines.map((line) => (line.trim() ? `<p>${line}</p>` : '<p><br></p>')).join('');
}

/** Converts Quill HTML output back to LegalDocument inline markers. */
export function htmlToInlineText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const parts: string[] = [];

  for (const child of Array.from(doc.body.childNodes)) {
    const line = nodeToInline(child).replace(/\n+$/, '');
    parts.push(line);
  }

  return parts.join('\n').trim();
}

function nodeToInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const children = Array.from(el.childNodes).map(nodeToInline).join('');

  switch (el.tagName.toLowerCase()) {
    case 'strong':
    case 'b':
      return `[strong:${children}]`;
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      if (href.startsWith('mailto:')) return `[mailto:${href.slice(7)}|${children}]`;
      if (href.startsWith('tel:')) return `[tel:${href.slice(4)}|${children}]`;
      if (href.startsWith('/') || href.startsWith('#')) return `[route:${href}|${children}]`;
      return `[link:${href}|${children}]`;
    }
    case 'p':
    case 'div':
      return `${children}\n`;
    case 'br':
      return '\n';
    case 'li':
      return children;
    default:
      return children;
  }
}
