'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { getPKCEVerifier, clearPKCEVerifier } from '@/utils/pkce';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Extract authorization code and state from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
          setError('No authorization code received from Spotify. Please try logging in again.');
          setIsLoading(false);
          return;
        }

        // Get the PKCE verifier from sessionStorage
        const verifier = getPKCEVerifier();
        if (!verifier) {
          setError('PKCE verifier not found. Your session may have expired. Please try logging in again.');
          setIsLoading(false);
          return;
        }

        // Exchange authorization code for access token
        const response = await apiClient.post('/api/auth/callback', {
          code,
          state,
          codeVerifier: verifier,
        });

        if (response.status === 200) {
          // Clear the PKCE verifier from sessionStorage
          clearPKCEVerifier();

          // Fetch user data
          await refreshUser();

          // Redirect to dashboard
          router.push('/dashboard/swipe');
        } else {
          setError('Unexpected response from authentication server. Please try again.');
          setIsLoading(false);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'An error occurred during authentication. Please try logging in again.';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router, refreshUser]);

  const handleRetry = () => {
    clearPKCEVerifier();
    router.push('/auth/login');
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md p-8 rounded-lg bg-spotify-gray shadow-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green"></div>
          <p className="mt-4 text-spotify-light">Authenticating with Spotify...</p>
          <p className="mt-2 text-gray-400 text-sm">Please wait while we complete your login.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md p-8 rounded-lg bg-spotify-gray shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Authentication Error</h1>
          <p className="text-red-200">{error}</p>
        </div>

        <button
          onClick={handleRetry}
          className="w-full py-3 px-4 rounded-full font-bold text-white bg-spotify-green hover:bg-green-600 transition-colors duration-200"
        >
          Back to Login
        </button>

        <p className="text-center text-gray-400 text-sm mt-6">
          If you continue to experience issues, please clear your browser cache and try again.
        </p>
      </div>
    );
  }

  // Success state - should not reach here as we redirect on success
  return (
    <div className="w-full max-w-md p-8 rounded-lg bg-spotify-gray shadow-lg">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green"></div>
        <p className="mt-4 text-spotify-light">Authentication successful, redirecting...</p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-spotify-dark flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-lg bg-spotify-gray shadow-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green"></div>
          <p className="mt-4 text-spotify-light">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <div className="min-h-screen bg-spotify-dark flex items-center justify-center">
      <Suspense fallback={<LoadingFallback />}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
