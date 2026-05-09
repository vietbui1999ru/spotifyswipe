import { TRPCError } from "@trpc/server";

export enum ErrorCode {
	AUTH_FAILED = "AUTH_FAILED",
	UNAUTHORIZED = "UNAUTHORIZED",
	INVALID_INPUT = "INVALID_INPUT",
	NOT_FOUND = "NOT_FOUND",
	CONFLICT = "CONFLICT",
	LASTFM_API_ERROR = "LASTFM_API_ERROR",
	DB_ERROR = "DB_ERROR",
	RATE_LIMITED = "RATE_LIMITED",
	INTERNAL = "INTERNAL",
}

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
	[ErrorCode.AUTH_FAILED]: 401,
	[ErrorCode.UNAUTHORIZED]: 403,
	[ErrorCode.INVALID_INPUT]: 400,
	[ErrorCode.NOT_FOUND]: 404,
	[ErrorCode.CONFLICT]: 409,
	[ErrorCode.LASTFM_API_ERROR]: 502,
	[ErrorCode.DB_ERROR]: 500,
	[ErrorCode.RATE_LIMITED]: 429,
	[ErrorCode.INTERNAL]: 500,
};

const TRPC_CODE_MAP: Record<ErrorCode, TRPCError["code"]> = {
	[ErrorCode.AUTH_FAILED]: "UNAUTHORIZED",
	[ErrorCode.UNAUTHORIZED]: "FORBIDDEN",
	[ErrorCode.INVALID_INPUT]: "BAD_REQUEST",
	[ErrorCode.NOT_FOUND]: "NOT_FOUND",
	[ErrorCode.CONFLICT]: "CONFLICT",
	[ErrorCode.LASTFM_API_ERROR]: "INTERNAL_SERVER_ERROR",
	[ErrorCode.DB_ERROR]: "INTERNAL_SERVER_ERROR",
	[ErrorCode.RATE_LIMITED]: "TOO_MANY_REQUESTS",
	[ErrorCode.INTERNAL]: "INTERNAL_SERVER_ERROR",
};

export class AppError extends Error {
	public readonly code: ErrorCode;
	public readonly statusCode: number;
	public readonly details?: unknown;

	constructor(code: ErrorCode, message: string, details?: unknown) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.statusCode = ERROR_STATUS_MAP[code];
		this.details = details;
	}
}

export function toTRPCError(err: AppError): TRPCError {
	return new TRPCError({
		code: TRPC_CODE_MAP[err.code],
		message: err.message,
		cause: err,
	});
}

export function isTRPCError(err: unknown): err is TRPCError {
	return err instanceof TRPCError;
}
