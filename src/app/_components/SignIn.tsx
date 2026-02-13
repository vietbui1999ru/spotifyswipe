"use client";

import { Button, Stack } from "@mantine/core";
import { IconBrandLastfm, IconBrandSpotify } from "@tabler/icons-react";
import { authClient } from "~/lib/auth-client";

const LASTFM_AUTH_URL = `https://www.last.fm/api/auth?api_key=${process.env.NEXT_PUBLIC_LASTFM_API_KEY}&cb=${encodeURIComponent("http://127.0.0.1:3000/api/auth/callback/lastfm")}`;

interface SignInProps {
	redirectTo?: string;
}

const SignIn = ({ redirectTo = "/dashboard" }: SignInProps) => {
	const handleSpotifySignIn = async () => {
		await authClient.signIn.social({
			provider: "spotify",
			callbackURL: redirectTo,
		});
	};

	const handleLastfmSignIn = () => {
		// Last.fm uses non-standard OAuth (api_key + MD5 signatures).
		// Bypass better-auth and redirect directly to Last.fm auth page.
		// The custom callback at /api/auth/callback/lastfm handles the rest.
		window.location.href = LASTFM_AUTH_URL;
	};

	return (
		<Stack gap="sm">
			<Button
				color="#1DB954"
				leftSection={<IconBrandSpotify size={18} />}
				onClick={handleSpotifySignIn}
				radius="md"
				size="lg"
				variant="filled"
			>
				Sign in with Spotify
			</Button>
			<Button
				gradient={{ from: "red", to: "pink" }}
				leftSection={<IconBrandLastfm size={18} />}
				onClick={handleLastfmSignIn}
				radius="md"
				size="md"
				variant="gradient"
			>
				Sign in with Last.fm
			</Button>
		</Stack>
	);
};

export default SignIn;
