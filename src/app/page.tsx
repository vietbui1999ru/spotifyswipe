'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Heart, Users, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (isAuthenticated && !loading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
        <p className="mt-4 text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Discover Music
              <span className="block text-green-600">Your Way</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Swipe through songs, create perfect playlists, and share your musical taste with the world
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => login()}
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white text-lg px-8 py-6 rounded-full"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Get Started with Spotify
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 hover:border-green-500 transition-all duration-200 hover:shadow-lg">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Swipe to Discover</h3>
              <p className="text-sm text-muted-foreground">
                Tinder-style interface to discover music that matches your taste
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-blue-500 transition-all duration-200 hover:shadow-lg">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg">Build Playlists</h3>
              <p className="text-sm text-muted-foreground">
                Create and curate the perfect playlists from your liked songs
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-purple-500 transition-all duration-200 hover:shadow-lg">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg">Share & Connect</h3>
              <p className="text-sm text-muted-foreground">
                Share playlists and discover what others are listening to
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-orange-500 transition-all duration-200 hover:shadow-lg">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg">Track Your Taste</h3>
              <p className="text-sm text-muted-foreground">
                See your listening stats and how your taste evolves
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mt-24 space-y-8">
          <h2 className="text-3xl font-bold text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-lg">Connect Spotify</h3>
              <p className="text-sm text-muted-foreground">
                Sign in with your Spotify account to get personalized recommendations
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-lg">Swipe & Discover</h3>
              <p className="text-sm text-muted-foreground">
                Swipe right on songs you love, left on songs you don't
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-lg">Create & Share</h3>
              <p className="text-sm text-muted-foreground">
                Build playlists from liked songs and share them with friends
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto mt-24 text-center space-y-6 p-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl text-white">
          <h2 className="text-3xl font-bold">Ready to Start Swiping?</h2>
          <p className="text-lg opacity-90">
            Join thousands of music lovers discovering their next favorite song
          </p>
          <Button
            onClick={() => login()}
            size="lg"
            variant="secondary"
            className="bg-white text-green-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-full"
          >
            Sign Up Now - It's Free
          </Button>
        </div>
      </div>
    </div>
  );
}
