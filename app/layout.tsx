import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
      <head>
        {/* Render-blocking inline script — runs before first paint on every SSR
            response. Sets the `dark` class so there is no flash of wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
