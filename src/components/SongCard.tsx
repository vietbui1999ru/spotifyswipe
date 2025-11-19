'use client';

import Image from "next/image"
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import MediaPlayBack from "./MediaPlayBack"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import type { Song } from "@/types/spotify"
import { useAudioPlayer } from "@/hooks/useAudioPlayer"

interface SongCardProps {
	song: Song;
	className?: string;
}

const SongCard = ({ song, className }: SongCardProps) => {
	const { isPlaying, currentTime, duration, toggle, seek } = useAudioPlayer(song);

	const handleSliderChange = (value: number[]) => {
		seek(value[0]);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	return (
		<div className={`w-full p-6 flex align-center justify-center ${className || ''}`}>
			<Card className="w-60">
				<CardContent className="p-3">
					<div className="aspect-square rounded-md bg-gray-100 mb-2 overflow-hidden relative">
						<Image
							src={song.imageUrl}
							alt={song.name}
							fill
							className="object-cover"
						/>
					</div>
					<div className="flex flex-col items-center justify-between">
						<CardTitle className="text-sm mb-1 text-center line-clamp-1">
							{song.name}
						</CardTitle>
						<CardDescription className="text-xs mb-2 line-clamp-2 text-center">
							{song.artists.map(a => a.name).join(', ')}
						</CardDescription>
					</div>
					<div className="flex items-center justify-center gap-1 mb-2 flex-wrap">
						{song.genres.slice(0, 2).map(genre => (
							<Badge key={genre} variant="secondary" className="text-xs">
								{genre}
							</Badge>
						))}
					</div>
					<div className="flex flex-col items-center justify-center gap-y-3">
						<div className="w-full">
							<Slider
								value={[progress]}
								max={100}
								step={0.1}
								onValueChange={handleSliderChange}
								className="cursor-pointer"
							/>
							<div className="flex justify-between text-xs text-muted-foreground mt-1">
								<span>{formatTime(currentTime)}</span>
								<span>{formatTime(duration)}</span>
							</div>
						</div>
						<MediaPlayBack
							isPlaying={isPlaying}
							onPlayPause={toggle}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default SongCard
