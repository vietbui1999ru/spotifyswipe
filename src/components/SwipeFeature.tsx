'use client';

import { ChevronRightIcon, ChevronLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SwipeButtonsProps {
	onDislike: () => void;
	onLike: () => void;
	disabled?: boolean;
}

const SwipeButtons = ({ onDislike, onLike, disabled = false }: SwipeButtonsProps) => {
	return (
		<div className="w-full p-2 flex justify-center space-x-10">
			<Button
				variant="default"
				size="lg"
				className="bg-red-600 hover:bg-red-400"
				onClick={onDislike}
				disabled={disabled}
			>
				<ChevronLeftIcon />
			</Button>
			<Button
				variant="default"
				size="lg"
				onClick={onLike}
				disabled={disabled}
			>
				<ChevronRightIcon />
			</Button>
		</div>
	)
}

export default SwipeButtons
