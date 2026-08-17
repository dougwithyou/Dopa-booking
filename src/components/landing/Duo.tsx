import type { ReactNode } from 'react';

/**
 * Admin copy convention for the signature "duo" split solid/outline word
 * treatment: wrap the emphasized word(s) in double asterisks, e.g.
 *   "La luz de **otoño** no espera."
 * Renders as plain text if no `**...**` markers are present, so existing
 * copy never breaks. Used for any bilingual DB heading (`headline_*`,
 * `gallery_heading_*`, `closer_heading_*`) as well as the fixed chrome
 * heading strings in the messages files, which follow the same convention.
 */
export function renderDuo(text: string): ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((part) => part.length > 0);
  return parts.map((part, i) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    if (match) {
      return (
        <span key={i} className="duo" data-text={match[1]}>
          {match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
