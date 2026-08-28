import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    // @react-pdf/renderer's PDF generation (src/lib/contracts/pdf.tsx) pulls
    // in pdfkit's standard-font files via a dynamic require Next's file
    // tracer can't see statically, so they're dropped from the serverless
    // bundle unless listed explicitly — causing a MODULE_NOT_FOUND for
    // pdfkit/js/standard-fonts/*.cjs at runtime on Vercel.
    outputFileTracingIncludes: {
      '/api/contracts/[token]/sign': ['./node_modules/pdfkit/js/standard-fonts/**/*'],
    },
  },
};

export default withNextIntl(nextConfig);
