"use client";

import { Divider, NavLink } from "@mantine/core";
import {
	IconMusicCog,
	IconPlaylist,
	IconShieldCog,
	IconUser,
	IconUsersGroup,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import { api } from "~/trpc/react";

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
	{
		href: "/profile",
		label: "Profile",
		icon: IconUser,
	},
];

const Navbar = memo(function Navbar() {
	const pathname = usePathname();

	// Query role directly — no session dependency.
	// This component only renders on authenticated app pages (inside AppShellWrapper),
	// and protectedProcedure handles auth. Cache forever so the Admin link never flickers.
	const { data: roleData } = api.user.getRole.useQuery(undefined, {
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
	});

	const isAdmin = roleData?.role === "admin";

	return (
		<>
			{navItems.map((item) => (
				<NavLink
					active={pathname === item.href}
					component={Link}
					href={item.href}
					key={item.href}
					label={item.label}
					leftSection={<item.icon size="16" stroke={1.5} />}
				/>
			))}
			{isAdmin && (
				<>
					<Divider color="dark.4" my="xs" />
					<NavLink
						active={pathname === "/admin"}
						color="cyan"
						component={Link}
						href="/admin"
						label="Admin"
						leftSection={<IconShieldCog size="16" stroke={1.5} />}
					/>
				</>
			)}
		</>
	);
});

export default Navbar;
