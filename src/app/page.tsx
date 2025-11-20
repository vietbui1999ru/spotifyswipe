'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Post, SortOption } from '@/types/post';
import { mockPosts } from '@/data/mockPosts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchIcon, ArrowUpIcon, ClockIcon, PlusIcon, Music } from 'lucide-react';

const USE_MOCK_DATA = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [sortBy]);

  const fetchPosts = async () => {
    setLoading(true);

    if (USE_MOCK_DATA) {
      // Use mock data when Supabase is not configured
      let sortedPosts = [...mockPosts];
      if (sortBy === 'upvotes') {
        sortedPosts.sort((a, b) => b.upvotes - a.upvotes);
      } else {
        sortedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      setPosts(sortedPosts);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order(sortBy, { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Music Feed</h1>
        <Link href="/create">
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            Share Music
          </Button>
        </Link>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                Newest First
              </div>
            </SelectItem>
            <SelectItem value="upvotes">
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="w-4 h-4" />
                Most Upvotes
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts Feed */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No posts found matching your search.' : 'No posts yet. Be the first to share music!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ArrowUpIcon className="w-4 h-4" />
                      {post.upvotes}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(post.created_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
