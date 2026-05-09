"use client";

import { Button, Center, Divider, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "~/lib/auth-client";

const Home = () => {
	const { data: session, isPending } = useSession();
	const router = useRouter();
	const [demoLoading, setDemoLoading] = useState(false);
	const [demoError, setDemoError] = useState<string | null>(null);

	useEffect(() => {
		if (!isPending && session) {
			router.replace("/dashboard");
		}
	}, [session, isPending, router]);

	const handleTryDemo = async () => {
		setDemoLoading(true);
		setDemoError(null);
		try {
			const res = await fetch("/api/demo/start", { method: "POST" });
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				setDemoError(data.error ?? "Failed to start demo");
				return;
			}
			router.push("/dashboard");
		} catch {
			setDemoError("Failed to start demo session");
		} finally {
			setDemoLoading(false);
		}
	};

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
					<Divider label="or" labelPosition="center" />
					<Button
						color="violet"
						loading={demoLoading}
						onClick={handleTryDemo}
						radius="md"
						size="lg"
						variant="light"
					>
						Try Demo — No account needed
					</Button>
					{demoError && (
						<Text c="red" size="sm" ta="center">
							{demoError}
						</Text>
					)}
				</Stack>
			</Stack>
		</Center>
	);
};

export default Home;
