"use client";

import {
	PauseIcon,
	PlayIcon,
	SkipBackIcon,
	SkipForwardIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

const PlayBack = () => {
	const [isPlaying, setIsPlaying] = useState(false);

	return (
		<div className="flex flex-col gap-4 padding-2">
			<ButtonGroup>
				<Button className="rounded-full" size="sm" variant="outline">
					<SkipBackIcon />
				</Button>
				<Button
					className="rounded-full"
					onClick={() => setIsPlaying(!isPlaying)}
					size="sm"
					variant="outline"
				>
					{isPlaying ? <PauseIcon /> : <PlayIcon />}
				</Button>
				<Button
					className="rounded-full"
					size="sm" variant="outline">
					<SkipForwardIcon />
				</Button>
			</ButtonGroup>
		</div>
	);
};

export default PlayBack;

