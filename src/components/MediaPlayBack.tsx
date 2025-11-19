"use client";

import {
	PauseIcon,
	PlayIcon,
	SkipBackIcon,
	SkipForwardIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

interface MediaPlayBackProps {
	isPlaying: boolean;
	onPlayPause: () => void;
	onSkipBack?: () => void;
	onSkipForward?: () => void;
}

const MediaPlayBack = ({
	isPlaying,
	onPlayPause,
	onSkipBack,
	onSkipForward
}: MediaPlayBackProps) => {
	return (
		<div className="flex flex-col gap-4 padding-2">
			<ButtonGroup>
				<Button
					className="rounded-full"
					size="sm"
					variant="outline"
					onClick={onSkipBack}
					disabled={!onSkipBack}
				>
					<SkipBackIcon />
				</Button>
				<Button
					className="rounded-full"
					onClick={onPlayPause}
					size="sm"
					variant="outline"
				>
					{isPlaying ? <PauseIcon /> : <PlayIcon />}
				</Button>
				<Button
					className="rounded-full"
					size="sm"
					variant="outline"
					onClick={onSkipForward}
					disabled={!onSkipForward}
				>
					<SkipForwardIcon />
				</Button>
			</ButtonGroup>
		</div>
	);
};

export default MediaPlayBack;

