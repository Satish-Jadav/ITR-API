import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZeroTax — Direct-to-CBDT ITR Filing & AI Tax Optimizer',
  description: 'File AY 2026-27 (FY 2025-26) Income Tax Return directly to CBDT portal. Real-time AIS/26AS reconciliation, 115BAC New vs Old Regime showdown, and Chrome Gemini AI assistant.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0B0F17',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-background text-slate-100 antialiased selection:bg-emerald-500 selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
