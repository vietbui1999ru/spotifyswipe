"use client";

import { Autocomplete, Burger, Group } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconBrandLastfm, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import classes from "~/styles/HeaderSearch.module.css";
import { api } from "~/trpc/react";
import ColorSchemeToggle from "./ColorSchemeToggle";

const links = [
	{ link: "/about", label: "Features" },
	{ link: "/community", label: "Community" },
];

const HeaderSearch = () => {
	const [opened, { toggle }] = useDisclosure(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery] = useDebouncedValue(searchQuery, 300);

	const { data: searchResults } = api.song.search.useQuery(
		{ query: debouncedQuery, limit: 10 },
		{
			enabled: debouncedQuery.length > 2,
			refetchOnWindowFocus: false,
		},
	);

	const autocompleteData =
		searchResults?.map((track) => ({
			value: `${track.name} - ${track.artist}`,
			label: `${track.name} - ${track.artist}`,
		})) ?? [];

	// Deduplicate by value
	const uniqueData = Array.from(
		new Map(autocompleteData.map((item) => [item.value, item])).values(),
	);

	const items = links.map((link) => (
		<a
			className={classes.link}
			href={link.link}
			key={link.label}
			onClick={(event) => event.preventDefault()}
		>
			{link.label}
		</a>
	));

	return (
		<header className={classes.header}>
			<div className={classes.inner}>
				<Group>
					<Burger hiddenFrom="sm" onClick={toggle} opened={opened} size="sm" />
					<IconBrandLastfm
						color="var(--mantine-color-white)"
						size={50}
						stroke={1.5}
					/>
				</Group>

				<Autocomplete
					className={classes.search}
					data={uniqueData.map((d) => d.value)}
					leftSection={<IconSearch size={20} stroke={1.5} />}
					onChange={(value) => {
						console.debug("[SpotiSwipe] Search query changed:", value);
						setSearchQuery(value);
					}}
					placeholder="Search for Songs, Artists, or Genres"
					value={searchQuery}
					visibleFrom="xs"
					w={{ base: "30%", xs: "15%", sm: "20%", md: "30%" }}
				/>

				<Group>
					<Group className={classes.links} gap={5} ml={50} visibleFrom="sm">
						{items}
					</Group>
				</Group>

				<ColorSchemeToggle />
			</div>
		</header>
	);
};

export default HeaderSearch;
