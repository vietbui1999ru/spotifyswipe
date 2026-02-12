"use client";

import { AppShell, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import styles from "~/styles/shareboard.module.css";
import HeaderSearch from "../_components/HeaderSearch";
import Navbar from "../_components/Navbar";
import ShareboardDetail from "./_components/ShareboardDetail";
import ShareboardGrid from "./_components/ShareboardGrid";

const ShareboardPage = () => {
	const [opened] = useDisclosure();
	const [selectedShareboard, setSelectedShareboard] = useState<string | null>(
		null,
	);

	return (
		<AppShell
			header={{ height: 60 }}
			navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
			padding="md"
		>
			<AppShell.Header>
				<HeaderSearch />
			</AppShell.Header>

			<AppShell.Navbar p="md">
				<Navbar />
			</AppShell.Navbar>

			<AppShell.Main>
				<Box className={styles.container}>
					<div className={styles.shareboardLayout}>
						{/* Grid of Shareboards */}
						<ShareboardGrid onSelectShareboard={setSelectedShareboard} />

						{/* Shareboard Detail (Right Panel) */}
						{selectedShareboard !== null && (
							<ShareboardDetail shareboardId={selectedShareboard} />
						)}
					</div>
				</Box>
			</AppShell.Main>
		</AppShell>
	);
};

export default ShareboardPage;
