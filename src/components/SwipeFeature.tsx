import { ChevronRightIcon } from "lucide-react"
import { ChevronLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

const SwipeButtons = () => {
	return (
		<div className="w-full p-2 flex justify-center space-x-10">
			<Button variant="default" size="lg" className="bg-red-600 hover:bg-red-400">
				<ChevronLeftIcon />
			</Button>
			<Button variant="default" size="lg">
				<ChevronRightIcon />
			</Button>
		</div>
	)
}

export default SwipeButtons
