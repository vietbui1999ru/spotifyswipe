'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { CreatePostInput } from '@/types/post';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeftIcon, Music, ImageIcon, LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function CreatePostPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreatePostInput>({
    title: '',
    content: '',
    image_url: '',
    music_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert([{
        title: formData.title.trim(),
        content: formData.content?.trim() || null,
        image_url: formData.image_url?.trim() || null,
        music_url: formData.music_url?.trim() || null,
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating post:', insertError);
      setError('Failed to create post. Please try again.');
      setLoading(false);
      return;
    }

    router.push(`/post/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Feed
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Share Music
          </CardTitle>
          <CardDescription>
            Share a song, album, or playlist with the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Check out this amazing song!"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Description (optional)</Label>
              <Textarea
                id="content"
                placeholder="Tell us why you love this music..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="music_url" className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Music URL (optional)
              </Label>
              <Input
                id="music_url"
                type="url"
                placeholder="https://open.spotify.com/track/..."
                value={formData.music_url}
                onChange={(e) => setFormData({ ...formData, music_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Link to Spotify, YouTube, SoundCloud, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Cover Image URL (optional)
              </Label>
              <Input
                id="image_url"
                type="url"
                placeholder="https://example.com/album-cover.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Share Music'}
              </Button>
              <Link href="/">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
