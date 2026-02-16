"use client";

import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "~/lib/auth-client";

const Home = () => {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (!isPending && session) {
			router.replace("/dashboard");
		}
	}, [session, isPending, router]);

	return (
		<Center h="100vh">
			<Stack align="center" gap="lg">
				<Title order={1}>SpotiSwipe</Title>
				<Text c="dimmed" maw={400} size="lg" ta="center">
					Discover music you love. Swipe, save, and share playlists with
					friends.
				</Text>
				<Stack gap="sm" w={240}>
					<Button
						onClick={() => router.push("/sign-in")}
						radius="md"
						size="lg"
						variant="filled"
					>
						Sign in
					</Button>
					<Button
						onClick={() => router.push("/sign-up")}
						radius="md"
						size="lg"
						variant="light"
					>
						Create account
					</Button>
				</Stack>
			</Stack>
		</Center>
	);
};

export default Home;
