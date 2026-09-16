import type { Metadata } from 'next';
import './globals.css';
import { THEME_SCRIPT } from '@/components/theme';

export const metadata: Metadata = {
  title: 'Docsy — turn your docs into a support agent',
  description:
    'Point Docsy at your documentation and get a chatbot that answers with citations — in your app and as a widget on your site.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Before the first paint, so a stored dark theme never flashes white. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
