import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { StarIcon } from "lucide-react"
import MediaPlayBack from "./MediaPlayBack"
import { Slider } from "@/components/ui/slider"

const SongCard = () => {
	return (
		<div className="w-full p-6 flex align-center justify-center">
			<Card className="w-60">
				<CardContent className="p-3">
					<div className="aspect-square rounded-md bg-gray-100 mb-2">
						<div className="flex items-center justify-center h-full text-muted-foreground text-xs">
							Song Cover
						</div>
					</div>
					<div className="flex flex-col items-center justify-between">
						<CardTitle className="text-sm mb-1">Song Name</CardTitle>
						<CardDescription className="text-xs mb-2 line-clamp-2">
							Artist Name
						</CardDescription>
					</div>
					<div className="flex items-center space-x-1 mb-2">
					</div>
					<div className="flex flex-col items-center justify-center gap-y-3">
						<Slider defaultValue={[50]} max={100} step={1} />
						<MediaPlayBack />
					</div>
				</CardContent>
			</Card>
		</div >
	)
}

export default SongCard
