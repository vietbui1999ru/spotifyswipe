'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import SongCardHorizontal from './SongCardHorizontal';
import { TrashIcon, ImageIcon } from 'lucide-react';
import type { Playlist } from '@/types/spotify';

interface PlaylistEditModalProps {
	playlist: Playlist | null;
	isOpen: boolean;
	onClose: () => void;
	onUpdate: (playlistId: string, updates: Partial<Playlist>) => void;
	onDelete: (playlistId: string) => void;
	onRemoveSong: (playlistId: string, songId: string) => void;
}

const PlaylistEditModal = ({
	playlist,
	isOpen,
	onClose,
	onUpdate,
	onDelete,
	onRemoveSong,
}: PlaylistEditModalProps) => {
	const [name, setName] = useState(playlist?.name || '');
	const [description, setDescription] = useState(playlist?.description || '');
	const [imageUrl, setImageUrl] = useState(playlist?.imageUrl || '');

	if (!playlist) return null;

	const handleUpdate = () => {
		onUpdate(playlist.id, {
			name,
			description,
			imageUrl,
		});
		onClose();
	};

	const handleDelete = () => {
		if (confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
			onDelete(playlist.id);
			onClose();
		}
	};

	const handleRemoveSong = (songId: string) => {
		onRemoveSong(playlist.id, songId);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Playlist</DialogTitle>
					<DialogDescription>
						Update your playlist details and manage songs
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Playlist Image */}
					<div className="space-y-2">
						<Label>Playlist Cover</Label>
						<div className="flex gap-4 items-start">
							<div className="relative w-32 h-32 rounded-md overflow-hidden bg-muted flex items-center justify-center">
								{imageUrl ? (
									<Image
										src={imageUrl}
										alt={name}
										fill
										className="object-cover"
									/>
								) : (
									<ImageIcon className="h-12 w-12 text-muted-foreground" />
								)}
							</div>
							<div className="flex-1 space-y-2">
								<Input
									placeholder="Image URL"
									value={imageUrl}
									onChange={(e) => setImageUrl(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground">
									Enter a URL for your playlist cover image
								</p>
							</div>
						</div>
					</div>

					{/* Playlist Name */}
					<div className="space-y-2">
						<Label htmlFor="name">Playlist Name</Label>
						<Input
							id="name"
							placeholder="My Awesome Playlist"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					{/* Playlist Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							placeholder="Describe your playlist..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
						/>
					</div>

					{/* Songs List */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Songs ({playlist.songs.length})</Label>
						</div>
						<div className="border rounded-md max-h-64 overflow-y-auto">
							{playlist.songs.length > 0 ? (
								<div className="divide-y">
									{playlist.songs.map((song, index) => (
										<SongCardHorizontal
											key={song.id}
											song={song}
											index={index}
											showRemove
											onRemove={() => handleRemoveSong(song.id)}
										/>
									))}
								</div>
							) : (
								<div className="p-8 text-center text-muted-foreground">
									No songs in this playlist yet
								</div>
							)}
						</div>
					</div>
				</div>

				<DialogFooter className="flex items-center justify-between">
					<Button
						variant="destructive"
						onClick={handleDelete}
						className="mr-auto"
					>
						<TrashIcon className="mr-2 h-4 w-4" />
						Delete Playlist
					</Button>
					<div className="flex gap-2">
						<Button variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button onClick={handleUpdate}>
							Update Playlist
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default PlaylistEditModal;
