"use client";

import {
	Alert,
	Anchor,
	Button,
	Divider,
	PasswordInput,
	Stack,
	TextInput,
} from "@mantine/core";
import {
	IconBrandGoogle,
	IconBrandLastfm,
	IconBrandSpotify,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient, signIn, signUp } from "~/lib/auth-client";

function getLastfmAuthUrl(redirect?: string) {
	const cb = new URL("/api/auth/callback/lastfm", window.location.origin);
	if (redirect) {
		cb.searchParams.set("redirect", redirect);
	}
	return `https://www.last.fm/api/auth?api_key=${process.env.NEXT_PUBLIC_LASTFM_API_KEY}&cb=${encodeURIComponent(cb.toString())}`;
}

interface SignInProps {
	mode?: "sign-in" | "sign-up";
}

const SignIn = ({ mode = "sign-in" }: SignInProps) => {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const isSignUp = mode === "sign-up";
	const callbackURL = isSignUp ? "/onboarding" : "/dashboard";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			if (isSignUp) {
				const result = await signUp.email({
					email,
					password,
					name: name || email.split("@")[0] || "User",
					callbackURL: "/onboarding",
				});
				if (result.error) {
					setError(result.error.message ?? "Sign up failed");
				} else {
					router.push("/onboarding");
				}
			} else {
				const result = await signIn.email({
					email,
					password,
					callbackURL: "/dashboard",
				});
				if (result.error) {
					setError(result.error.message ?? "Sign in failed");
				} else {
					router.push("/dashboard");
				}
			}
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		await authClient.signIn.social({
			provider: "google",
			callbackURL,
		});
	};

	const handleSpotifySignIn = async () => {
		await authClient.signIn.social({
			provider: "spotify",
			callbackURL,
		});
	};

	const handleLastfmSignIn = () => {
		window.location.href = getLastfmAuthUrl(
			isSignUp ? "/onboarding" : "/dashboard",
		);
	};

	return (
		<Stack gap="md">
			{error && (
				<Alert color="red" variant="light">
					{error}
				</Alert>
			)}

			<form onSubmit={handleSubmit}>
				<Stack gap="sm">
					{isSignUp && (
						<TextInput
							label="Name"
							onChange={(e) => setName(e.currentTarget.value)}
							placeholder="Your name (optional)"
							value={name}
						/>
					)}
					<TextInput
						label="Email"
						onChange={(e) => setEmail(e.currentTarget.value)}
						placeholder="you@example.com"
						required
						type="email"
						value={email}
					/>
					<PasswordInput
						label="Password"
						minLength={8}
						onChange={(e) => setPassword(e.currentTarget.value)}
						placeholder="Your password"
						required
						value={password}
					/>
					<Button loading={loading} radius="md" size="md" type="submit">
						{isSignUp ? "Create account" : "Sign in"}
					</Button>
				</Stack>
			</form>

			<Divider label="or continue with" labelPosition="center" />

			<Stack gap="sm">
				<Button
					color="gray"
					leftSection={<IconBrandGoogle size={18} />}
					onClick={handleGoogleSignIn}
					radius="md"
					size="md"
					variant="default"
				>
					Google
				</Button>
				<Button
					color="#1DB954"
					leftSection={<IconBrandSpotify size={18} />}
					onClick={handleSpotifySignIn}
					radius="md"
					size="md"
					variant="filled"
				>
					Spotify
				</Button>
				<Button
					gradient={{ from: "red", to: "pink" }}
					leftSection={<IconBrandLastfm size={18} />}
					onClick={handleLastfmSignIn}
					radius="md"
					size="md"
					variant="gradient"
				>
					Last.fm
				</Button>
			</Stack>

			<Anchor
				c="dimmed"
				component="a"
				href={isSignUp ? "/sign-in" : "/sign-up"}
				size="sm"
				ta="center"
			>
				{isSignUp
					? "Already have an account? Sign in"
					: "Don't have an account? Sign up"}
			</Anchor>
		</Stack>
	);
};

export default SignIn;
