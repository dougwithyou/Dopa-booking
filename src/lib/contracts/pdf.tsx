import 'server-only';
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer, Font } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { contractMarkdownToBlocks, splitBoldForPdf, type PdfBlock } from './markdown';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, color: '#221c17' },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 16 },
  h2: { fontSize: 16, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  h3: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  p: { marginBottom: 8, lineHeight: 1.5 },
  li: { marginBottom: 4, marginLeft: 12, lineHeight: 1.5 },
  bold: { fontWeight: 700 },
  signatureSection: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
    borderTopStyle: 'solid',
  },
  signatureImage: { width: 200, height: 70, marginTop: 8, marginBottom: 8, objectFit: 'contain' },
  signerLine: { fontSize: 11, marginBottom: 2 },
  meta: { fontSize: 9, color: '#666666', marginTop: 4 },
});

function InlineText({ text, style }: { text: string; style: Style }) {
  const segments = splitBoldForPdf(text);
  return (
    <Text style={style}>
      {segments.map((seg, i) =>
        seg.bold ? (
          <Text key={i} style={styles.bold}>
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        )
      )}
    </Text>
  );
}

function BlockView({ block }: { block: PdfBlock }) {
  if (block.type === 'h2') return <InlineText text={block.text} style={styles.h2} />;
  if (block.type === 'h3') return <InlineText text={block.text} style={styles.h3} />;
  if (block.type === 'ul') {
    return (
      <View>
        {block.items.map((item, i) => (
          <InlineText key={i} text={`•  ${item}`} style={styles.li} />
        ))}
      </View>
    );
  }
  return <InlineText text={block.text} style={styles.p} />;
}

export interface ContractPdfInput {
  title: string;
  content: string;
  signerName: string;
  signerIdNumber?: string | null;
  signatureDataUrl: string; // data:image/png;base64,...
  signedAtIso: string;
  signerIp: string;
}

function ContractDocument({ input }: { input: ContractPdfInput }) {
  const blocks = contractMarkdownToBlocks(input.content);
  const signedDate = new Date(input.signedAtIso);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <InlineText text={input.title} style={styles.h1} />
        {blocks.map((b, i) => (
          <BlockView key={i} block={b} />
        ))}
        <View style={styles.signatureSection}>
          <InlineText text="Signature" style={styles.h3} />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop */}
          <Image src={input.signatureDataUrl} style={styles.signatureImage} />
          <Text style={styles.signerLine}>
            {input.signerName}
            {input.signerIdNumber ? ` — ID: ${input.signerIdNumber}` : ''}
          </Text>
          <Text style={styles.meta}>
            Signed {signedDate.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })} · IP {input.signerIp}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// react-pdf defaults to Helvetica if no font is registered; explicitly
// disabling hyphenation avoids odd mid-word breaks in narrow contract text.
Font.registerHyphenationCallback((word) => [word]);

export async function renderContractPdf(input: ContractPdfInput): Promise<Buffer> {
  return renderToBuffer(<ContractDocument input={input} />);
}
