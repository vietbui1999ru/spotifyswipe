import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Swipify - Spotify Music Discovery',
  description: 'Discover new music with Swipify',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-spotify-dark text-spotify-light">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
