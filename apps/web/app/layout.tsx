import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Docsy — turn your docs into a support agent',
  description:
    'Point Docsy at your documentation and get a chatbot that answers with citations — in your app and as a widget on your site.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
