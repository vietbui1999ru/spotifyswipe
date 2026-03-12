"use client";

import { Alert, Button, Group } from "@mantine/core";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";

export function DemoBanner() {
	const { data: demoStatus } = api.demo.getTimeRemaining.useQuery(undefined, {
		staleTime: 60 * 1000,
		refetchInterval: 60 * 1000,
		retry: false,
	});

	const [timeLeft, setTimeLeft] = useState<string | null>(null);
	const [showWarning, setShowWarning] = useState(false);
	// Track whether the user was ever a demo user in this browser tab so we can
	// show the "expired" state even after the tRPC call starts returning 401.
	const [wasDemo, setWasDemo] = useState(false);

	// Persist demo flag to sessionStorage so expiry detection survives a 401.
	useEffect(() => {
		if (demoStatus?.isDemo) {
			try {
				sessionStorage.setItem("spotiswipe:is-demo", "true");
			} catch {
				// sessionStorage unavailable (e.g. SSR)
			}
			setWasDemo(true);
		} else {
			try {
				const stored = sessionStorage.getItem("spotiswipe:is-demo");
				if (stored) setWasDemo(true);
			} catch {
				// sessionStorage unavailable
			}
		}
	}, [demoStatus]);

	useEffect(() => {
		if (!demoStatus?.isDemo || !demoStatus.expiresAt) return;

		const expiresAt = demoStatus.expiresAt;

		const update = () => {
			const remaining = new Date(expiresAt).getTime() - Date.now();
			if (remaining <= 0) {
				setTimeLeft("expired");
				setShowWarning(true);
				return;
			}
			const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

			if (remaining < 60 * 60 * 1000) {
				setShowWarning(true);
				setTimeLeft(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
			}
		};

		update();
		const interval = setInterval(update, 60 * 1000);
		return () => clearInterval(interval);
	}, [demoStatus]);

	// Session expired: either the countdown hit zero or the tRPC call failed
	// while sessionStorage still has the demo flag.
	const isExpired = timeLeft === "expired" || (!demoStatus?.isDemo && wasDemo);

	if (isExpired) {
		return (
			<Alert color="red" m="md" variant="filled">
				Your demo session has expired.
				<Group gap="sm" mt="xs">
					<Button
						color="white"
						onClick={() =>
							fetch("/api/demo/start", { method: "POST" }).then(() =>
								window.location.reload(),
							)
						}
						size="xs"
						variant="outline"
					>
						Start New Demo
					</Button>
					<Button
						color="white"
						component="a"
						href="/sign-up"
						size="xs"
						variant="filled"
					>
						Sign Up for Full Access
					</Button>
				</Group>
			</Alert>
		);
	}

	if (!demoStatus?.isDemo || !showWarning) return null;

	return (
		<Alert color="orange" m="md" variant="light">
			Your demo session expires in {timeLeft}. Sign up to keep your playlists!
			<Group mt="xs">
				<Button
					color="orange"
					component="a"
					href="/sign-up"
					size="xs"
					variant="light"
				>
					Sign Up
				</Button>
			</Group>
		</Alert>
	);
}
