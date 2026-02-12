"use client";

export default function TestEnvPage() {
	const envUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL;
	const windowOrigin =
		typeof window !== "undefined" ? window.location.origin : "N/A";

	return (
		<div
			style={{
				padding: "2rem",
				fontFamily: "monospace",
				whiteSpace: "pre-wrap",
			}}
		>
			<h1>Environment Variable Check</h1>

			<div
				style={{
					marginBottom: "2rem",
					padding: "1rem",
					backgroundColor: "#f0f0f0",
				}}
			>
				<h2>Client-Side Values</h2>
				NEXT_PUBLIC_NEXTAUTH_URL: {envUrl || "❌ NOT SET"}
				{"\n"}
				window.location.origin: {windowOrigin}
				{"\n"}
				{envUrl === windowOrigin ? "✅ MATCH" : "❌ MISMATCH"}
			</div>

			<div
				style={{
					marginBottom: "2rem",
					padding: "1rem",
					backgroundColor: "#f0f0f0",
				}}
			>
				<h2>Debug Info</h2>
				typeof process.env.NEXT_PUBLIC_NEXTAUTH_URL: {typeof envUrl}
				{"\n"}
				Value: "{envUrl}"
			</div>

			<div
				style={{
					marginBottom: "2rem",
					padding: "1rem",
					backgroundColor: "#f0f0f0",
				}}
			>
				<h2>Expected vs Actual</h2>
				Expected redirect_uri:
				{"\n"}
				{envUrl || window.location.origin}/api/auth/callback/spotify
				{"\n\n"}
				{envUrl === "http://127.0.0.1:3000"
					? "✅ CORRECT - Should send 127.0.0.1 to Spotify"
					: "❌ WRONG - Will send localhost to Spotify"}
			</div>

			<div style={{ padding: "1rem", backgroundColor: "#ffe0e0" }}>
				<h2>Next Steps</h2>
				1. Check if NEXT_PUBLIC_NEXTAUTH_URL is set above
				{"\n"}
				2. Check your .env file for:
				NEXT_PUBLIC_NEXTAUTH_URL="http://127.0.0.1:3000"
				{"\n"}
				3. If not set, stop dev server (Ctrl+C) and restart
				{"\n"}
				4. If still not set, check if env file was modified after server started
			</div>
		</div>
	);
}
