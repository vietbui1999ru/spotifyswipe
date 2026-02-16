"use client";

import {
	Button,
	Card,
	Center,
	Loader,
	Stack,
	Text,
	ThemeIcon,
	Title,
} from "@mantine/core";
import {
	IconBrandLastfm,
	IconBrandSpotify,
	IconCheck,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "~/lib/auth-client";
import { api } from "~/trpc/react";

function getLastfmAuthUrl() {
	const cb = new URL("/api/auth/callback/lastfm", window.location.origin);
	cb.searchParams.set("redirect", "/onboarding");
	return `https://www.last.fm/api/auth?api_key=${process.env.NEXT_PUBLIC_LASTFM_API_KEY}&cb=${encodeURIComponent(cb.toString())}`;
}

const OnboardingPage = () => {
	const router = useRouter();
	const { data: providers, isLoading } =
		api.user.getConnectedProviders.useQuery(undefined, {
			refetchInterval: 3000,
		});

	const hasAnyProvider = providers?.spotify || providers?.lastfm;

	useEffect(() => {
		// Auto-redirect if user already has providers (e.g., signed up via Spotify OAuth)
		if (!isLoading && hasAnyProvider) {
			router.replace("/dashboard");
		}
	}, [hasAnyProvider, isLoading, router]);

	if (isLoading) {
		return (
			<Center h="100vh">
				<Loader size="lg" />
			</Center>
		);
	}

	const handleConnectSpotify = async () => {
		// Use linkSocial to link Spotify to the existing account (user is already authenticated)
		// This prevents creating a separate user when Spotify email differs from the signed-in email
		await authClient.linkSocial({
			provider: "spotify",
			callbackURL: "/onboarding",
		});
	};

	const handleConnectLastfm = () => {
		window.location.href = getLastfmAuthUrl();
	};

	return (
		<Center h="100vh">
			<Card maw={480} p="xl" radius="md" shadow="md" w="100%" withBorder>
				<Stack gap="lg">
					<div>
						<Title order={2} ta="center">
							Connect a music provider
						</Title>
						<Text c="dimmed" mt="xs" size="sm" ta="center">
							SpotiSwipe needs at least one music provider to discover and play
							music. Connect Spotify or Last.fm to get started.
						</Text>
					</div>

					<Stack gap="sm">
						<Button
							color="#1DB954"
							disabled={providers?.spotify}
							leftSection={
								providers?.spotify ? (
									<ThemeIcon
										color="green"
										radius="xl"
										size="sm"
										variant="filled"
									>
										<IconCheck size={12} />
									</ThemeIcon>
								) : (
									<IconBrandSpotify size={18} />
								)
							}
							onClick={handleConnectSpotify}
							radius="md"
							size="lg"
							variant={providers?.spotify ? "light" : "filled"}
						>
							{providers?.spotify ? "Spotify connected" : "Connect Spotify"}
						</Button>

						<Button
							disabled={providers?.lastfm}
							gradient={{ from: "red", to: "pink" }}
							leftSection={
								providers?.lastfm ? (
									<ThemeIcon
										color="green"
										radius="xl"
										size="sm"
										variant="filled"
									>
										<IconCheck size={12} />
									</ThemeIcon>
								) : (
									<IconBrandLastfm size={18} />
								)
							}
							onClick={handleConnectLastfm}
							radius="md"
							size="lg"
							variant={providers?.lastfm ? "light" : "gradient"}
						>
							{providers?.lastfm ? "Last.fm connected" : "Connect Last.fm"}
						</Button>
					</Stack>

					<Button
						disabled={!hasAnyProvider}
						onClick={() => router.push("/dashboard")}
						radius="md"
						size="lg"
						variant="filled"
					>
						Continue to Dashboard
					</Button>
				</Stack>
			</Card>
		</Center>
	);
};

export default OnboardingPage;
