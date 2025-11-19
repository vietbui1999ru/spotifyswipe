'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchIcon, ThumbsUpIcon } from 'lucide-react';
import { usePlaylist } from '@/hooks/usePlaylist';
import { Genre, type Playlist } from '@/types/spotify';
import PlaylistDetailModal from '@/components/PlaylistDetailModal';

function Dashboard() {
	const { playlists, upvotePlaylist } = usePlaylist();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedGenre, setSelectedGenre] = useState<string>('all');
	const [sortBy, setSortBy] = useState<'upvotes' | 'date'>('upvotes');
	const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

	const filteredPlaylists = useMemo(() => {
		let filtered = [...playlists];

		// Filter by search query
		if (searchQuery) {
			filtered = filtered.filter(
				(p) =>
					p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
					p.owner.displayName.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		// Filter by genre
		if (selectedGenre !== 'all') {
			filtered = filtered.filter((p) => p.topGenres.includes(selectedGenre as Genre));
		}

		// Sort
		if (sortBy === 'upvotes') {
			filtered.sort((a, b) => b.upvotes - a.upvotes);
		} else {
			filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		}

		return filtered;
	}, [playlists, searchQuery, selectedGenre, sortBy]);

	const handlePlaylistClick = (playlist: Playlist) => {
		setSelectedPlaylist(playlist);
		setIsDetailModalOpen(true);
	};

	const handleCloseDetailModal = () => {
		setIsDetailModalOpen(false);
		setSelectedPlaylist(null);
	};

	return (
		<div className="min-h-screen p-8 bg-background">
			<div className="max-w-7xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold mb-2">Discover Playlists</h1>
					<p className="text-muted-foreground">
						Explore playlists from the community
					</p>
				</div>

				{/* Search and Filters */}
				<div className="flex flex-col md:flex-row gap-4 mb-8">
					<div className="relative flex-1">
						<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search playlists, users, or descriptions..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>

					<Select value={selectedGenre} onValueChange={setSelectedGenre}>
						<SelectTrigger className="w-full md:w-48">
							<SelectValue placeholder="Filter by genre" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Genres</SelectItem>
							{Object.values(Genre).map((genre) => (
								<SelectItem key={genre} value={genre}>
									{genre}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={sortBy} onValueChange={(value: 'upvotes' | 'date') => setSortBy(value)}>
						<SelectTrigger className="w-full md:w-48">
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="upvotes">Most Upvoted</SelectItem>
							<SelectItem value="date">Recently Created</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Results count */}
				<div className="mb-4 text-sm text-muted-foreground">
					Showing {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''}
				</div>

				{/* Playlist Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{filteredPlaylists.map((playlist) => (
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
							<CardContent className="p-4 pt-0 space-y-3">
								{/* Creator Info */}
								<div className="flex items-center gap-2">
									<Avatar className="h-6 w-6">
										<AvatarImage src={playlist.owner.avatarUrl} />
										<AvatarFallback>{playlist.owner.displayName[0]}</AvatarFallback>
									</Avatar>
									<span className="text-sm text-muted-foreground truncate">
										{playlist.owner.displayName}
									</span>
								</div>

								{/* Stats */}
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>{playlist.songs.length} songs</span>
									<div className="flex items-center gap-1">
										<ThumbsUpIcon className="h-3 w-3" />
										<span>{playlist.upvotes}</span>
									</div>
								</div>

								{/* Top Genres */}
								<div className="flex gap-1 flex-wrap">
									{playlist.topGenres.slice(0, 3).map((genre) => (
										<Badge key={genre} variant="secondary" className="text-xs">
											{genre}
										</Badge>
									))}
								</div>
							</CardContent>
						</Card>
					))}

					{filteredPlaylists.length === 0 && (
						<div className="col-span-full flex flex-col items-center justify-center py-16">
							<p className="text-muted-foreground">No playlists found</p>
							<p className="text-sm text-muted-foreground mt-2">
								Try adjusting your search or filters
							</p>
						</div>
					)}
				</div>

				<PlaylistDetailModal
					playlist={selectedPlaylist}
					isOpen={isDetailModalOpen}
					onClose={handleCloseDetailModal}
					onUpvote={upvotePlaylist}
				/>
			</div>
		</div>
	);
}

export default Dashboard;
