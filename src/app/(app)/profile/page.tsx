"use client";

import {
	Avatar,
	Badge,
	Box,
	Button,
	Group,
	Loader,
	Modal,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
	IconBrandLastfm,
	IconBrandSpotify,
	IconCheck,
	IconEdit,
	IconHeart,
	IconLogout,
	IconMusic,
	IconPlaylist,
	IconShare,
	IconUser,
	IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";
import { api } from "~/trpc/react";
import styles from "./profile.module.css";

function getLastfmAuthUrl() {
	const cb = new URL("/api/auth/callback/lastfm", window.location.origin);
	cb.searchParams.set("redirect", "/profile");
	return `https://www.last.fm/api/auth?api_key=${process.env.NEXT_PUBLIC_LASTFM_API_KEY}&cb=${encodeURIComponent(cb.toString())}`;
}

const ProfilePage = () => {
	const { data: session, isPending } = authClient.useSession();
	const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
		useDisclosure(false);
	const [editName, setEditName] = useState("");
	const [editImage, setEditImage] = useState("");

	const isAuthenticated = !!session?.user;

	const { data: profile, isLoading: profileLoading } =
		api.user.getProfile.useQuery(undefined, {
			enabled: isAuthenticated,
		});

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

	const utils = api.useUtils();
	const updateProfile = api.user.updateProfile.useMutation({
		onSuccess: () => {
			utils.user.getProfile.invalidate();
			closeEditModal();
		},
	});

	const resolvedName =
		profile?.name ?? session?.user?.name ?? "SpotiSwipe User";
	const resolvedImage = profile?.image ?? session?.user?.image ?? null;
	const initial = resolvedName.charAt(0).toUpperCase();
	const role = profile?.role ?? "user";

	const likedCount = likedHistory?.items.length ?? 0;
	const skippedCount = skippedHistory?.items.length ?? 0;
	const playlistCount = playlists?.length ?? 0;
	const postCount = socialProfile?.postCount ?? 0;

	const connectedProviders = profile?.connectedProviders;

	const handleOpenEdit = () => {
		setEditName(profile?.displayName ?? "");
		setEditImage(profile?.profileImage ?? "");
		openEditModal();
	};

	const handleSaveProfile = () => {
		updateProfile.mutate({
			displayName: editName || undefined,
			clearDisplayName: editName === "" && !!profile?.displayName,
			profileImage: editImage || undefined,
			clearProfileImage: editImage === "" && !!profile?.profileImage,
		});
	};

	const handleConnectSpotify = async () => {
		await authClient.signIn.social({
			provider: "spotify",
			callbackURL: "/profile",
		});
	};

	const handleConnectLastfm = () => {
		window.location.href = getLastfmAuthUrl();
	};

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
		<Box className={styles.container}>
			<div className={styles.content}>
				{isPending || profileLoading ? (
					<div className={styles.loadingContainer}>
						<Loader color="cyan" size="lg" />
					</div>
				) : !session?.user ? (
					<div className={styles.loadingContainer}>
						<Stack align="center" gap="md">
							<IconUser color="rgba(255,255,255,0.3)" size={48} stroke={1.5} />
							<Text c="dimmed">Please sign in to view your profile.</Text>
						</Stack>
					</div>
				) : (
					<Stack gap="lg">
						{/* User Header */}
						<div className={styles.userHeader}>
							<Group gap="lg">
								<div style={{ textAlign: "center" }}>
									<Avatar
										className={styles.avatar}
										color="cyan"
										radius="xl"
										size={80}
										src={resolvedImage}
									>
										{initial}
									</Avatar>
									<Badge
										color={role === "admin" ? "cyan" : "gray"}
										mt="xs"
										size="sm"
										variant={role === "admin" ? "filled" : "light"}
									>
										{role}
									</Badge>
								</div>
								<div style={{ flex: 1 }}>
									<Group gap="xs">
										<Title className={styles.userName} order={2}>
											{resolvedName}
										</Title>
										<Button
											color="gray"
											onClick={handleOpenEdit}
											p={4}
											size="compact-xs"
											variant="subtle"
										>
											<IconEdit size={14} />
										</Button>
									</Group>
									{profile?.displayName && (
										<Text c="dimmed" size="xs">
											Provider name: {profile.providerName}
										</Text>
									)}
								</div>
							</Group>
						</div>

						{/* Edit Profile Modal */}
						<Modal
							onClose={closeEditModal}
							opened={editModalOpened}
							title="Edit Profile"
						>
							<Stack gap="md">
								<TextInput
									label="Display Name"
									onChange={(e) => setEditName(e.currentTarget.value)}
									placeholder={profile?.providerName ?? "Your display name"}
									value={editName}
								/>
								<TextInput
									label="Profile Image URL"
									onChange={(e) => setEditImage(e.currentTarget.value)}
									placeholder="https://example.com/avatar.jpg"
									value={editImage}
								/>
								{editImage && (
									<Group>
										<Text c="dimmed" size="sm">
											Preview:
										</Text>
										<Avatar radius="xl" size="md" src={editImage} />
									</Group>
								)}
								<Text c="dimmed" size="xs">
									Leave empty to use your provider name/image (Spotify takes
									priority over Last.fm).
								</Text>
								<Button
									loading={updateProfile.isPending}
									onClick={handleSaveProfile}
								>
									Save
								</Button>
							</Stack>
						</Modal>

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
									<IconX className={styles.statIcon} size={24} stroke={1.5} />
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
										<IconBrandSpotify color="#1DB954" size={24} stroke={1.5} />
										<span className={styles.accountName}>Spotify</span>
									</div>
									{connectedProviders?.spotify ? (
										<Badge
											color="green"
											leftSection={<IconCheck size={12} />}
											size="sm"
											variant="light"
										>
											Connected
										</Badge>
									) : (
										<Button
											color="#1DB954"
											onClick={handleConnectSpotify}
											size="compact-xs"
											variant="light"
										>
											Connect
										</Button>
									)}
								</div>
								<div className={styles.accountRow}>
									<div className={styles.accountInfo}>
										<IconBrandLastfm color="#D51007" size={24} stroke={1.5} />
										<span className={styles.accountName}>Last.fm</span>
									</div>
									{connectedProviders?.lastfm ? (
										<Badge
											color="green"
											leftSection={<IconCheck size={12} />}
											size="sm"
											variant="light"
										>
											Connected
										</Badge>
									) : (
										<Button
											color="red"
											onClick={handleConnectLastfm}
											size="compact-xs"
											variant="light"
										>
											Connect
										</Button>
									)}
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
	);
};

export default ProfilePage;
