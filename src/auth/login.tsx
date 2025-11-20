// auth/login.ts
import { generateCodeVerifier, generateCodeChallenge } from "@/utils/pkce";

interface SpotifyAuthParams {
	response_type: string;
	client_id: string;
	scope: string;
	redirect_uri: string;
	code_challenge_method: string;
	code_challenge: string;
}

function toSearchParams(obj: SpotifyAuthParams): URLSearchParams {
	const entries = Object.entries(obj).filter(
		([, v]) => v !== undefined && v !== null
	);
	return new URLSearchParams(entries as [string, string][]);
}

const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "";

const redirectToLogin = async () => {
	const codeVerifier = await generateCodeVerifier();
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	localStorage.setItem("spotify_code_verifier", codeVerifier);

	const scope = [
		"user-read-private",
		"user-read-email",
		"playlist-read-private",
	].join(" ");

	const params = toSearchParams({
		response_type: "code",
		client_id: clientId,
		scope,
		redirect_uri: redirectUri,
		code_challenge_method: "S256",
		code_challenge: codeChallenge!,
	});

	window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export default redirectToLogin;
