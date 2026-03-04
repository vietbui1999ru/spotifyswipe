import { AppError, ErrorCode, toTRPCError } from "~/server/errors";
import type { PrismaClient } from "../../../generated/prisma";

/**
 * Verify a playlist exists and belongs to the given user.
 * Returns the playlist record on success.
 * Throws NOT_FOUND or UNAUTHORIZED TRPCError on failure.
 */
export async function assertPlaylistOwnership(
	db: PrismaClient,
	playlistId: string,
	userId: string,
) {
	const playlist = await db.playlist.findUnique({
		where: { id: playlistId },
		select: { id: true, userId: true },
	});

	if (!playlist) {
		throw toTRPCError(new AppError(ErrorCode.NOT_FOUND, "Playlist not found"));
	}

	if (playlist.userId !== userId) {
		throw toTRPCError(
			new AppError(ErrorCode.UNAUTHORIZED, "Not your playlist"),
		);
	}

	return playlist;
}

/** Song data shape for upsert operations. */
export interface SongData {
	title: string;
	artist: string;
	album?: string;
	albumArt?: string;
	lastfmUrl?: string;
	spotifyId?: string;
	spotifyUrl?: string;
	previewUrl?: string;
	externalId: string;
}

/**
 * Upsert a song by externalId — creates if not found, updates metadata if exists.
 * Accepts the Zod-validated songData input directly from tRPC procedures.
 */
export async function upsertSong(db: PrismaClient, songData: SongData) {
	const { externalId, ...fields } = songData;
	return db.song.upsert({
		where: { externalId },
		update: fields,
		create: { ...fields, externalId },
	});
}
