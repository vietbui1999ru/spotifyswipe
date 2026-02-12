import crypto from "node:crypto";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	context: string;
	requestId?: string;
	userId?: string;
	message: string;
	data?: unknown;
	duration?: number;
}

const COLORS: Record<LogLevel, string> = {
	debug: "\x1b[36m", // cyan
	info: "\x1b[32m", // green
	warn: "\x1b[33m", // yellow
	error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

const isDev = process.env.NODE_ENV !== "production";

function formatLog(entry: LogEntry): string {
	if (isDev) {
		const color = COLORS[entry.level];
		const duration = entry.duration ? ` (${entry.duration}ms)` : "";
		const data = entry.data ? `\n  ${JSON.stringify(entry.data, null, 2)}` : "";
		const reqId = entry.requestId ? ` [${entry.requestId.slice(0, 8)}]` : "";
		const uid = entry.userId ? ` user:${entry.userId.slice(0, 8)}` : "";
		return `${color}[${entry.level.toUpperCase()}]${RESET} ${entry.timestamp} [${entry.context}]${reqId}${uid} ${entry.message}${duration}${data}`;
	}
	return JSON.stringify(entry);
}

function emit(level: LogLevel, entry: LogEntry) {
	const formatted = formatLog(entry);
	switch (level) {
		case "error":
			console.error(formatted);
			break;
		case "warn":
			console.warn(formatted);
			break;
		case "debug":
			console.debug(formatted);
			break;
		default:
			console.log(formatted);
	}
}

export function createLogger(
	context: string,
	opts?: { requestId?: string; userId?: string },
) {
	const requestId = opts?.requestId ?? crypto.randomUUID();
	const userId = opts?.userId;

	function log(
		level: LogLevel,
		message: string,
		data?: unknown,
		duration?: number,
	) {
		emit(level, {
			timestamp: new Date().toISOString(),
			level,
			context,
			requestId,
			userId,
			message,
			data,
			duration,
		});
	}

	return {
		debug: (message: string, data?: unknown) => log("debug", message, data),
		info: (message: string, data?: unknown) => log("info", message, data),
		warn: (message: string, data?: unknown) => log("warn", message, data),
		error: (message: string, data?: unknown) => log("error", message, data),
		timed: (message: string, data?: unknown, duration?: number) =>
			log("info", message, data, duration),
		requestId,
		child: (childContext: string) =>
			createLogger(`${context}:${childContext}`, { requestId, userId }),
	};
}

export async function withTiming<T>(
	logger: ReturnType<typeof createLogger>,
	label: string,
	fn: () => Promise<T>,
): Promise<T> {
	const start = performance.now();
	try {
		const result = await fn();
		const duration = Math.round(performance.now() - start);
		logger.timed(`${label} completed`, undefined, duration);
		return result;
	} catch (err) {
		const duration = Math.round(performance.now() - start);
		logger.error(`${label} failed after ${duration}ms`, {
			error:
				err instanceof Error ? { message: err.message, stack: err.stack } : err,
		});
		throw err;
	}
}
