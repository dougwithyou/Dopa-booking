// Shared plain-HTML shell for transactional emails. Inline styles only —
// no external stylesheets, no Tailwind — most email clients strip both.
// Loosely echoes Dopa Studio's brand palette without going for
// pixel-perfect design.

const COLORS = {
  clay: '#9c4a2c',
  ink: '#221c17',
  parchment: '#f3ece0',
  gold: '#b8873b',
};

export function renderHtmlEmail(opts: {
  preheading?: string;
  heading: string;
  bodyHtml: string; // pre-built inner HTML (paragraphs, details block, etc.)
  footerHtml?: string;
}): string {
  const { preheading, heading, bodyHtml, footerHtml } = opts;
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:${COLORS.parchment};font-family:Georgia,'Times New Roman',serif;color:${COLORS.ink};">
    ${preheading ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheading)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.parchment};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4dbc9;">
            <tr>
              <td style="background-color:${COLORS.clay};padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;letter-spacing:0.04em;font-weight:bold;">Dopa Studio</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:22px;color:${COLORS.ink};">${escapeHtml(heading)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #e4dbc9;">
                <p style="margin:0;font-size:12px;color:#7a7168;">${footerHtml ?? 'Dopa Studio · DC / MD / VA'}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function detailsBlockHtml(rows: Array<[label: string, value: string]>): string {
  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#7a7168;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0 6px 12px;font-size:14px;color:${COLORS.ink};font-weight:bold;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.parchment};border-left:3px solid ${COLORS.gold};border-radius:4px;padding:12px 16px;margin:16px 0;">${rowsHtml}</table>`;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
