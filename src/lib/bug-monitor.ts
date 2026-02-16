"use client";

/**
 * Client-side bug monitor.
 * Captures runtime errors, unhandled rejections, and navigation issues.
 * Sends reports to /api/bugs for server-side markdown logging.
 */

export interface BugReport {
	timestamp: string;
	type:
		| "runtime"
		| "unhandled-rejection"
		| "react-error"
		| "navigation"
		| "api";
	message: string;
	stack?: string;
	url: string;
	userAgent: string;
	metadata?: Record<string, unknown>;
}

const STORAGE_KEY = "spotiswipe:bug-reports";
const MAX_LOCAL_REPORTS = 50;

/** Collect a bug report and send it to the server. */
export async function reportBug(
	report: Omit<BugReport, "timestamp" | "url" | "userAgent">,
): Promise<void> {
	const fullReport: BugReport = {
		...report,
		timestamp: new Date().toISOString(),
		url: typeof window !== "undefined" ? window.location.href : "unknown",
		userAgent:
			typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
	};

	// Save locally first (in case server is unreachable)
	saveLocally(fullReport);

	// Send to server
	try {
		await fetch("/api/bugs", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(fullReport),
		});
	} catch {
		console.warn("[BugMonitor] Failed to send bug report to server");
	}
}

function saveLocally(report: BugReport): void {
	try {
		const existing = JSON.parse(
			sessionStorage.getItem(STORAGE_KEY) ?? "[]",
		) as BugReport[];
		existing.push(report);
		// Keep only the most recent reports
		const trimmed = existing.slice(-MAX_LOCAL_REPORTS);
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
	} catch {
		// sessionStorage unavailable
	}
}

/** Get locally stored bug reports (for debugging). */
export function getLocalBugReports(): BugReport[] {
	try {
		return JSON.parse(
			sessionStorage.getItem(STORAGE_KEY) ?? "[]",
		) as BugReport[];
	} catch {
		return [];
	}
}

/**
 * Install global error handlers.
 * Call once from the app root (e.g., layout or a provider component).
 */
export function installGlobalErrorHandlers(): () => void {
	if (typeof window === "undefined") return () => {};

	const onError = (event: ErrorEvent) => {
		reportBug({
			type: "runtime",
			message: event.message,
			stack: event.error?.stack,
			metadata: {
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
			},
		});
	};

	const onUnhandledRejection = (event: PromiseRejectionEvent) => {
		const reason = event.reason;
		reportBug({
			type: "unhandled-rejection",
			message: reason instanceof Error ? reason.message : String(reason),
			stack: reason instanceof Error ? reason.stack : undefined,
		});
	};

	window.addEventListener("error", onError);
	window.addEventListener("unhandledrejection", onUnhandledRejection);

	return () => {
		window.removeEventListener("error", onError);
		window.removeEventListener("unhandledrejection", onUnhandledRejection);
	};
}
