import crypto from "node:crypto";
import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

// ── Song data (60 tracks, 10 per genre) ────────────────────────────────────────

interface SongDef {
	title: string;
	artist: string;
	album: string;
	duration: number;
	// externalId and URLs are derived at runtime
}

// Indices 0-9: Indie / Alternative
const INDIE_SONGS: SongDef[] = [
	{
		title: "Do I Wanna Know?",
		artist: "Arctic Monkeys",
		album: "AM",
		duration: 272,
	},
	{
		title: "The Less I Know The Better",
		artist: "Tame Impala",
		album: "Currents",
		duration: 216,
	},
	{ title: "Creep", artist: "Radiohead", album: "Pablo Honey", duration: 236 },
	{
		title: "Reptilia",
		artist: "The Strokes",
		album: "Room on Fire",
		duration: 224,
	},
	{
		title: "Chamber of Reflection",
		artist: "Mac DeMarco",
		album: "Salad Days",
		duration: 268,
	},
	{ title: "Wake Up", artist: "Arcade Fire", album: "Funeral", duration: 345 },
	{
		title: "A-Punk",
		artist: "Vampire Weekend",
		album: "Vampire Weekend",
		duration: 133,
	},
	{
		title: "Breezeblocks",
		artist: "Alt-J",
		album: "An Awesome Wave",
		duration: 228,
	},
	{
		title: "Heat Waves",
		artist: "Glass Animals",
		album: "Dreamland",
		duration: 238,
	},
	{
		title: "Take Me to Church",
		artist: "Hozier",
		album: "Hozier",
		duration: 241,
	},
];

// Indices 10-19: Hip-Hop
const HIPHOP_SONGS: SongDef[] = [
	{ title: "HUMBLE.", artist: "Kendrick Lamar", album: "DAMN.", duration: 177 },
	{
		title: "See You Again",
		artist: "Tyler the Creator",
		album: "Flower Boy",
		duration: 239,
	},
	{
		title: "Doomsday",
		artist: "MF DOOM",
		album: "Operation: Doomsday",
		duration: 225,
	},
	{
		title: "No Role Modelz",
		artist: "J. Cole",
		album: "2014 Forest Hills Drive",
		duration: 293,
	},
	{
		title: "Stronger",
		artist: "Kanye West",
		album: "Graduation",
		duration: 312,
	},
	{
		title: "SICKO MODE",
		artist: "Travis Scott",
		album: "Astroworld",
		duration: 312,
	},
	{
		title: "Praise The Lord (Da Shine)",
		artist: "A$AP Rocky",
		album: "Testing",
		duration: 200,
	},
	{
		title: "Redbone",
		artist: "Childish Gambino",
		album: "Awaken, My Love!",
		duration: 327,
	},
	{
		title: "Surround Sound",
		artist: "JID",
		album: "The Forever Story",
		duration: 253,
	},
	{
		title: "Clout Cobain",
		artist: "Denzel Curry",
		album: "TA13OO",
		duration: 209,
	},
];

// Indices 20-29: Electronic
const ELECTRONIC_SONGS: SongDef[] = [
	{
		title: "Around the World",
		artist: "Daft Punk",
		album: "Homework",
		duration: 429,
	},
	{
		title: "Windowlicker",
		artist: "Aphex Twin",
		album: "Windowlicker",
		duration: 397,
	},
	{ title: "Kerala", artist: "Bonobo", album: "Migration", duration: 274 },
	{ title: "Never Be Like You", artist: "Flume", album: "Skin", duration: 240 },
	{
		title: "A Moment Apart",
		artist: "ODESZA",
		album: "A Moment Apart",
		duration: 296,
	},
	{ title: "Awake", artist: "Tycho", album: "Awake", duration: 273 },
	{ title: "Latch", artist: "Disclosure", album: "Settle", duration: 302 },
	{
		title: "Can't Do Without You",
		artist: "Caribou",
		album: "Our Love",
		duration: 252,
	},
	{
		title: "Baby",
		artist: "Four Tet",
		album: "Beautiful Rewind",
		duration: 389,
	},
	{ title: "Gosh", artist: "Jamie xx", album: "In Colour", duration: 329 },
];

// Indices 30-39: R&B / Soul
const RNB_SONGS: SongDef[] = [
	{ title: "Nights", artist: "Frank Ocean", album: "Blonde", duration: 309 },
	{ title: "Kill Bill", artist: "SZA", album: "SOS", duration: 153 },
	{
		title: "Best Part",
		artist: "Daniel Caesar",
		album: "Freudian",
		duration: 213,
	},
	{
		title: "Blinding Lights",
		artist: "The Weeknd",
		album: "After Hours",
		duration: 200,
	},
	{
		title: "Cranes in the Sky",
		artist: "Solange",
		album: "A Seat at the Table",
		duration: 234,
	},
	{ title: "Best Part", artist: "H.E.R.", album: "H.E.R.", duration: 213 },
	{
		title: "While We're Young",
		artist: "Jhene Aiko",
		album: "Trip",
		duration: 259,
	},
	{
		title: "Playing Games",
		artist: "Summer Walker",
		album: "Over It",
		duration: 178,
	},
	{
		title: "Wasteland",
		artist: "Brent Faiyaz",
		album: "Wasteland",
		duration: 205,
	},
	{ title: "Tyrone", artist: "Erykah Badu", album: "Live", duration: 340 },
];

// Indices 40-49: Rock / Classic
const ROCK_SONGS: SongDef[] = [
	{
		title: "Stairway to Heaven",
		artist: "Led Zeppelin",
		album: "Led Zeppelin IV",
		duration: 482,
	},
	{
		title: "Comfortably Numb",
		artist: "Pink Floyd",
		album: "The Wall",
		duration: 382,
	},
	{
		title: "Bohemian Rhapsody",
		artist: "Queen",
		album: "A Night at the Opera",
		duration: 354,
	},
	{
		title: "Smells Like Teen Spirit",
		artist: "Nirvana",
		album: "Nevermind",
		duration: 301,
	},
	{
		title: "Come Together",
		artist: "The Beatles",
		album: "Abbey Road",
		duration: 259,
	},
	{ title: "Heroes", artist: "David Bowie", album: "Heroes", duration: 367 },
	{
		title: "Purple Haze",
		artist: "Jimi Hendrix",
		album: "Are You Experienced",
		duration: 170,
	},
	{ title: "Dreams", artist: "Fleetwood Mac", album: "Rumours", duration: 257 },
	{
		title: "Riders on the Storm",
		artist: "The Doors",
		album: "L.A. Woman",
		duration: 428,
	},
	{
		title: "Back in Black",
		artist: "AC/DC",
		album: "Back in Black",
		duration: 255,
	},
];

// Indices 50-59: Pop
const POP_SONGS: SongDef[] = [
	{
		title: "Levitating",
		artist: "Dua Lipa",
		album: "Future Nostalgia",
		duration: 203,
	},
	{
		title: "bad guy",
		artist: "Billie Eilish",
		album: "When We All Fall Asleep, Where Do We Go?",
		duration: 194,
	},
	{
		title: "As It Was",
		artist: "Harry Styles",
		album: "Harry's House",
		duration: 167,
	},
	{ title: "Say So", artist: "Doja Cat", album: "Hot Pink", duration: 238 },
	{
		title: "drivers license",
		artist: "Olivia Rodrigo",
		album: "SOUR",
		duration: 242,
	},
	{ title: "Royals", artist: "Lorde", album: "Pure Heroine", duration: 191 },
	{
		title: "About Damn Time",
		artist: "Lizzo",
		album: "Special",
		duration: 193,
	},
	{
		title: "Run Away With Me",
		artist: "Carly Rae Jepsen",
		album: "Emotion",
		duration: 255,
	},
	{ title: "Boom Clap", artist: "Charli XCX", album: "Sucker", duration: 183 },
	{
		title: "Flowers",
		artist: "Miley Cyrus",
		album: "Endless Summer Vacation",
		duration: 200,
	},
];

// Flat array of all 60 songs in genre order (indices 0-9 indie, 10-19 hip-hop, etc.)
const ALL_SONGS: SongDef[] = [
	...INDIE_SONGS, // 0-9
	...HIPHOP_SONGS, // 10-19
	...ELECTRONIC_SONGS, // 20-29
	...RNB_SONGS, // 30-39
	...ROCK_SONGS, // 40-49
	...POP_SONGS, // 50-59
];

function makeExternalId(artist: string, title: string): string {
	return `${artist.toLowerCase()}:${title.toLowerCase()}`;
}

function makeLastfmUrl(artist: string, title: string): string {
	return `https://www.last.fm/music/${encodeURIComponent(artist)}/_/${encodeURIComponent(title)}`;
}

function makeAlbumArt(artist: string): string {
	return `https://ui-avatars.com/api/?name=${encodeURIComponent(artist)}&background=random&size=300&format=png`;
}

// ── Persona definitions ────────────────────────────────────────────────────────

interface PlaylistDef {
	name: string;
	description: string;
	songIndices: number[];
}

interface PersonaDef {
	name: string;
	email: string;
	playlists: [PlaylistDef, PlaylistDef]; // exactly 2 playlists per persona
	swipeIndices: number[]; // songs to swipe (20-28 entries)
}

// Swipe action distribution helpers
// ~60% liked, ~30% skipped, ~10% superliked
function swipeAction(idx: number): "liked" | "skipped" | "superliked" {
	const r = idx % 10;
	if (r < 6) return "liked";
	if (r < 9) return "skipped";
	return "superliked";
}

const PERSONAS: PersonaDef[] = [
	{
		name: "Alex Rivera",
		email: "demo-persona-alex@spotiswipe.demo",
		playlists: [
			{
				name: "Midnight Drive",
				description: "Indie anthems for late-night roads",
				songIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
			},
			{
				name: "Festival Season",
				description: "Electronic beats to lose yourself in",
				songIndices: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
			},
		],
		// Indie (0-9) + Electronic (20-29) = 20 swipe songs
		swipeIndices: [
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
		],
	},
	{
		name: "Jordan Kim",
		email: "demo-persona-jordan@spotiswipe.demo",
		playlists: [
			{
				name: "Late Night R&B",
				description: "Smooth soul for the early hours",
				songIndices: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
			},
			{
				name: "Bars Only",
				description: "Hip-hop essentials, no filler",
				songIndices: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
			},
		],
		// Hip-Hop (10-19) + R&B (30-39) = 20 swipe songs
		swipeIndices: [
			10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 30, 31, 32, 33, 34, 35, 36, 37,
			38, 39,
		],
	},
	{
		name: "Sam Chen",
		email: "demo-persona-sam@spotiswipe.demo",
		playlists: [
			{
				name: "Deep Focus",
				description: "Electronic textures for flow states",
				songIndices: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
			},
			{
				name: "Weekend Energy",
				description: "Pop bangers to kick off the weekend",
				songIndices: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
			},
		],
		// Electronic (20-29) + Pop (50-59) = 20 swipe songs, add 4 extras for variety
		swipeIndices: [
			20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 50, 51, 52, 53, 54, 55, 56, 57,
			58, 59, 0, 1, 5, 10,
		],
	},
	{
		name: "Maya Patel",
		email: "demo-persona-maya@spotiswipe.demo",
		playlists: [
			{
				name: "Vinyl Classics",
				description: "Rock legends pressed in wax",
				songIndices: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
			},
			{
				name: "New Discoveries",
				description: "Fresh indie finds worth obsessing over",
				songIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
			},
		],
		// Rock (40-49) + Indie (0-9) = 20 swipe songs, add 8 extras for 28 total
		swipeIndices: [
			40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 30,
			31, 20, 21, 50, 51, 10, 11,
		],
	},
	{
		name: "Chris Okafor",
		email: "demo-persona-chris@spotiswipe.demo",
		playlists: [
			{
				name: "Smooth Vibes",
				description: "R&B and soul to set the mood",
				songIndices: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
			},
			{
				name: "Workout Mix",
				description: "Hip-hop to push through any set",
				songIndices: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
			},
		],
		// R&B (30-39) + Hip-Hop (10-19) = 20 swipe songs, add 4 extras
		swipeIndices: [
			30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 10, 11, 12, 13, 14, 15, 16, 17,
			18, 19, 50, 51, 0, 1,
		],
	},
	{
		name: "Taylor Nguyen",
		email: "demo-persona-taylor@spotiswipe.demo",
		playlists: [
			{
				name: "Feel Good Hits",
				description: "Pop perfection for any occasion",
				songIndices: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
			},
			{
				name: "Chill Beats",
				description: "Electronic downtempo for easy days",
				songIndices: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
			},
		],
		// Pop (50-59) + Electronic (20-29) = 20 swipe songs, add 5 extras
		swipeIndices: [
			50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 20, 21, 22, 23, 24, 25, 26, 27,
			28, 29, 0, 1, 30,
		],
	},
];

// ── Comment bank ──────────────────────────────────────────────────────────────

const COMMENT_BANK = [
	"This playlist is fire 🔥",
	"Adding this to my rotation",
	"Great taste!",
	"Love the vibe ✨",
	"Perfect study playlist",
	"Need more like this",
	"Absolute banger collection",
	"This is exactly what I needed",
	"Your music taste is elite",
	"Been looking for something like this",
];

// ── Caption bank ──────────────────────────────────────────────────────────────

const CAPTION_BANK = [
	"Hand-picked every single track — no fillers, I promise.",
	"This one took me a while to build. Hope you enjoy it as much as I do.",
	"The kind of playlist you put on and forget to skip.",
	"Sharing this because it deserves more ears.",
	"Late-night sessions, good music. That's all.",
	"Built this for long drives. Highly recommend.",
];

// ── Seeding functions ─────────────────────────────────────────────────────────

async function seedSongs() {
	console.log("Seeding songs...");

	const upserts = ALL_SONGS.map((song) => {
		const externalId = makeExternalId(song.artist, song.title);
		return db.song.upsert({
			where: { externalId },
			update: {
				title: song.title,
				artist: song.artist,
				album: song.album,
				albumArt: makeAlbumArt(song.artist),
				lastfmUrl: makeLastfmUrl(song.artist, song.title),
				duration: song.duration,
				spotifyId: null,
				spotifyUrl: null,
				previewUrl: null,
			},
			create: {
				title: song.title,
				artist: song.artist,
				album: song.album,
				albumArt: makeAlbumArt(song.artist),
				lastfmUrl: makeLastfmUrl(song.artist, song.title),
				duration: song.duration,
				externalId,
				spotifyId: null,
				spotifyUrl: null,
				previewUrl: null,
			},
		});
	});

	// Batch in groups of 10 to keep transaction size manageable
	const results: { id: string }[] = [];
	for (let i = 0; i < upserts.length; i += 10) {
		const batch = upserts.slice(i, i + 10);
		const batchResults = await db.$transaction(batch);
		results.push(...batchResults);
	}

	console.log(`  Upserted ${results.length} songs.`);
	return results;
}

async function seedPersonas(songRecords: { id: string }[]) {
	console.log("Seeding personas...");

	const createdUsers: Array<{
		id: string;
		email: string;
		name: string;
		index: number;
	}> = [];

	for (let pIdx = 0; pIdx < PERSONAS.length; pIdx++) {
		const persona = PERSONAS[pIdx]!;

		// Idempotent: skip if persona already exists
		const existing = await db.user.findUnique({
			where: { email: persona.email },
		});
		if (existing) {
			console.log(`  Skipping ${persona.name} — already exists.`);
			createdUsers.push({
				id: existing.id,
				email: existing.email,
				name: existing.name,
				index: pIdx,
			});
			continue;
		}

		const image = `https://ui-avatars.com/api/?name=${encodeURIComponent(persona.name)}&background=random&size=200`;

		const user = await db.user.create({
			data: {
				name: persona.name,
				email: persona.email,
				emailVerified: true,
				image,
				isDemo: true,
				demoExpiresAt: null, // permanent seed personas; never expire
				musicProvider: "auto",
			},
		});

		// Create demo account so OnboardingGuard is satisfied
		await db.account.create({
			data: {
				userId: user.id,
				providerId: "demo",
				accountId: crypto.randomUUID(),
			},
		});

		createdUsers.push({
			id: user.id,
			email: user.email,
			name: user.name,
			index: pIdx,
		});
		console.log(`  Created persona: ${persona.name}`);
	}

	return createdUsers;
}

async function seedPlaylists(
	personaUsers: Array<{
		id: string;
		email: string;
		name: string;
		index: number;
	}>,
	songRecords: { id: string }[],
) {
	console.log("Seeding playlists...");

	// Returns the first playlist per persona (used for social posts)
	const firstPlaylists: Array<{ id: string; userId: string }> = [];

	for (const personaUser of personaUsers) {
		const persona = PERSONAS[personaUser.index]!;

		for (let plIdx = 0; plIdx < persona.playlists.length; plIdx++) {
			const playlistDef = persona.playlists[plIdx]!;

			// Check if this playlist already exists for this user by name
			const existing = await db.playlist.findFirst({
				where: { userId: personaUser.id, name: playlistDef.name },
			});

			if (existing) {
				console.log(
					`  Skipping playlist "${playlistDef.name}" for ${personaUser.name} — already exists.`,
				);
				if (plIdx === 0)
					firstPlaylists.push({ id: existing.id, userId: personaUser.id });
				continue;
			}

			const playlist = await db.playlist.create({
				data: {
					name: playlistDef.name,
					description: playlistDef.description,
					isPublic: true,
					userId: personaUser.id,
					songs: {
						create: playlistDef.songIndices.map((songIdx, position) => ({
							position,
							songId: songRecords[songIdx]!.id,
						})),
					},
				},
			});

			console.log(
				`  Created playlist "${playlistDef.name}" for ${personaUser.name} (${playlistDef.songIndices.length} songs)`,
			);
			if (plIdx === 0)
				firstPlaylists.push({ id: playlist.id, userId: personaUser.id });
		}
	}

	return firstPlaylists;
}

async function seedSwipeActions(
	personaUsers: Array<{
		id: string;
		email: string;
		name: string;
		index: number;
	}>,
	songRecords: { id: string }[],
) {
	console.log("Seeding swipe actions...");

	let totalCreated = 0;

	for (const personaUser of personaUsers) {
		const persona = PERSONAS[personaUser.index]!;

		// Collect swipe data, skipping already-swiped songs
		const alreadySwiped = await db.swipeAction.findMany({
			where: { userId: personaUser.id },
			select: { songId: true },
		});
		const alreadySwipedIds = new Set(alreadySwiped.map((s) => s.songId));

		const swipeData: Array<{ userId: string; songId: string; action: string }> =
			[];
		const seenInBatch = new Set<string>();

		for (let i = 0; i < persona.swipeIndices.length; i++) {
			const songIdx = persona.swipeIndices[i]!;
			const songId = songRecords[songIdx]!.id;

			if (alreadySwipedIds.has(songId) || seenInBatch.has(songId)) continue;
			seenInBatch.add(songId);

			swipeData.push({
				userId: personaUser.id,
				songId,
				action: swipeAction(i),
			});
		}

		if (swipeData.length > 0) {
			await db.swipeAction.createMany({ data: swipeData });
			totalCreated += swipeData.length;
			console.log(
				`  Created ${swipeData.length} swipe actions for ${personaUser.name}`,
			);
		}
	}

	console.log(`  Total swipe actions created: ${totalCreated}`);
}

async function seedSocialActivity(
	personaUsers: Array<{
		id: string;
		email: string;
		name: string;
		index: number;
	}>,
	firstPlaylists: Array<{ id: string; userId: string }>,
) {
	console.log("Seeding social activity...");

	// ── Social Posts ────────────────────────────────────────────────────────────
	// Each persona shares their first playlist
	const socialPosts: Array<{ id: string; userId: string }> = [];
	let captionIdx = 0;

	for (const { id: playlistId, userId } of firstPlaylists) {
		// Idempotent: skip if post already exists for this playlist
		const existing = await db.socialPost.findUnique({ where: { playlistId } });
		if (existing) {
			console.log(
				`  Skipping social post for playlist ${playlistId} — already exists.`,
			);
			socialPosts.push({ id: existing.id, userId: existing.userId });
			continue;
		}

		const post = await db.socialPost.create({
			data: {
				caption: CAPTION_BANK[captionIdx % CAPTION_BANK.length],
				userId,
				playlistId,
			},
		});
		socialPosts.push({ id: post.id, userId: post.userId });
		captionIdx++;
	}
	console.log(`  Created/found ${socialPosts.length} social posts.`);

	// ── Likes: 4 random other personas like each post ──────────────────────────
	let totalLikes = 0;
	for (const post of socialPosts) {
		// Pick 4 personas who are not the post author
		const otherUsers = personaUsers.filter((u) => u.id !== post.userId);
		const likers = otherUsers.slice(0, 4);

		for (const liker of likers) {
			// Idempotent: upsert-style — ignore if like already exists
			const existing = await db.like.findUnique({
				where: {
					userId_socialPostId: { userId: liker.id, socialPostId: post.id },
				},
			});
			if (existing) continue;

			await db.like.create({
				data: { userId: liker.id, socialPostId: post.id },
			});
			totalLikes++;
		}
	}
	console.log(`  Created ${totalLikes} likes.`);

	// ── Comments: 3 per post from rotating other personas ─────────────────────
	let totalComments = 0;
	for (let postIdx = 0; postIdx < socialPosts.length; postIdx++) {
		const post = socialPosts[postIdx]!;
		const otherUsers = personaUsers.filter((u) => u.id !== post.userId);

		// Pick 3 commenters (cycle through otherUsers)
		const commenters = [
			otherUsers[postIdx % otherUsers.length]!,
			otherUsers[(postIdx + 1) % otherUsers.length]!,
			otherUsers[(postIdx + 2) % otherUsers.length]!,
		];

		for (let cIdx = 0; cIdx < commenters.length; cIdx++) {
			const commenter = commenters[cIdx]!;
			const commentText =
				COMMENT_BANK[(postIdx * 3 + cIdx) % COMMENT_BANK.length]!;

			await db.comment.create({
				data: {
					content: commentText,
					userId: commenter.id,
					socialPostId: post.id,
				},
			});
			totalComments++;
		}
	}
	console.log(`  Created ${totalComments} comments.`);

	// ── Follow network: each persona follows 3-4 others ───────────────────────
	let totalFollows = 0;
	// Pre-defined follow pairs to ensure a connected graph with no duplicates
	// Each persona follows the next 3-4 in a round-robin pattern
	const followPairs: Array<[number, number]> = [
		[0, 1],
		[0, 2],
		[0, 3],
		[0, 4], // Alex → Jordan, Sam, Maya, Chris
		[1, 2],
		[1, 3],
		[1, 4],
		[1, 5], // Jordan → Sam, Maya, Chris, Taylor
		[2, 3],
		[2, 4],
		[2, 5],
		[2, 0], // Sam → Maya, Chris, Taylor, Alex
		[3, 4],
		[3, 5],
		[3, 0], // Maya → Chris, Taylor, Alex
		[4, 5],
		[4, 0],
		[4, 1], // Chris → Taylor, Alex, Jordan
		[5, 0],
		[5, 1],
		[5, 2], // Taylor → Alex, Jordan, Sam
	];

	for (const [followerId, followingId] of followPairs) {
		const follower = personaUsers[followerId];
		const following = personaUsers[followingId];
		if (!follower || !following) continue;

		const existing = await db.follow.findUnique({
			where: {
				followerId_followingId: {
					followerId: follower.id,
					followingId: following.id,
				},
			},
		});
		if (existing) continue;

		await db.follow.create({
			data: { followerId: follower.id, followingId: following.id },
		});
		totalFollows++;
	}
	console.log(`  Created ${totalFollows} follow relationships.`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
	console.log("\nSpotiSwipe Demo Seed\n");

	try {
		// 1. Songs
		const songRecords = await seedSongs();

		// 2. Personas (users + accounts)
		const personaUsers = await seedPersonas(songRecords);

		// 3. Playlists + PlaylistSongs
		const firstPlaylists = await seedPlaylists(personaUsers, songRecords);

		// 4. Swipe actions
		await seedSwipeActions(personaUsers, songRecords);

		// 5. Social activity (posts, likes, comments, follows)
		await seedSocialActivity(personaUsers, firstPlaylists);

		console.log("\nDemo seed complete!");
		console.log(`  Songs:     ${songRecords.length}`);
		console.log(`  Personas:  ${personaUsers.length}`);
		console.log(`  Posts:     ${firstPlaylists.length}`);
	} catch (err) {
		console.error("Demo seed failed:", err);
		process.exit(1);
	} finally {
		await db.$disconnect();
	}
}

main();
