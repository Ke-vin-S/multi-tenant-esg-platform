import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { ThemeSync } from '@/components/layout/ThemeSync';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'ESG Aggregation Platform',
  description: 'Multi-tenant ESG data collection and reporting',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head />
      <body>
        {/* beforeInteractive runs before React hydrates — guaranteed by Next.js
            on both SSR and streaming, works on Vercel edge and Node runtimes. */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
