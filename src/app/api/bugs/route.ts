import { appendFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const BUG_LOG_PATH = join(process.cwd(), "bugs.md");

interface BugReport {
	timestamp: string;
	type: string;
	message: string;
	stack?: string;
	url: string;
	userAgent: string;
	metadata?: Record<string, unknown>;
}

async function ensureFileExists(): Promise<void> {
	try {
		await readFile(BUG_LOG_PATH, "utf-8");
	} catch {
		await writeFile(
			BUG_LOG_PATH,
			"# SpotiSwipe Bug Log\n\nAutomatically captured client-side errors and navigation issues.\n\n---\n\n",
			"utf-8",
		);
	}
}

function formatBugEntry(report: BugReport): string {
	const date = new Date(report.timestamp);
	const dateStr = date.toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	let entry = `## [${report.type.toUpperCase()}] ${dateStr}\n\n`;
	entry += `**Message:** ${report.message}\n\n`;
	entry += `**URL:** ${report.url}\n\n`;

	if (report.metadata && Object.keys(report.metadata).length > 0) {
		entry += "**Metadata:**\n";
		for (const [key, value] of Object.entries(report.metadata)) {
			entry += `- ${key}: \`${JSON.stringify(value)}\`\n`;
		}
		entry += "\n";
	}

	if (report.stack) {
		entry += `<details>\n<summary>Stack Trace</summary>\n\n\`\`\`\n${report.stack}\n\`\`\`\n\n</details>\n\n`;
	}

	entry += "---\n\n";
	return entry;
}

export async function POST(request: Request): Promise<NextResponse> {
	try {
		const report = (await request.json()) as BugReport;

		if (!report.message || !report.type) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		await ensureFileExists();
		await appendFile(BUG_LOG_PATH, formatBugEntry(report), "utf-8");

		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error("[BugAPI] Failed to write bug report:", err);
		return NextResponse.json({ error: "Failed to log bug" }, { status: 500 });
	}
}

export async function GET(): Promise<NextResponse> {
	try {
		await ensureFileExists();
		const content = await readFile(BUG_LOG_PATH, "utf-8");
		return new NextResponse(content, {
			headers: { "Content-Type": "text/markdown; charset=utf-8" },
		});
	} catch {
		return NextResponse.json(
			{ error: "Failed to read bug log" },
			{ status: 500 },
		);
	}
}
