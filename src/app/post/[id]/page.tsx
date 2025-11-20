'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Post, Comment, UpdatePostInput } from '@/types/post';
import { mockPosts, mockComments } from '@/data/mockPosts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  EditIcon,
  TrashIcon,
  SendIcon,
  Music,
  ImageIcon
} from 'lucide-react';

const USE_MOCK_DATA = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdatePostInput>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId]);

  const fetchPost = async () => {
    if (USE_MOCK_DATA) {
      const foundPost = mockPosts.find(p => p.id === postId);
      if (foundPost) {
        setPost(foundPost);
        setEditData({
          title: foundPost.title,
          content: foundPost.content || '',
          image_url: foundPost.image_url || '',
          music_url: foundPost.music_url || '',
        });
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
    } else {
      setPost(data);
      setEditData({
        title: data.title,
        content: data.content || '',
        image_url: data.image_url || '',
        music_url: data.music_url || '',
      });
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    if (USE_MOCK_DATA) {
      const postComments = mockComments.filter(c => c.post_id === postId);
      setComments(postComments);
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data || []);
    }
  };

  const handleUpvote = async () => {
    if (!post) return;

    if (USE_MOCK_DATA) {
      setPost({ ...post, upvotes: post.upvotes + 1 });
      return;
    }

    const { error } = await supabase
      .from('posts')
      .update({ upvotes: post.upvotes + 1 })
      .eq('id', postId);

    if (error) {
      console.error('Error upvoting:', error);
    } else {
      setPost({ ...post, upvotes: post.upvotes + 1 });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);

    if (USE_MOCK_DATA) {
      const newCommentData: Comment = {
        id: `c${Date.now()}`,
        post_id: postId,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
      };
      setComments([...comments, newCommentData]);
      setNewComment('');
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([{ post_id: postId, content: newComment.trim() }])
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
    } else {
      setComments([...comments, data]);
      setNewComment('');
    }
    setSubmitting(false);
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.title?.trim()) return;

    setSubmitting(true);

    if (USE_MOCK_DATA) {
      if (post) {
        setPost({
          ...post,
          title: editData.title?.trim() || post.title,
          content: editData.content?.trim() || null,
          image_url: editData.image_url?.trim() || null,
          music_url: editData.music_url?.trim() || null,
        });
      }
      setIsEditing(false);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('posts')
      .update({
        title: editData.title?.trim(),
        content: editData.content?.trim() || null,
        image_url: editData.image_url?.trim() || null,
        music_url: editData.music_url?.trim() || null,
      })
      .eq('id', postId);

    if (error) {
      console.error('Error updating post:', error);
    } else {
      await fetchPost();
      setIsEditing(false);
    }
    setSubmitting(false);
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    if (USE_MOCK_DATA) {
      router.push('/');
      return;
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
    } else {
      router.push('/');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Post not found</p>
          <Link href="/">
            <Button variant="link">Go back to feed</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Feed
        </Link>
      </div>

      {/* Post Content */}
      <Card className="mb-6">
        <CardHeader>
          {isEditing ? (
            <form onSubmit={handleUpdatePost} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Description</Label>
                <Textarea
                  id="edit-content"
                  value={editData.content}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-music-url">Music URL</Label>
                <Input
                  id="edit-music-url"
                  type="url"
                  value={editData.music_url}
                  onChange={(e) => setEditData({ ...editData, music_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-image-url">Image URL</Label>
                <Input
                  id="edit-image-url"
                  type="url"
                  value={editData.image_url}
                  onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl mb-2">{post.title}</CardTitle>
                  <CardDescription>{formatDate(post.created_at)}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleDeletePost}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardHeader>

        {!isEditing && (
          <CardContent className="space-y-4">
            {/* Content */}
            {post.content && (
              <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
            )}

            {/* Image */}
            {post.image_url && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full max-h-96 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Music URL */}
            {post.music_url && (
              <a
                href={post.music_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary transition-colors"
              >
                <Music className="w-4 h-4" />
                Listen to Music
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            )}

            <Separator />

            {/* Upvote Section */}
            <div className="flex items-center gap-4">
              <Button onClick={handleUpvote} variant="outline" className="flex items-center gap-2">
                <ArrowUpIcon className="w-4 h-4" />
                Upvote
              </Button>
              <span className="text-sm text-muted-foreground">
                {post.upvotes} {post.upvotes === 1 ? 'upvote' : 'upvotes'}
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comments ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <Input
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={submitting || !newComment.trim()}>
              <SendIcon className="w-4 h-4" />
            </Button>
          </form>

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">{comment.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(comment.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
