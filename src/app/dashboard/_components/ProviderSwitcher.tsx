"use client";

import { SegmentedControl, Tooltip } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "~/trpc/react";

const ProviderSwitcher = () => {
	const { data: provider, isLoading: providerLoading } =
		api.user.getMusicProvider.useQuery();
	const { data: connected, isLoading: connectedLoading } =
		api.user.getConnectedProviders.useQuery();

	const utils = api.useUtils();
	const queryClient = useQueryClient();

	const setProvider = api.user.setMusicProvider.useMutation({
		onSuccess: () => {
			utils.user.getMusicProvider.invalidate();
			// Invalidate client-side discovery feed (non-tRPC React Query key)
			queryClient.invalidateQueries({ queryKey: ["discoveryFeed"] });
		},
	});

	if (providerLoading || connectedLoading) return null;

	const options = [
		{
			value: "auto",
			label: "Auto",
			disabled: false,
		},
		{
			value: "spotify",
			label: "Spotify",
			disabled: !connected?.spotify,
		},
		{
			value: "lastfm",
			label: "Last.fm",
			disabled: !connected?.lastfm,
		},
	];

	return (
		<Tooltip label="Choose your discovery source" position="bottom">
			<SegmentedControl
				data={options}
				onChange={(value) => {
					setProvider.mutate({
						provider: value as "auto" | "spotify" | "lastfm",
					});
				}}
				size="xs"
				value={provider ?? "auto"}
			/>
		</Tooltip>
	);
};

export default ProviderSwitcher;
