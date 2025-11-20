'use client';

import { useEffect, useRef } from 'react';
import SongCard from '@/components/SongCard';
import SwipeButtons from '@/components/SwipeFeature';
import LyricsCard from '@/components/LyricsCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';
import { mockSongs } from '@/data/mockData';
import { useSwipe } from '@/hooks/useSwipe';
import { SeedPattern, SeedFrequency, SeedCategory, SeedMood } from '@/types/spotify';

function Swipe() {
	const {
		currentSong,
		currentIndex,
		totalSongs,
		likedSongs,
		likeSong,
		dislikeSong,
		goToSong,
		seedPattern,
		seedFrequency,
		seedCategory,
		seedMood,
	} = useSwipe(mockSongs.slice(0, 20));

	const carouselApi = useRef<CarouselApi>(undefined);

	useEffect(() => {
		if (carouselApi.current) {
			carouselApi.current.scrollTo(currentIndex);
		}
	}, [currentIndex]);

	return (
		<div className="min-h-screen p-8 bg-background">
			<div className="max-w-7xl mx-auto flex gap-6 justify-center">
				{/* Sidebar - Song Queue */}
				<div className="w-64 space-y-3">
					<Card>
						<CardContent className="p-4">
							<h3 className="font-semibold mb-2">Discovery Queue</h3>
							<p className="text-sm text-muted-foreground">
								{currentIndex + 1} / {totalSongs}
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4 space-y-2">
							<h4 className="text-sm font-medium">Seed Parameters</h4>
							{seedPattern && (
								<div>
									<p className="text-xs text-muted-foreground">Pattern</p>
									<Badge variant="outline">{seedPattern}</Badge>
								</div>
							)}
							{seedFrequency && (
								<div>
									<p className="text-xs text-muted-foreground">Frequency</p>
									<Badge variant="outline">{seedFrequency}</Badge>
								</div>
							)}
							{seedCategory && (
								<div>
									<p className="text-xs text-muted-foreground">Category</p>
									<Badge variant="outline">{seedCategory}</Badge>
								</div>
							)}
							{seedMood && (
								<div>
									<p className="text-xs text-muted-foreground">Mood/Time</p>
									<Badge variant="outline">{seedMood}</Badge>
								</div>
							)}
							{!seedPattern && !seedFrequency && !seedCategory && !seedMood && (
								<p className="text-xs text-muted-foreground">No filters applied</p>
							)}
						</CardContent>
					</Card>

					<div className="space-y-1">
						{mockSongs.slice(0, 20).map((song, index) => (
							<button
								key={song.id}
								onClick={() => goToSong(index)}
								className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${
									index === currentIndex
										? 'bg-primary text-primary-foreground border-primary'
										: 'bg-card hover:bg-muted border-border'
								}`}
							>
								{song.name}
							</button>
						))}
					</div>
				</div>

				{/* Main content - Carousel */}
				<main className="flex flex-col items-center justify-center">
					<Carousel
						opts={{
							align: 'start',
							loop: false,
						}}
						className="w-full max-w-md"
					>
						<CarouselContent>
							{mockSongs.slice(0, 20).map((song) => (
								<CarouselItem key={song.id}>
									{currentSong && song.id === currentSong.id && (
										<SongCard song={currentSong} />
									)}
								</CarouselItem>
							))}
						</CarouselContent>
					</Carousel>

					<SwipeButtons
						onDislike={dislikeSong}
						onLike={likeSong}
						disabled={!currentSong}
					/>

					<div className="mt-4 text-center">
						<p className="text-sm text-muted-foreground">
							Liked: {likedSongs.length} songs
						</p>
					</div>
				</main>

				{/* Right sidebar - Lyrics */}
				<div className="flex flex-col items-center justify-center">
					<LyricsCard />
				</div>
			</div>
		</div>
	);
}

export default Swipe;
