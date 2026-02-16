"use client";

import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShellStateContext } from "~/lib/contexts/app-shell-context";
import HeaderSearch from "./HeaderSearch";
import Navbar from "./Navbar";

const APP_PATHS = [
	"/dashboard",
	"/playlist",
	"/shareboard",
	"/profile",
	"/admin",
];

function isAppRoute(pathname: string): boolean {
	return APP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function AppShellWrapper({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const [opened, { toggle }] = useDisclosure(false);
	const showShell = isAppRoute(pathname);

	if (!showShell) {
		return <>{children}</>;
	}

	return (
		<AppShellStateContext value={{ opened, toggle }}>
			<AppShell
				header={{ height: 60 }}
				navbar={{
					width: 260,
					breakpoint: "sm",
					collapsed: { mobile: !opened },
				}}
				padding="md"
			>
				<AppShell.Header>
					<HeaderSearch />
				</AppShell.Header>

				<AppShell.Navbar p="md">
					<Navbar />
				</AppShell.Navbar>

				<AppShell.Main>{children}</AppShell.Main>
			</AppShell>
		</AppShellStateContext>
	);
}
