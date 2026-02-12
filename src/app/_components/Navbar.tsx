"use client";

import { NavLink } from "@mantine/core";
import {
	IconMusicCog,
	IconPlaylist,
	IconUsersGroup,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";

const navItems = [
	{
		href: "/dashboard",
		label: "Discover",
		icon: IconMusicCog,
	},
	{
		href: "/playlist",
		label: "Playlists",
		icon: IconPlaylist,
	},
	{
		href: "/shareboard",
		label: "Shareboard",
		icon: IconUsersGroup,
	},
];

const Navbar = () => {
	const pathname = usePathname();

	return (
		<>
			{navItems.map((item) => (
				<NavLink
					active={pathname === item.href}
					href={item.href}
					key={item.href}
					label={item.label}
					leftSection={<item.icon size="16" stroke={1.5} />}
				/>
			))}
		</>
	);
};

export default Navbar;
