import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

const LyricsCard = () => {
	const [checked, setChecked] = useState(false);
	return (
		<div className="w-full p-6 flex flex-col justify-center align-center">
			<Card className="w-full w-100 h-100 flex flex-col justify-center items-center align-center">
				<CardHeader>
					<CardTitle>{checked ? "AI" : "Lyrics"}</CardTitle>
					<CardDescription>Card Description</CardDescription>
				</CardHeader>
				<CardContent>
					<p>Card Content</p>
				</CardContent>

				<div className="flex items-center gap-2">
					<Switch checked={checked} onCheckedChange={setChecked} />
					<span className="text-muted-foreground text-sm">
						{checked ? "AI" : "AI"}
					</span>
				</div>
			</Card>
		</div>
	)
}

export default LyricsCard
