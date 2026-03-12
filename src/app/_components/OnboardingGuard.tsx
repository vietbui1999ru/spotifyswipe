"use client";

import { Center, Loader } from "@mantine/core";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { api } from "~/trpc/react";

interface OnboardingGuardProps {
	children: ReactNode;
}

const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
	const router = useRouter();
	const { data: providers, isLoading } =
		api.user.getConnectedProviders.useQuery();

	useEffect(() => {
		if (!isLoading && providers) {
			const hasProvider =
				providers.spotify || providers.lastfm || providers.demo;
			if (!hasProvider) {
				router.replace("/onboarding");
			}
		}
	}, [providers, isLoading, router]);

	if (isLoading) {
		return (
			<Center h="80vh">
				<Loader size="lg" />
			</Center>
		);
	}

	if (providers && !providers.spotify && !providers.lastfm && !providers.demo) {
		return null;
	}

	return <>{children}</>;
};

export default OnboardingGuard;
