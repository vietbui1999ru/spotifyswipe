'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import SongCardHorizontal from './SongCardHorizontal';
import { ThumbsUpIcon, MessageSquareIcon, CalendarIcon } from 'lucide-react';
import type { Playlist, Comment } from '@/types/spotify';
import { mockComments, currentUser } from '@/data/mockData';

interface PlaylistDetailModalProps {
	playlist: Playlist | null;
	isOpen: boolean;
	onClose: () => void;
	onUpvote?: (playlistId: string) => void;
}

const PlaylistDetailModal = ({
	playlist,
	isOpen,
	onClose,
	onUpvote,
}: PlaylistDetailModalProps) => {
	const [newComment, setNewComment] = useState('');
	const [comments, setComments] = useState<Comment[]>(
		playlist ? mockComments.filter(c => c.playlistId === playlist.id) : []
	);
	const [hasUpvoted, setHasUpvoted] = useState(false);

	if (!playlist) return null;

	const handleUpvote = () => {
		if (onUpvote) {
			onUpvote(playlist.id);
			setHasUpvoted(!hasUpvoted);
		}
	};

	const handleAddComment = () => {
		if (!newComment.trim()) return;

		const comment: Comment = {
			id: `comment-${Date.now()}`,
			user: currentUser,
			playlistId: playlist.id,
			content: newComment,
			createdAt: new Date().toISOString(),
			likes: 0,
		};

		setComments([comment, ...comments]);
		setNewComment('');
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex gap-6">
						{/* Playlist Cover */}
						<div className="relative w-48 h-48 rounded-md overflow-hidden flex-shrink-0">
							<Image
								src={playlist.imageUrl}
								alt={playlist.name}
								fill
								className="object-cover"
							/>
						</div>

						{/* Playlist Info */}
						<div className="flex-1 space-y-3">
							<DialogTitle className="text-3xl">{playlist.name}</DialogTitle>
							<DialogDescription className="text-base">
								{playlist.description}
							</DialogDescription>

							{/* Creator Info */}
							<div className="flex items-center gap-3">
								<Avatar className="h-10 w-10">
									<AvatarImage src={playlist.owner.avatarUrl} />
									<AvatarFallback>{playlist.owner.displayName[0]}</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-medium text-sm">{playlist.owner.displayName}</p>
									<p className="text-xs text-muted-foreground">@{playlist.owner.username}</p>
								</div>
							</div>

							{/* Stats */}
							<div className="flex items-center gap-6 text-sm text-muted-foreground">
								<div className="flex items-center gap-1">
									<CalendarIcon className="h-4 w-4" />
									<span>{formatDate(playlist.createdAt)}</span>
								</div>
								<span>{playlist.songs.length} songs</span>
								<div className="flex items-center gap-1">
									<ThumbsUpIcon className="h-4 w-4" />
									<span>{playlist.upvotes} upvotes</span>
								</div>
							</div>

							{/* Genres */}
							<div className="flex gap-2 flex-wrap">
								{playlist.topGenres.map((genre) => (
									<Badge key={genre} variant="secondary">
										{genre}
									</Badge>
								))}
							</div>

							{/* Upvote Button */}
							<Button
								variant={hasUpvoted ? 'default' : 'outline'}
								onClick={handleUpvote}
								className="mt-2"
							>
								<ThumbsUpIcon className={`mr-2 h-4 w-4 ${hasUpvoted ? 'fill-current' : ''}`} />
								{hasUpvoted ? 'Upvoted' : 'Upvote'}
							</Button>
						</div>
					</div>
				</DialogHeader>

				<Separator className="my-6" />

				{/* Songs Section */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold flex items-center gap-2">
						Songs
						<span className="text-sm font-normal text-muted-foreground">
							({playlist.songs.length})
						</span>
					</h3>
					<div className="border rounded-md divide-y max-h-96 overflow-y-auto">
						{playlist.songs.map((song, index) => (
							<SongCardHorizontal
								key={song.id}
								song={song}
								index={index}
								onPlay={() => console.log('Playing:', song.name)}
							/>
						))}
						{playlist.songs.length === 0 && (
							<div className="p-8 text-center text-muted-foreground">
								No songs in this playlist
							</div>
						)}
					</div>
				</div>

				<Separator className="my-6" />

				{/* Comments Section */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold flex items-center gap-2">
						<MessageSquareIcon className="h-5 w-5" />
						Comments
						<span className="text-sm font-normal text-muted-foreground">
							({comments.length})
						</span>
					</h3>

					{/* Add Comment */}
					<div className="space-y-2">
						<Textarea
							placeholder="Add a comment..."
							value={newComment}
							onChange={(e) => setNewComment(e.target.value)}
							rows={3}
						/>
						<div className="flex justify-end">
							<Button onClick={handleAddComment} disabled={!newComment.trim()}>
								Post Comment
							</Button>
						</div>
					</div>

					{/* Comments List */}
					<div className="space-y-4 max-h-96 overflow-y-auto">
						{comments.map((comment) => (
							<div key={comment.id} className="flex gap-3 p-3 rounded-md bg-muted/30">
								<Avatar className="h-8 w-8 flex-shrink-0">
									<AvatarImage src={comment.user.avatarUrl} />
									<AvatarFallback>{comment.user.displayName[0]}</AvatarFallback>
								</Avatar>
								<div className="flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<span className="font-medium text-sm">
											{comment.user.displayName}
										</span>
										<span className="text-xs text-muted-foreground">
											{formatDate(comment.createdAt)}
										</span>
									</div>
									<p className="text-sm">{comment.content}</p>
									<div className="flex items-center gap-1 text-xs text-muted-foreground">
										<ThumbsUpIcon className="h-3 w-3" />
										<span>{comment.likes}</span>
									</div>
								</div>
							</div>
						))}
						{comments.length === 0 && (
							<div className="p-8 text-center text-muted-foreground">
								No comments yet. Be the first to comment!
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default PlaylistDetailModal;
