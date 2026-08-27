// A deliberately tiny markdown-lite for contract bodies — the admin editor
// is a plain textarea, not a rich-text widget, so contracts are authored in
// a handful of forgiving conventions instead of real HTML:
//   # Heading            -> <h2>
//   ## Subheading        -> <h3>
//   - list item          -> <li> (consecutive "- " lines group into a <ul>)
//   blank line           -> paragraph break
//   **bold**             -> <strong>
// This is shared by the public web view (as HTML) and the PDF renderer (as
// react-pdf nodes) so both stay in sync with one parser.

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface InlineBoldSegment {
  text: string;
  bold: boolean;
}

/** Splits a line on **bold** markers. Input is assumed already HTML-escaped. */
function splitInlineBold(escapedLine: string): InlineBoldSegment[] {
  const parts = escapedLine.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== '');
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return { text: part.slice(2, -2), bold: true };
    }
    return { text: part, bold: false };
  });
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'p'; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'p', text: paragraphLines.join(' ') });
      paragraphLines = [];
    }
  }
  function flushList() {
    if (listItems.length > 0) {
      blocks.push({ type: 'ul', items: listItems });
      listItems = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h3', text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: line.slice(2).trim() });
      continue;
    }
    if (line.startsWith('- ')) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
      continue;
    }
    flushList();
    paragraphLines.push(line);
  }
  flushParagraph();
  flushList();

  return blocks;
}

/** Renders contract markdown-lite to safe HTML for the public web view. */
export function contractMarkdownToHtml(source: string): string {
  const blocks = parseBlocks(source);

  function inlineHtml(text: string): string {
    return splitInlineBold(escapeHtml(text))
      .map((seg) => (seg.bold ? `<strong>${seg.text}</strong>` : seg.text))
      .join('');
  }

  return blocks
    .map((b) => {
      if (b.type === 'h2') return `<h2>${inlineHtml(b.text)}</h2>`;
      if (b.type === 'h3') return `<h3>${inlineHtml(b.text)}</h3>`;
      if (b.type === 'ul') return `<ul>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join('')}</ul>`;
      return `<p>${inlineHtml(b.text)}</p>`;
    })
    .join('\n');
}

export type PdfBlock = Block;

/** Parsed blocks for the PDF renderer to walk directly (react-pdf has no
 * HTML support, so it consumes this structured form instead of markup). */
export function contractMarkdownToBlocks(source: string): PdfBlock[] {
  return parseBlocks(source);
}

export function splitBoldForPdf(text: string): InlineBoldSegment[] {
  // PDF text isn't HTML-escaped (react-pdf takes raw strings), so split the
  // raw line directly rather than routing through escapeHtml.
  return splitInlineBold(text);
}
