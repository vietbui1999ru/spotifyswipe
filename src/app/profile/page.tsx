"use client";

import {
	AppShell,
	Avatar,
	Badge,
	Box,
	Button,
	Group,
	Loader,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
	IconBrandLastfm,
	IconBrandSpotify,
	IconHeart,
	IconLogout,
	IconMusic,
	IconPlaylist,
	IconShare,
	IconUser,
	IconX,
} from "@tabler/icons-react";
import { authClient } from "~/lib/auth-client";
import { api } from "~/trpc/react";
import HeaderSearch from "../_components/HeaderSearch";
import Navbar from "../_components/Navbar";
import styles from "./profile.module.css";

const ProfilePage = () => {
	const [opened] = useDisclosure();
	const { data: session, isPending } = authClient.useSession();

	const isAuthenticated = !!session?.user;

	const { data: swipeHistory } = api.swipe.getHistory.useQuery(
		{ limit: 5 },
		{ enabled: isAuthenticated },
	);

	const { data: likedHistory } = api.swipe.getHistory.useQuery(
		{ action: "liked", limit: 50 },
		{ enabled: isAuthenticated },
	);

	const { data: skippedHistory } = api.swipe.getHistory.useQuery(
		{ action: "skipped", limit: 50 },
		{ enabled: isAuthenticated },
	);

	const { data: playlists } = api.playlist.getAll.useQuery(undefined, {
		enabled: isAuthenticated,
	});

	const { data: socialProfile } = api.social.getUserProfile.useQuery(
		{ userId: session?.user?.id ?? "" },
		{ enabled: isAuthenticated && !!session?.user?.id },
	);

	const user = session?.user;
	const initial = user?.name?.charAt(0).toUpperCase() ?? "?";

	const likedCount = likedHistory?.items.length ?? 0;
	const skippedCount = skippedHistory?.items.length ?? 0;
	const playlistCount = playlists?.length ?? 0;
	const postCount = socialProfile?.postCount ?? 0;

	const formatTimeAgo = (date: Date | string) => {
		const now = new Date();
		const then = new Date(date);
		const diffMs = now.getTime() - then.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return "just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	};

	const getActionBadge = (action: string) => {
		switch (action) {
			case "liked":
				return (
					<Badge color="green" size="sm" variant="light">
						Liked
					</Badge>
				);
			case "superliked":
				return (
					<Badge color="cyan" size="sm" variant="light">
						Super Liked
					</Badge>
				);
			case "skipped":
				return (
					<Badge color="gray" size="sm" variant="light">
						Skipped
					</Badge>
				);
			default:
				return null;
		}
	};

	return (
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

			<AppShell.Main>
				<Box className={styles.container}>
					<div className={styles.content}>
						{isPending ? (
							<div className={styles.loadingContainer}>
								<Loader color="cyan" size="lg" />
							</div>
						) : !user ? (
							<div className={styles.loadingContainer}>
								<Stack align="center" gap="md">
									<IconUser
										color="rgba(255,255,255,0.3)"
										size={48}
										stroke={1.5}
									/>
									<Text c="dimmed">Please sign in to view your profile.</Text>
								</Stack>
							</div>
						) : (
							<Stack gap="lg">
								{/* User Header */}
								<div className={styles.userHeader}>
									<Group gap="lg">
										<Avatar
											className={styles.avatar}
											color="cyan"
											radius="xl"
											size={80}
											src={user.image}
										>
											{initial}
										</Avatar>
										<div>
											<Title className={styles.userName} order={2}>
												{user.name ?? "SpotiSwipe User"}
											</Title>
											<Text className={styles.userEmail}>
												{user.email ?? "No email on file"}
											</Text>
										</div>
									</Group>
								</div>

								{/* Stats */}
								<div className={styles.glassCard}>
									<Text className={styles.sectionTitle} mb="md">
										Your Stats
									</Text>
									<SimpleGrid cols={{ base: 2, sm: 4 }}>
										<div className={styles.statCard}>
											<IconHeart
												className={styles.statIcon}
												size={24}
												stroke={1.5}
											/>
											<div className={styles.statValue}>{likedCount}</div>
											<div className={styles.statLabel}>Songs Liked</div>
										</div>
										<div className={styles.statCard}>
											<IconX
												className={styles.statIcon}
												size={24}
												stroke={1.5}
											/>
											<div className={styles.statValue}>{skippedCount}</div>
											<div className={styles.statLabel}>Songs Skipped</div>
										</div>
										<div className={styles.statCard}>
											<IconPlaylist
												className={styles.statIcon}
												size={24}
												stroke={1.5}
											/>
											<div className={styles.statValue}>{playlistCount}</div>
											<div className={styles.statLabel}>Playlists</div>
										</div>
										<div className={styles.statCard}>
											<IconShare
												className={styles.statIcon}
												size={24}
												stroke={1.5}
											/>
											<div className={styles.statValue}>{postCount}</div>
											<div className={styles.statLabel}>Posts Shared</div>
										</div>
									</SimpleGrid>
								</div>

								{/* Connected Accounts */}
								<div className={styles.glassCard}>
									<Text className={styles.sectionTitle} mb="md">
										Connected Accounts
									</Text>
									<Stack gap="sm">
										<div className={styles.accountRow}>
											<div className={styles.accountInfo}>
												<IconBrandSpotify
													color="#1DB954"
													size={24}
													stroke={1.5}
												/>
												<span className={styles.accountName}>Spotify</span>
											</div>
											<Badge color="gray" size="sm" variant="light">
												Not Connected
											</Badge>
										</div>
										<div className={styles.accountRow}>
											<div className={styles.accountInfo}>
												<IconBrandLastfm
													color="#D51007"
													size={24}
													stroke={1.5}
												/>
												<span className={styles.accountName}>Last.fm</span>
											</div>
											<Badge color="green" size="sm" variant="light">
												Connected
											</Badge>
										</div>
									</Stack>
								</div>

								{/* Recent Activity */}
								<div className={styles.glassCard}>
									<Text className={styles.sectionTitle} mb="md">
										Recent Activity
									</Text>
									{swipeHistory?.items && swipeHistory.items.length > 0 ? (
										<Stack gap="sm">
											{swipeHistory.items.map((swipe) => (
												<div className={styles.activityItem} key={swipe.id}>
													<Group gap="sm">
														<IconMusic
															color="rgba(34, 211, 238, 0.6)"
															size={18}
															stroke={1.5}
														/>
														<div>
															<div className={styles.activitySong}>
																{swipe.song.title}
															</div>
															<div className={styles.activityArtist}>
																{swipe.song.artist}
															</div>
														</div>
													</Group>
													<Group gap="xs">
														{getActionBadge(swipe.action)}
														<Text className={styles.activityTime}>
															{formatTimeAgo(swipe.createdAt)}
														</Text>
													</Group>
												</div>
											))}
										</Stack>
									) : (
										<div className={styles.emptyText}>
											No swipe activity yet. Start discovering music!
										</div>
									)}
								</div>

								{/* Sign Out */}
								<Button
									className={styles.signOutButton}
									fullWidth
									leftSection={<IconLogout size={18} stroke={1.5} />}
									onClick={async () => {
										await authClient.signOut({
											fetchOptions: {
												onSuccess: () => {
													window.location.href = "/";
												},
											},
										});
									}}
									size="md"
									variant="outline"
								>
									Sign Out
								</Button>
							</Stack>
						)}
					</div>
				</Box>
			</AppShell.Main>
		</AppShell>
	);
};

export default ProfilePage;
