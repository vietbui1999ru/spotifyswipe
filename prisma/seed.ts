import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

// ── Seeded random for reproducibility ──────────────────────────────────────────
let _seed = 42;
function rand(): number {
	_seed = (_seed * 16807 + 0) % 2147483647;
	return (_seed - 1) / 2147483646;
}
function randInt(min: number, max: number): number {
	return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
	return arr[randInt(0, arr.length - 1)]!;
}
function pickN<T>(arr: T[], n: number): T[] {
	const copy = [...arr];
	const result: T[] = [];
	for (let i = 0; i < Math.min(n, copy.length); i++) {
		const idx = randInt(0, copy.length - 1);
		result.push(copy.splice(idx, 1)[0]!);
	}
	return result;
}
function daysAgo(n: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - n);
	d.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59));
	return d;
}

// ── Demo Data ──────────────────────────────────────────────────────────────────

const USERS = [
	{ name: "Alice Chen", email: "alice@demo.com", musicProvider: "spotify" },
	{ name: "Bob Martinez", email: "bob@demo.com", musicProvider: "spotify" },
	{ name: "Carol Williams", email: "carol@demo.com", musicProvider: "lastfm" },
	{ name: "Dave Kim", email: "dave@demo.com", musicProvider: "spotify" },
	{ name: "Eva Rodriguez", email: "eva@demo.com", musicProvider: "lastfm" },
	{ name: "Frank Johnson", email: "frank@demo.com", musicProvider: "spotify" },
	{ name: "Grace Lee", email: "grace@demo.com", musicProvider: "spotify" },
	{ name: "Hank Patel", email: "hank@demo.com", musicProvider: "lastfm" },
	{ name: "Ivy Thompson", email: "ivy@demo.com", musicProvider: "spotify" },
	{ name: "Jake Wilson", email: "jake@demo.com", musicProvider: "spotify" },
	{ name: "Karen Davis", email: "karen@demo.com", musicProvider: "lastfm" },
	{ name: "Leo Nguyen", email: "leo@demo.com", musicProvider: "spotify" },
	{ name: "Mia Brown", email: "mia@demo.com", musicProvider: "spotify" },
	{ name: "Noah Garcia", email: "noah@demo.com", musicProvider: "lastfm" },
	{ name: "Olivia Moore", email: "olivia@demo.com", musicProvider: "spotify" },
	{ name: "Pete Anderson", email: "pete@demo.com", musicProvider: "spotify" },
	{ name: "Quinn Taylor", email: "quinn@demo.com", musicProvider: "lastfm" },
	{ name: "Ruby Jackson", email: "ruby@demo.com", musicProvider: "spotify" },
	{ name: "Sam White", email: "sam@demo.com", musicProvider: "spotify" },
	{ name: "Tina Harris", email: "tina@demo.com", musicProvider: "lastfm" },
];

const SONGS = [
	{
		title: "Bohemian Rhapsody",
		artist: "Queen",
		album: "A Night at the Opera",
		duration: 354,
	},
	{
		title: "Stairway to Heaven",
		artist: "Led Zeppelin",
		album: "Led Zeppelin IV",
		duration: 482,
	},
	{
		title: "Hotel California",
		artist: "Eagles",
		album: "Hotel California",
		duration: 391,
	},
	{
		title: "Comfortably Numb",
		artist: "Pink Floyd",
		album: "The Wall",
		duration: 382,
	},
	{ title: "Imagine", artist: "John Lennon", album: "Imagine", duration: 187 },
	{
		title: "Smells Like Teen Spirit",
		artist: "Nirvana",
		album: "Nevermind",
		duration: 301,
	},
	{
		title: "Wonderwall",
		artist: "Oasis",
		album: "(What's the Story) Morning Glory?",
		duration: 258,
	},
	{
		title: "Let It Be",
		artist: "The Beatles",
		album: "Let It Be",
		duration: 243,
	},
	{
		title: "Purple Rain",
		artist: "Prince",
		album: "Purple Rain",
		duration: 520,
	},
	{
		title: "Billie Jean",
		artist: "Michael Jackson",
		album: "Thriller",
		duration: 294,
	},
	{ title: "Lose Yourself", artist: "Eminem", album: "8 Mile", duration: 326 },
	{
		title: "Blinding Lights",
		artist: "The Weeknd",
		album: "After Hours",
		duration: 200,
	},
	{
		title: "Shape of You",
		artist: "Ed Sheeran",
		album: "Divide",
		duration: 233,
	},
	{ title: "Rolling in the Deep", artist: "Adele", album: "21", duration: 228 },
	{
		title: "Superstition",
		artist: "Stevie Wonder",
		album: "Talking Book",
		duration: 245,
	},
	{
		title: "Sweet Child O' Mine",
		artist: "Guns N' Roses",
		album: "Appetite for Destruction",
		duration: 356,
	},
	{
		title: "Under Pressure",
		artist: "Queen & David Bowie",
		album: "Hot Space",
		duration: 248,
	},
	{ title: "Creep", artist: "Radiohead", album: "Pablo Honey", duration: 236 },
	{
		title: "No Woman No Cry",
		artist: "Bob Marley",
		album: "Live!",
		duration: 427,
	},
	{
		title: "Hallelujah",
		artist: "Jeff Buckley",
		album: "Grace",
		duration: 415,
	},
	{
		title: "Take On Me",
		artist: "a-ha",
		album: "Hunting High and Low",
		duration: 227,
	},
	{ title: "Africa", artist: "Toto", album: "Toto IV", duration: 295 },
	{
		title: "Don't Stop Believin'",
		artist: "Journey",
		album: "Escape",
		duration: 251,
	},
	{
		title: "Hey Jude",
		artist: "The Beatles",
		album: "Hey Jude",
		duration: 431,
	},
	{
		title: "Wish You Were Here",
		artist: "Pink Floyd",
		album: "Wish You Were Here",
		duration: 334,
	},
	{
		title: "Come As You Are",
		artist: "Nirvana",
		album: "Nevermind",
		duration: 219,
	},
	{ title: "Yesterday", artist: "The Beatles", album: "Help!", duration: 125 },
	{
		title: "Back in Black",
		artist: "AC/DC",
		album: "Back in Black",
		duration: 255,
	},
	{
		title: "Karma Police",
		artist: "Radiohead",
		album: "OK Computer",
		duration: 264,
	},
	{
		title: "Bitter Sweet Symphony",
		artist: "The Verve",
		album: "Urban Hymns",
		duration: 358,
	},
	{
		title: "Seven Nation Army",
		artist: "The White Stripes",
		album: "Elephant",
		duration: 232,
	},
	{
		title: "Mr. Brightside",
		artist: "The Killers",
		album: "Hot Fuss",
		duration: 222,
	},
	{
		title: "Thinking Out Loud",
		artist: "Ed Sheeran",
		album: "x",
		duration: 281,
	},
	{
		title: "Levitating",
		artist: "Dua Lipa",
		album: "Future Nostalgia",
		duration: 203,
	},
	{
		title: "Bad Guy",
		artist: "Billie Eilish",
		album: "When We All Fall Asleep",
		duration: 194,
	},
	{
		title: "Watermelon Sugar",
		artist: "Harry Styles",
		album: "Fine Line",
		duration: 174,
	},
	{
		title: "drivers license",
		artist: "Olivia Rodrigo",
		album: "SOUR",
		duration: 242,
	},
	{
		title: "Peaches",
		artist: "Justin Bieber",
		album: "Justice",
		duration: 198,
	},
	{
		title: "Stay",
		artist: "The Kid LAROI & Justin Bieber",
		album: "F*ck Love 3",
		duration: 141,
	},
	{
		title: "Heat Waves",
		artist: "Glass Animals",
		album: "Dreamland",
		duration: 238,
	},
];

const PLAYLIST_TEMPLATES = [
	{
		name: "Classic Rock Essentials",
		description: "Timeless rock anthems that never get old",
	},
	{ name: "90s Grunge Mix", description: "The grunge era's finest tracks" },
	{ name: "Chill Vibes", description: "Relaxing tunes for a quiet evening" },
	{ name: "Pop Legends", description: "Iconic pop tracks through the decades" },
	{
		name: "All-Time Favorites",
		description: "My personal top picks from every era",
	},
	{
		name: "Workout Energy",
		description: "High-energy tracks to fuel your workout",
	},
	{
		name: "Road Trip Anthems",
		description: "Perfect playlist for long drives",
	},
	{
		name: "Indie Discoveries",
		description: "Hidden gems from the indie scene",
	},
	{
		name: "Late Night Grooves",
		description: "Smooth tracks for late night sessions",
	},
	{
		name: "Throwback Thursday",
		description: "Blast from the past nostalgia hits",
	},
	{ name: "Modern Bangers", description: "Today's hottest tracks on repeat" },
	{ name: "Acoustic Sessions", description: "Stripped down and beautiful" },
	{ name: "Festival Vibes", description: "Songs that make you feel alive" },
	{
		name: "Rainy Day Playlist",
		description: "Cozy tracks for rainy afternoons",
	},
	{ name: "Summer Hits 2025", description: "The hottest songs of the summer" },
	{
		name: "Mood Booster",
		description: "Guaranteed to put a smile on your face",
	},
	{ name: "Deep Cuts", description: "Album tracks you need to discover" },
	{
		name: "Party Starters",
		description: "Get the party going with these bangers",
	},
	{
		name: "Study Focus",
		description: "Concentration-boosting background music",
	},
	{ name: "Bedroom Pop", description: "Lo-fi bedroom pop essentials" },
	{
		name: "Guitar Heroes",
		description: "The greatest guitar solos ever recorded",
	},
	{ name: "Soul & Funk", description: "Groovy classics that make you move" },
	{ name: "Alt Rock Essentials", description: "The best of alternative rock" },
	{
		name: "Heartbreak Anthems",
		description: "Songs for when you need to feel",
	},
	{ name: "Sunday Morning", description: "Easy listening for lazy weekends" },
];

const CAPTIONS = [
	"Check out this playlist! These tracks never get old.",
	"Grunge forever. This playlist takes me back to the 90s.",
	"Perfect vibes for any mood. Give it a listen!",
	"My favorite songs right now. What do you think?",
	"Been curating this for weeks. Hope you enjoy!",
	"The ultimate road trip playlist, trust me.",
	"These songs have been on repeat all week.",
	"Music that speaks to the soul. Give it a try!",
	"Late night jams. Perfect for winding down.",
	"A mix of old and new. Something for everyone!",
	"This playlist slaps. No skips guaranteed.",
	"Throwback vibes only. Who remembers these?",
	"Fresh finds from this week. Let me know your faves!",
	"Songs that defined a generation. Classics only.",
	"My guilty pleasure playlist. Don't judge!",
];

const COMMENTS = [
	"Love this playlist! Great taste!",
	"Bohemian Rhapsody is timeless. Nice picks!",
	"This is exactly what I needed today.",
	"Adding all of these to my library right now.",
	"Can't stop listening to this one!",
	"The vibes are immaculate.",
	"You always have the best playlists!",
	"That last track is a hidden gem.",
	"This takes me back. So nostalgic!",
	"Fire playlist! Keep them coming.",
	"I've been looking for songs like these.",
	"Perfect for my morning commute.",
	"Who else is listening on repeat?",
	"The track order is *chef's kiss*.",
	"Shared this with all my friends!",
	"These are some serious bops.",
	"I discovered so many new favorites from this.",
	"The transition between tracks is perfect.",
	"This playlist deserves more likes.",
	"You have impeccable taste in music.",
	"Been listening to this nonstop.",
	"Every single track slaps.",
	"This is going straight to my favorites.",
	"Instant follow. Your playlists are always fire.",
	"Can you make more playlists like this?",
];

// ── Main Seed ──────────────────────────────────────────────────────────────────

async function main() {
	console.log("Seeding database with demo data...\n");

	// Clean up existing data (order matters for FK constraints)
	await db.comment.deleteMany();
	await db.like.deleteMany();
	await db.socialPost.deleteMany();
	await db.follow.deleteMany();
	await db.swipeAction.deleteMany();
	await db.playlistSong.deleteMany();
	await db.playlist.deleteMany();
	await db.song.deleteMany();
	await db.session.deleteMany();
	await db.account.deleteMany();
	await db.verification.deleteMany();
	await db.user.deleteMany();

	// ── 1. Create Users ────────────────────────────────────────────────────────
	const users = await Promise.all(
		USERS.map((u, i) =>
			db.user.create({
				data: {
					id: `demo-user-${i}`,
					name: u.name,
					email: u.email,
					emailVerified: true,
					image: `https://i.pravatar.cc/150?u=demo${i}`,
					role: i === 0 ? "admin" : "user", // Alice is admin
					musicProvider: u.musicProvider,
					createdAt: daysAgo(randInt(1, 29)),
				},
			}),
		),
	);
	console.log(`  Created ${users.length} users (${users[0]!.name} is admin)`);

	// ── 2. Create Accounts (fake OAuth, no real tokens) ────────────────────────
	await Promise.all(
		users.map((u, i) => {
			const provider =
				USERS[i]!.musicProvider === "spotify" ? "spotify" : "lastfm";
			return db.account.create({
				data: {
					id: `demo-account-${i}`,
					userId: u.id,
					providerId: provider,
					accountId: `demo-${provider}-${i}`,
					accessToken: `demo-token-${i}`,
					refreshToken: provider === "spotify" ? `demo-refresh-${i}` : null,
					accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
					createdAt: u.createdAt,
				},
			});
		}),
	);
	console.log(`  Created ${users.length} accounts`);

	// ── 3. Create Songs ────────────────────────────────────────────────────────
	const songs = await Promise.all(
		SONGS.map((s, i) =>
			db.song.create({
				data: {
					id: `demo-song-${i}`,
					title: s.title,
					artist: s.artist,
					album: s.album,
					albumArt: `https://picsum.photos/seed/song${i}/300/300`,
					duration: s.duration,
					externalId: `demo:${s.artist.toLowerCase().replace(/\s+/g, "-")}:${s.title.toLowerCase().replace(/\s+/g, "-")}`,
					lastfmUrl: `https://www.last.fm/music/${encodeURIComponent(s.artist)}/_/${encodeURIComponent(s.title)}`,
				},
			}),
		),
	);
	console.log(`  Created ${songs.length} songs`);

	// ── 4. Create Playlists with Songs ─────────────────────────────────────────
	const playlists = [];
	let playlistIdx = 0;
	for (const user of users) {
		const count = randInt(1, 3);
		for (let p = 0; p < count; p++) {
			const template =
				PLAYLIST_TEMPLATES[playlistIdx % PLAYLIST_TEMPLATES.length]!;
			const playlistSongs = pickN(songs, randInt(3, 8));
			const playlist = await db.playlist.create({
				data: {
					id: `demo-playlist-${playlistIdx}`,
					name: template.name,
					description: template.description,
					coverImage: `https://picsum.photos/seed/playlist${playlistIdx}/300/300`,
					isPublic: rand() > 0.2, // 80% public
					userId: user.id,
					createdAt: daysAgo(randInt(0, 25)),
					songs: {
						create: playlistSongs.map((s, pos) => ({
							position: pos,
							songId: s.id,
						})),
					},
				},
			});
			playlists.push(playlist);
			playlistIdx++;
		}
	}
	console.log(`  Created ${playlists.length} playlists`);

	// ── 5. Create Swipe Actions (spread over 30 days) ──────────────────────────
	const actions = ["liked", "skipped", "superliked"];
	const actionWeights = [0.5, 0.35, 0.15]; // 50% liked, 35% skipped, 15% superliked
	const swipeData: Array<{
		userId: string;
		songId: string;
		action: string;
		createdAt: Date;
	}> = [];
	const swipeKeys = new Set<string>();

	for (const user of users) {
		const swipeCount = randInt(8, 25);
		const userSongs = pickN(songs, swipeCount);
		for (const song of userSongs) {
			const key = `${user.id}:${song.id}`;
			if (swipeKeys.has(key)) continue;
			swipeKeys.add(key);

			const r = rand();
			let action = actions[0]!;
			if (r > actionWeights[0]! + actionWeights[2]!) action = actions[1]!;
			else if (r > actionWeights[0]!) action = actions[2]!;

			swipeData.push({
				userId: user.id,
				songId: song.id,
				action,
				createdAt: daysAgo(randInt(0, 29)),
			});
		}
	}
	await db.swipeAction.createMany({ data: swipeData });
	console.log(`  Created ${swipeData.length} swipe actions`);

	// ── 6. Create Social Posts (share ~60% of public playlists) ─────────────────
	const publicPlaylists = playlists.filter((p) => p.isPublic);
	const postsToShare = pickN(
		publicPlaylists,
		Math.floor(publicPlaylists.length * 0.6),
	);
	const socialPosts = [];

	for (const playlist of postsToShare) {
		const post = await db.socialPost.create({
			data: {
				id: `demo-post-${socialPosts.length}`,
				caption: pick(CAPTIONS),
				userId: playlist.userId,
				playlistId: playlist.id,
				createdAt: daysAgo(randInt(0, 20)),
			},
		});
		socialPosts.push(post);
	}
	console.log(`  Created ${socialPosts.length} social posts`);

	// ── 7. Create Likes (random users like random posts) ───────────────────────
	const likeData: Array<{
		userId: string;
		socialPostId: string;
		createdAt: Date;
	}> = [];
	const likeKeys = new Set<string>();

	for (const post of socialPosts) {
		const likerCount = randInt(2, 12);
		const likers = pickN(
			users.filter((u) => u.id !== post.userId),
			likerCount,
		);
		for (const liker of likers) {
			const key = `${liker.id}:${post.id}`;
			if (likeKeys.has(key)) continue;
			likeKeys.add(key);
			likeData.push({
				userId: liker.id,
				socialPostId: post.id,
				createdAt: daysAgo(randInt(0, 15)),
			});
		}
	}
	await db.like.createMany({ data: likeData });
	console.log(`  Created ${likeData.length} likes`);

	// ── 8. Create Comments ─────────────────────────────────────────────────────
	const commentData: Array<{
		content: string;
		userId: string;
		socialPostId: string;
		createdAt: Date;
	}> = [];

	for (const post of socialPosts) {
		const commentCount = randInt(1, 6);
		const commenters = pickN(
			users.filter((u) => u.id !== post.userId),
			commentCount,
		);
		for (const commenter of commenters) {
			commentData.push({
				content: pick(COMMENTS),
				userId: commenter.id,
				socialPostId: post.id,
				createdAt: daysAgo(randInt(0, 14)),
			});
		}
	}
	await db.comment.createMany({ data: commentData });
	console.log(`  Created ${commentData.length} comments`);

	// ── 9. Create Follow Relationships ─────────────────────────────────────────
	const followData: Array<{
		followerId: string;
		followingId: string;
		createdAt: Date;
	}> = [];
	const followKeys = new Set<string>();

	for (const user of users) {
		const followCount = randInt(2, 8);
		const targets = pickN(
			users.filter((u) => u.id !== user.id),
			followCount,
		);
		for (const target of targets) {
			const key = `${user.id}:${target.id}`;
			if (followKeys.has(key)) continue;
			followKeys.add(key);
			followData.push({
				followerId: user.id,
				followingId: target.id,
				createdAt: daysAgo(randInt(0, 28)),
			});
		}
	}
	await db.follow.createMany({ data: followData });
	console.log(`  Created ${followData.length} follow relationships`);

	// ── Summary ────────────────────────────────────────────────────────────────
	console.log("\nSeed complete!");
	console.log(`  Users:        ${users.length} (1 admin: ${users[0]!.name})`);
	console.log(`  Songs:        ${songs.length}`);
	console.log(`  Playlists:    ${playlists.length}`);
	console.log(`  Swipes:       ${swipeData.length}`);
	console.log(`  Social Posts: ${socialPosts.length}`);
	console.log(`  Likes:        ${likeData.length}`);
	console.log(`  Comments:     ${commentData.length}`);
	console.log(`  Follows:      ${followData.length}`);
	console.log("\nDemo admin login: alice@demo.com (role: admin)");
}

main()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});
