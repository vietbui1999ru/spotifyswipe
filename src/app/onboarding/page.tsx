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
import { IconBrandLastfm, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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

	useEffect(() => {
		if (!isLoading && providers?.lastfm) {
			router.replace("/dashboard");
		}
	}, [providers?.lastfm, isLoading, router]);

	if (isLoading) {
		return (
			<Center h="100vh">
				<Loader size="lg" />
			</Center>
		);
	}

	return (
		<Center h="100vh">
			<Card maw={480} p="xl" radius="md" shadow="md" w="100%" withBorder>
				<Stack gap="lg">
					<div>
						<Title order={2} ta="center">
							Connect Last.fm
						</Title>
						<Text c="dimmed" mt="xs" size="sm" ta="center">
							Link your Last.fm account for personalized picks based on your
							listening history. Skip to browse popular charts instead.
						</Text>
					</div>

					<Button
						disabled={providers?.lastfm}
						gradient={{ from: "red", to: "pink" }}
						leftSection={
							providers?.lastfm ? (
								<ThemeIcon color="green" radius="xl" size="sm" variant="filled">
									<IconCheck size={12} />
								</ThemeIcon>
							) : (
								<IconBrandLastfm size={18} />
							)
						}
						onClick={() => {
							window.location.href = getLastfmAuthUrl();
						}}
						radius="md"
						size="lg"
						variant={providers?.lastfm ? "light" : "gradient"}
					>
						{providers?.lastfm ? "Last.fm connected" : "Connect Last.fm"}
					</Button>

					<Button
						color="gray"
						onClick={() => router.push("/dashboard")}
						radius="md"
						size="md"
						variant="subtle"
					>
						Skip — browse popular charts
					</Button>
				</Stack>
			</Card>
		</Center>
	);
};

export default OnboardingPage;
