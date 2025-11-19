'use client';

import Image from "next/image";
import { PlayIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Song } from "@/types/spotify";

interface SongCardHorizontalProps {
	song: Song;
	onPlay?: () => void;
	onRemove?: () => void;
	showRemove?: boolean;
	index?: number;
}

const SongCardHorizontal = ({
	song,
	onPlay,
	onRemove,
	showRemove = false,
	index
}: SongCardHorizontalProps) => {
	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	return (
		<div className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors group">
			{index !== undefined && (
				<span className="text-sm text-muted-foreground w-6 text-center">
					{index + 1}
				</span>
			)}

			<div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
				<Image
					src={song.imageUrl}
					alt={song.name}
					fill
					className="object-cover"
				/>
			</div>

			<div className="flex-1 min-w-0">
				<h4 className="text-sm font-medium truncate">{song.name}</h4>
				<p className="text-xs text-muted-foreground truncate">
					{song.artists.map(a => a.name).join(', ')}
				</p>
			</div>

			<div className="hidden sm:flex gap-1">
				{song.genres.slice(0, 2).map(genre => (
					<Badge key={genre} variant="outline" className="text-xs">
						{genre}
					</Badge>
				))}
			</div>

			<span className="text-sm text-muted-foreground">
				{formatDuration(song.duration)}
			</span>

			<div className="flex items-center gap-1">
				{onPlay && (
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8"
						onClick={onPlay}
					>
						<PlayIcon className="h-4 w-4" />
					</Button>
				)}

				{showRemove && onRemove && (
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
						onClick={onRemove}
					>
						<XIcon className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
};

export default SongCardHorizontal;
