'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard/swipe',
    label: 'Discover Music',
    icon: '🔄',
  },
  {
    href: '/dashboard/discover',
    label: 'Browse Playlists',
    icon: '🎸',
  },
  {
    href: '/dashboard/spotify-playlists',
    label: 'Spotify Playlists',
    icon: '🎵',
  },
  {
    href: '/dashboard/my-playlists',
    label: 'My Playlists',
    icon: '📋',
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-spotify-dark border-r border-gray-700 w-64 min-h-screen">
      <div className="p-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-spotify-green text-spotify-dark font-semibold'
                      : 'text-gray-300 hover:bg-spotify-gray hover:text-spotify-light'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
