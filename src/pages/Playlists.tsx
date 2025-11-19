'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon } from 'lucide-react';
import { usePlaylist } from '@/hooks/usePlaylist';
import { currentUser } from '@/data/mockData';
import PlaylistEditModal from '@/components/PlaylistEditModal';
import type { Playlist } from '@/types/spotify';

function Playlists() {
	const {
		playlists,
		getUserPlaylists,
		updatePlaylist,
		deletePlaylist,
		removeSongFromPlaylist,
	} = usePlaylist();
	const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

	const userPlaylists = getUserPlaylists(currentUser.id);

	const handlePlaylistClick = (playlist: Playlist) => {
		setSelectedPlaylist(playlist);
		setIsEditModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsEditModalOpen(false);
		setSelectedPlaylist(null);
	};

	return (
		<div className="min-h-screen p-8 bg-background">
			<div className="max-w-7xl mx-auto">
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-bold">My Playlists</h1>
						<p className="text-muted-foreground mt-1">
							{userPlaylists.length} playlist{userPlaylists.length !== 1 ? 's' : ''}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{userPlaylists.map((playlist) => (
						<Card
							key={playlist.id}
							className="cursor-pointer hover:bg-muted/50 transition-colors"
							onClick={() => handlePlaylistClick(playlist)}
						>
							<CardHeader className="p-4">
								<div className="aspect-square rounded-md overflow-hidden relative mb-4">
									<Image
										src={playlist.imageUrl}
										alt={playlist.name}
										fill
										className="object-cover"
									/>
								</div>
								<CardTitle className="line-clamp-1">{playlist.name}</CardTitle>
								<CardDescription className="line-clamp-2">
									{playlist.description}
								</CardDescription>
							</CardHeader>
							<CardContent className="p-4 pt-0">
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>{playlist.songs.length} songs</span>
									<span>{playlist.upvotes} upvotes</span>
								</div>
								<div className="flex gap-1 mt-2 flex-wrap">
									{playlist.topGenres.slice(0, 3).map((genre) => (
										<Badge key={genre} variant="secondary" className="text-xs">
											{genre}
										</Badge>
									))}
								</div>
							</CardContent>
						</Card>
					))}

					{userPlaylists.length === 0 && (
						<div className="col-span-full flex flex-col items-center justify-center py-16">
							<p className="text-muted-foreground mb-4">No playlists yet</p>
						</div>
					)}
				</div>

				<PlaylistEditModal
					playlist={selectedPlaylist}
					isOpen={isEditModalOpen}
					onClose={handleCloseModal}
					onUpdate={updatePlaylist}
					onDelete={deletePlaylist}
					onRemoveSong={removeSongFromPlaylist}
				/>
			</div>
		</div>
	);
}

export default Playlists;
