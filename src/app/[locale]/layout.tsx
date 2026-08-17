import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Poppins, Montserrat } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

const poppins = Poppins({
  weight: ['800', '900'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

const montserrat = Montserrat({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Dopa Studio',
  description: 'Bilingual photography & videography studio serving the Washington DC / Maryland / Virginia area.',
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} dir="ltr" className={`${poppins.variable} ${montserrat.variable}`}>
      <body className="bg-parchment font-body text-ink antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
