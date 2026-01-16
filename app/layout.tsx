import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/hooks/useAuth';

export const metadata: Metadata = {
  title: {
    default: 'Xuunu - Track. Optimize. Perform.',
    template: '%s | Xuunu',
  },
  description:
    'Fitness tracking platform with comprehensive health context and personalized biosignature analysis.',
  metadataBase: new URL('https://xuunu.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://xuunu.com',
    siteName: 'Xuunu',
    title: 'Xuunu - Track. Optimize. Perform.',
    description: 'Fitness tracking with comprehensive health context',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
