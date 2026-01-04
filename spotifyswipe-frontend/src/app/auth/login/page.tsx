'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { generateCodeVerifier, generateCodeChallenge, storePKCEVerifier } from '@/utils/pkce';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isHandlingCallback, setIsHandlingCallback] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard/swipe');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSpotifyLogin = async () => {
    try {
      setError(null);

      // Generate PKCE code verifier and store it
      const verifier = generateCodeVerifier();
      storePKCEVerifier(verifier);

      // Generate code_challenge from verifier
      const challenge = await generateCodeChallenge(verifier);

      // Pass code_challenge as query parameter
      const response = await apiClient.get('/api/auth/login', {
        params: { code_challenge: challenge }
      });
      if (response.status === 200 && response.data.data?.url) {
        window.location.href = response.data.data.url;
      } else {
        setError('Unexpected response from authentication server. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate login';
      setError(errorMessage);
    }
  };

  if (isLoading || isHandlingCallback) {
    return (
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green"></div>
        <p className="mt-4 text-spotify-light">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 rounded-lg bg-spotify-gray shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-spotify-light mb-2">Swipify</h1>
        <p className="text-gray-400">Discover new music on Spotify</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
          <p className="text-red-100">{error}</p>
        </div>
      )}

      <button
        onClick={handleSpotifyLogin}
        disabled={isHandlingCallback}
        className="w-full py-3 px-4 rounded-full font-bold text-white bg-spotify-green hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {isHandlingCallback ? 'Logging in...' : 'Login with Spotify'}
      </button>

      <p className="text-center text-gray-400 text-sm mt-6">
        By logging in, you agree to our terms of service
      </p>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="w-full max-w-md p-8 rounded-lg bg-spotify-gray shadow-lg">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green"></div>
        <p className="mt-4 text-spotify-light">Loading...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-spotify-dark flex items-center justify-center p-4">
      <Suspense fallback={<LoginLoading />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
