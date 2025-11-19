import { useState } from 'react';
import { useRouter } from 'next/router';
import SongCard from '@/components/SongCard';
import SwipeButtons from '@/components/SwipeFeature';
import LyricsCard from '@/components/LyricsCard';

function Swipe({ darkMode }: { darkMode: boolean }) {
	const [songs, setSongs] = useState([
		{ id: 1, name: 'Song 1', artist: 'Artist 1', playStatus: true },
		{ id: 2, name: 'Song 2', artist: 'Artist 2', playStatus: false },
		{ id: 3, name: 'Song 3', artist: 'Artist 3', playStatus: false },
	])
	const [currentIndex, setCurrentIndex] = useState(0);
	const [showAI, setShowAI] = useState(false);
	const handleSwipe = (liked: boolean) => {
		if (currentIndex < songs.length - 1) {
			setCurrentIndex(currentIndex + 1);
		} else {
			setCurrentIndex(0);
		}
		setShowAI(false);
	};
	const currentSong = songs[currentIndex];

	return (
		<div className={`min-h-screen p-8 ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
			<div className="max-w-7xl flex gap-1 space-x-3 justify-center">
				{/* Sidebar */}
				<div className="w-50 space-y-3">
					<div className={`px-4 py-3 rounded-md border ${darkMode ? 'bg-white text-black border-white' : 'bg-white border-gray-200'}`}>
						Playlist name
					</div>
					<div className={`px-4 py-2 rounded-md border ${darkMode ? 'border-gray-800 text-white' : 'border-gray-300'}`}>
						song 1
					</div>
					<div className={`px-4 py-2 rounded-md border ${darkMode ? 'border-gray-800 text-white' : 'border-gray-300'}`}>
						song 2
					</div>
					<div className={`px-4 py-2 rounded-md border ${darkMode ? 'border-gray-800 text-white' : 'border-gray-300'}`}>
						...
					</div>
					<div className={`px-4 py-2 rounded-md border ${darkMode ? 'border-gray-800 text-white' : 'border-gray-300'}`}>
						new song 10
					</div>
				</div>

				{/* Main content */}
				<main className="flex flex-col items-start justify-center">
					{currentSong && (
						<SongCard />
					)}
					<SwipeButtons />
				</main>
				<div className="flex flex-col items-center justify-center">
					<LyricsCard />
				</div>
			</div>
		</div>
	);

}

export default Swipe;
