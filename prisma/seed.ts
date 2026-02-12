import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

async function main() {
	console.log("Seeding database...");

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
	await db.verificationToken.deleteMany();
	await db.user.deleteMany();

	// --- Users ---
	const [alice, bob, carol] = await Promise.all([
		db.user.create({
			data: {
				id: "seed-user-alice",
				name: "Alice",
				email: "alice@example.com",
				image: "https://i.pravatar.cc/150?u=alice",
			},
		}),
		db.user.create({
			data: {
				id: "seed-user-bob",
				name: "Bob",
				email: "bob@example.com",
				image: "https://i.pravatar.cc/150?u=bob",
			},
		}),
		db.user.create({
			data: {
				id: "seed-user-carol",
				name: "Carol",
				email: "carol@example.com",
				image: "https://i.pravatar.cc/150?u=carol",
			},
		}),
	]);

	// --- Songs ---
	const songsData = [
		{
			id: "seed-song-1",
			title: "Bohemian Rhapsody",
			artist: "Queen",
			album: "A Night at the Opera",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/3f3151c6ae05f86dae3df7a3cad48c0f.png",
			lastfmUrl: "https://www.last.fm/music/Queen/_/Bohemian+Rhapsody",
			duration: 354,
			externalId: "lastfm:queen:bohemian-rhapsody",
		},
		{
			id: "seed-song-2",
			title: "Stairway to Heaven",
			artist: "Led Zeppelin",
			album: "Led Zeppelin IV",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/cd6fb09fd26b4f70909fb4a9c5a0d37f.png",
			lastfmUrl: "https://www.last.fm/music/Led+Zeppelin/_/Stairway+to+Heaven",
			duration: 482,
			externalId: "lastfm:led-zeppelin:stairway-to-heaven",
		},
		{
			id: "seed-song-3",
			title: "Hotel California",
			artist: "Eagles",
			album: "Hotel California",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/8cf7f80b8b6947ec9a3da6d7e49e7a8c.png",
			lastfmUrl: "https://www.last.fm/music/Eagles/_/Hotel+California",
			duration: 391,
			externalId: "lastfm:eagles:hotel-california",
		},
		{
			id: "seed-song-4",
			title: "Comfortably Numb",
			artist: "Pink Floyd",
			album: "The Wall",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/ab2e68edab6c488ea13f85e5f5e7aaeb.png",
			lastfmUrl: "https://www.last.fm/music/Pink+Floyd/_/Comfortably+Numb",
			duration: 382,
			externalId: "lastfm:pink-floyd:comfortably-numb",
		},
		{
			id: "seed-song-5",
			title: "Imagine",
			artist: "John Lennon",
			album: "Imagine",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/bdc90e13b00a41d3cae8b3f2f3e0d2ab.png",
			lastfmUrl: "https://www.last.fm/music/John+Lennon/_/Imagine",
			duration: 187,
			externalId: "lastfm:john-lennon:imagine",
		},
		{
			id: "seed-song-6",
			title: "Smells Like Teen Spirit",
			artist: "Nirvana",
			album: "Nevermind",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/b74b8d5bca6a4d10a3cc0fea8b1e0f7a.png",
			lastfmUrl: "https://www.last.fm/music/Nirvana/_/Smells+Like+Teen+Spirit",
			duration: 301,
			externalId: "lastfm:nirvana:smells-like-teen-spirit",
		},
		{
			id: "seed-song-7",
			title: "Wonderwall",
			artist: "Oasis",
			album: "(What's the Story) Morning Glory?",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/b5a3c246c24d488cb994f95b7e98b6e2.png",
			lastfmUrl: "https://www.last.fm/music/Oasis/_/Wonderwall",
			duration: 258,
			externalId: "lastfm:oasis:wonderwall",
		},
		{
			id: "seed-song-8",
			title: "Let It Be",
			artist: "The Beatles",
			album: "Let It Be",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/5ae1b6c8e9214d7a8c6e0c3b2d5a8f7e.png",
			lastfmUrl: "https://www.last.fm/music/The+Beatles/_/Let+It+Be",
			duration: 243,
			externalId: "lastfm:the-beatles:let-it-be",
		},
		{
			id: "seed-song-9",
			title: "Purple Rain",
			artist: "Prince",
			album: "Purple Rain",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/d3b2e5c8f9a14d7a8c6e0c3b2d5a8f7e.png",
			lastfmUrl: "https://www.last.fm/music/Prince/_/Purple+Rain",
			duration: 520,
			externalId: "lastfm:prince:purple-rain",
		},
		{
			id: "seed-song-10",
			title: "Billie Jean",
			artist: "Michael Jackson",
			album: "Thriller",
			albumArt:
				"https://lastfm.freetls.fastly.net/i/u/300x300/a2b3c4d5e6f7890a1b2c3d4e5f6a7b8c.png",
			lastfmUrl: "https://www.last.fm/music/Michael+Jackson/_/Billie+Jean",
			duration: 294,
			externalId: "lastfm:michael-jackson:billie-jean",
		},
	];

	await Promise.all(songsData.map((s) => db.song.create({ data: s })));

	// Song ID helpers (deterministic from songsData)
	const songId = (n: number) => songsData[n]?.id ?? "";

	// --- Playlists ---
	const alicePlaylist1 = await db.playlist.create({
		data: {
			id: "seed-playlist-a1",
			name: "Classic Rock Essentials",
			description: "The best classic rock tracks of all time",
			isPublic: true,
			userId: alice.id,
			songs: {
				create: [
					{ position: 0, songId: songId(0) },
					{ position: 1, songId: songId(1) },
					{ position: 2, songId: songId(2) },
					{ position: 3, songId: songId(3) },
				],
			},
		},
	});

	await db.playlist.create({
		data: {
			id: "seed-playlist-a2",
			name: "Chill Vibes",
			description: "Relaxing tunes for a quiet evening",
			isPublic: true,
			userId: alice.id,
			songs: {
				create: [
					{ position: 0, songId: songId(4) },
					{ position: 1, songId: songId(7) },
				],
			},
		},
	});

	const bobPlaylist1 = await db.playlist.create({
		data: {
			id: "seed-playlist-b1",
			name: "90s Grunge Mix",
			description: "The grunge era's finest",
			isPublic: true,
			userId: bob.id,
			songs: {
				create: [
					{ position: 0, songId: songId(5) },
					{ position: 1, songId: songId(6) },
					{ position: 2, songId: songId(3) },
				],
			},
		},
	});

	await db.playlist.create({
		data: {
			id: "seed-playlist-b2",
			name: "Pop Legends",
			description: "Iconic pop tracks",
			isPublic: false,
			userId: bob.id,
			songs: {
				create: [
					{ position: 0, songId: songId(9) },
					{ position: 1, songId: songId(8) },
				],
			},
		},
	});

	await db.playlist.create({
		data: {
			id: "seed-playlist-c1",
			name: "All-Time Favorites",
			description: "My personal top picks",
			isPublic: true,
			userId: carol.id,
			songs: {
				create: [
					{ position: 0, songId: songId(0) },
					{ position: 1, songId: songId(4) },
					{ position: 2, songId: songId(8) },
					{ position: 3, songId: songId(9) },
					{ position: 4, songId: songId(5) },
				],
			},
		},
	});

	// --- Swipe Actions ---
	await db.swipeAction.createMany({
		data: [
			{ userId: alice.id, songId: songId(0), action: "liked" },
			{ userId: alice.id, songId: songId(1), action: "liked" },
			{ userId: alice.id, songId: songId(5), action: "skipped" },
			{ userId: alice.id, songId: songId(9), action: "superliked" },
			{ userId: bob.id, songId: songId(5), action: "liked" },
			{ userId: bob.id, songId: songId(6), action: "liked" },
			{ userId: bob.id, songId: songId(0), action: "skipped" },
			{ userId: carol.id, songId: songId(0), action: "superliked" },
			{ userId: carol.id, songId: songId(4), action: "liked" },
			{ userId: carol.id, songId: songId(7), action: "skipped" },
		],
	});

	// --- Social Posts ---
	const post1 = await db.socialPost.create({
		data: {
			id: "seed-post-1",
			caption:
				"Check out my classic rock playlist! These tracks never get old.",
			userId: alice.id,
			playlistId: alicePlaylist1.id,
		},
	});

	const post2 = await db.socialPost.create({
		data: {
			id: "seed-post-2",
			caption: "Grunge forever. This playlist takes me back to the 90s.",
			userId: bob.id,
			playlistId: bobPlaylist1.id,
		},
	});

	// --- Likes ---
	await db.like.createMany({
		data: [
			{ userId: bob.id, socialPostId: post1.id },
			{ userId: carol.id, socialPostId: post1.id },
			{ userId: alice.id, socialPostId: post2.id },
			{ userId: carol.id, socialPostId: post2.id },
		],
	});

	// --- Comments ---
	await db.comment.createMany({
		data: [
			{
				content: "Love this playlist! Bohemian Rhapsody is timeless.",
				userId: bob.id,
				socialPostId: post1.id,
			},
			{
				content: "Great taste! Stairway to Heaven is my all-time favorite.",
				userId: carol.id,
				socialPostId: post1.id,
			},
			{
				content: "Nirvana changed everything. Solid picks!",
				userId: alice.id,
				socialPostId: post2.id,
			},
		],
	});

	// --- Follow Relationships ---
	await db.follow.createMany({
		data: [
			{ followerId: alice.id, followingId: bob.id },
			{ followerId: alice.id, followingId: carol.id },
			{ followerId: bob.id, followingId: alice.id },
			{ followerId: carol.id, followingId: alice.id },
			{ followerId: carol.id, followingId: bob.id },
		],
	});

	console.log("Seed complete:");
	console.log("  - 3 users (alice, bob, carol)");
	console.log("  - 10 songs");
	console.log("  - 5 playlists with songs");
	console.log("  - 10 swipe actions");
	console.log("  - 2 social posts with likes and comments");
	console.log("  - 5 follow relationships");
}

main()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});
