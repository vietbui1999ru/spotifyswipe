'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-spotify-dark">
        <Header />
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h1 className="text-5xl font-bold text-spotify-light mb-4">Welcome to Swipify</h1>
              <p className="text-gray-400 text-lg">
                Discover new music with a fun swiping interface
              </p>
            </div>

            {user && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-spotify-gray rounded-lg p-8 border border-gray-700">
                  <div className="flex items-start gap-4">
                    {user.avatarUrl && (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName}
                        className="w-20 h-20 rounded-full"
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-spotify-light mb-2">
                        {user.displayName}
                      </h2>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/dashboard/swipe"
                  className="bg-spotify-green text-white rounded-lg p-8 font-bold text-center hover:bg-green-600 transition-colors flex items-center justify-center"
                >
                  <div>
                    <div className="text-4xl mb-2">🎵</div>
                    <div>Start Discovering</div>
                  </div>
                </Link>
              </div>
            )}

            <div className="mt-16 bg-spotify-gray rounded-lg p-8 border border-gray-700">
              <h3 className="text-2xl font-bold text-spotify-light mb-4">How it Works</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-spotify-green font-bold">1.</span>
                  <span>Browse music recommendations from Spotify</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-spotify-green font-bold">2.</span>
                  <span>Swipe right to like songs, left to skip them</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-spotify-green font-bold">3.</span>
                  <span>Create custom playlists with your favorite discoveries</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
