"use client";

import { DonutChart, LineChart } from "@mantine/charts";
import {
	Avatar,
	Badge,
	Box,
	Group,
	Image,
	Loader,
	SimpleGrid,
	Stack,
	Table,
	Text,
	Title,
} from "@mantine/core";
import {
	IconActivity,
	IconHeartFilled,
	IconMusic,
	IconPlaylist,
	IconShieldLock,
	IconSwipe,
	IconUsers,
	IconUsersGroup,
} from "@tabler/icons-react";
import { authClient } from "~/lib/auth-client";
import { api } from "~/trpc/react";
import styles from "./admin.module.css";

function formatTimeAgo(date: Date | string) {
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
}

function getActionBadge(action: string) {
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
}

function formatDate(dateStr: string) {
	const d = new Date(dateStr);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AdminPage = () => {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const { data: roleData, isLoading: roleLoading } = api.user.getRole.useQuery(
		undefined,
		{
			enabled: !!session?.user,
		},
	);

	const isAdmin = roleData?.role === "admin";

	const { data: overview, isLoading: overviewLoading } =
		api.admin.getOverview.useQuery(undefined, { enabled: isAdmin });

	const { data: userGrowth } = api.admin.getUserGrowth.useQuery(undefined, {
		enabled: isAdmin,
	});

	const { data: swipeStats } = api.admin.getSwipeStats.useQuery(undefined, {
		enabled: isAdmin,
	});

	const { data: apiHealth } = api.admin.getApiHealth.useQuery(undefined, {
		enabled: isAdmin,
	});

	const { data: topContent } = api.admin.getTopContent.useQuery(undefined, {
		enabled: isAdmin,
	});

	const { data: recentActivity } = api.admin.getRecentActivity.useQuery(
		undefined,
		{ enabled: isAdmin },
	);

	// Transform user growth for LineChart
	const userGrowthData = (userGrowth ?? []).map((d) => ({
		date: formatDate(d.date),
		Signups: d.count,
	}));

	// Transform swipe daily data: pivot action types into columns per date
	const swipeDailyData = (() => {
		if (!swipeStats?.daily) return [];
		const byDate = new Map<
			string,
			{ date: string; Liked: number; Skipped: number; "Super Liked": number }
		>();
		for (const row of swipeStats.daily) {
			const key = formatDate(row.date);
			if (!byDate.has(key)) {
				byDate.set(key, { date: key, Liked: 0, Skipped: 0, "Super Liked": 0 });
			}
			const entry = byDate.get(key);
			if (!entry) continue;
			if (row.action === "liked") entry.Liked += row.count;
			else if (row.action === "skipped") entry.Skipped += row.count;
			else if (row.action === "superliked") entry["Super Liked"] += row.count;
		}
		return Array.from(byDate.values());
	})();

	// Transform provider distribution for DonutChart
	const providerDonutData = (apiHealth?.accountsByProvider ?? []).map((p) => ({
		name: p.provider.charAt(0).toUpperCase() + p.provider.slice(1),
		value: p.count,
		color:
			p.provider === "spotify"
				? "green.6"
				: p.provider === "lastfm"
					? "red.6"
					: "cyan.6",
	}));

	// Loading state
	if (sessionPending || roleLoading) {
		return (
			<Box className={styles.container}>
				<div className={styles.content}>
					<div className={styles.loadingContainer}>
						<Loader color="cyan" size="lg" />
					</div>
				</div>
			</Box>
		);
	}

	// Unauthorized state
	if (!session?.user || !isAdmin) {
		return (
			<Box className={styles.container}>
				<div className={styles.content}>
					<div className={styles.unauthorizedContainer}>
						<IconShieldLock
							color="rgba(255,255,255,0.3)"
							size={48}
							stroke={1.5}
						/>
						<Text c="dimmed" size="lg">
							Access denied. Admin privileges required.
						</Text>
					</div>
				</div>
			</Box>
		);
	}

	return (
		<Box className={styles.container}>
			<div className={styles.content}>
				<Stack gap="lg">
					{/* Page Header */}
					<div className={styles.pageHeader}>
						<Title className={styles.pageTitle} order={1}>
							Admin Dashboard
						</Title>
						<Text className={styles.pageSubtitle}>
							Platform metrics and analytics overview
						</Text>
					</div>

					{/* Overview Stat Cards */}
					<div className={styles.glassCard}>
						<Text className={styles.sectionTitle} mb="md">
							Overview
						</Text>
						{overviewLoading ? (
							<Group justify="center" py="xl">
								<Loader color="cyan" size="sm" />
							</Group>
						) : (
							<SimpleGrid cols={{ base: 2, sm: 3, md: 6 }}>
								<div className={styles.statCard}>
									<IconUsers
										className={styles.statIcon}
										size={24}
										stroke={1.5}
									/>
									<div className={styles.statValue}>{overview?.users ?? 0}</div>
									<div className={styles.statLabel}>Total Users</div>
								</div>
								<div className={styles.statCard}>
									<IconMusic
										className={styles.statIcon}
										size={24}
										stroke={1.5}
									/>
									<div className={styles.statValue}>{overview?.songs ?? 0}</div>
									<div className={styles.statLabel}>Total Songs</div>
								</div>
								<div className={styles.statCard}>
									<IconPlaylist
										className={styles.statIcon}
										size={24}
										stroke={1.5}
									/>
									<div className={styles.statValue}>
										{overview?.playlists ?? 0}
									</div>
									<div className={styles.statLabel}>Total Playlists</div>
								</div>
								<div className={styles.statCard}>
									<IconSwipe
										className={styles.statIcon}
										size={24}
										stroke={1.5}
									/>
									<div className={styles.statValue}>
										{overview?.swipeActions ?? 0}
									</div>
									<div className={styles.statLabel}>Total Swipes</div>
								</div>
								<div className={styles.statCard}>
									<IconUsersGroup
										className={styles.statIcon}
										size={24}
										stroke={1.5}
									/>
									<div className={styles.statValue}>
										{overview?.socialPosts ?? 0}
									</div>
									<div className={styles.statLabel}>Social Posts</div>
								</div>
								<div className={styles.statCard}>
									<IconActivity
										className={styles.statIcon}
										size={24}
										stroke={1.5}
									/>
									<div className={styles.statValue}>
										{overview?.activeSessions ?? 0}
									</div>
									<div className={styles.statLabel}>Active Sessions</div>
								</div>
							</SimpleGrid>
						)}
					</div>

					{/* Charts Row: User Growth + Swipe Activity */}
					<SimpleGrid cols={{ base: 1, md: 2 }}>
						{/* User Growth Chart */}
						<div className={styles.glassCard}>
							<Text className={styles.sectionTitle} mb="md">
								User Growth (30 days)
							</Text>
							<div className={styles.chartWrapper}>
								{userGrowthData.length > 0 ? (
									<LineChart
										curveType="monotone"
										data={userGrowthData}
										dataKey="date"
										gridProps={{ strokeDasharray: "3 3" }}
										h={250}
										series={[{ name: "Signups", color: "cyan.6" }]}
										withDots={false}
									/>
								) : (
									<Text c="dimmed" py="xl" size="sm" ta="center">
										No signup data available yet.
									</Text>
								)}
							</div>
						</div>

						{/* Swipe Activity Chart */}
						<div className={styles.glassCard}>
							<Text className={styles.sectionTitle} mb="md">
								Swipe Activity (30 days)
							</Text>
							<div className={styles.chartWrapper}>
								{swipeDailyData.length > 0 ? (
									<LineChart
										curveType="monotone"
										data={swipeDailyData}
										dataKey="date"
										gridProps={{ strokeDasharray: "3 3" }}
										h={250}
										series={[
											{ name: "Liked", color: "green.6" },
											{ name: "Skipped", color: "gray.6" },
											{ name: "Super Liked", color: "cyan.6" },
										]}
										withDots={false}
									/>
								) : (
									<Text c="dimmed" py="xl" size="sm" ta="center">
										No swipe data available yet.
									</Text>
								)}
							</div>
						</div>
					</SimpleGrid>

					{/* Provider Distribution + Swipe Totals */}
					<SimpleGrid cols={{ base: 1, md: 2 }}>
						{/* Provider Distribution */}
						<div className={styles.glassCard}>
							<Text className={styles.sectionTitle} mb="md">
								Provider Distribution
							</Text>
							<div className={styles.chartWrapper}>
								{providerDonutData.length > 0 ? (
									<Group justify="center">
										<DonutChart
											data={providerDonutData}
											size={200}
											thickness={30}
											withLabels
											withLabelsLine
										/>
									</Group>
								) : (
									<Text c="dimmed" py="xl" size="sm" ta="center">
										No provider data available yet.
									</Text>
								)}
							</div>
						</div>

						{/* Swipe Totals Breakdown */}
						<div className={styles.glassCard}>
							<Text className={styles.sectionTitle} mb="md">
								Swipe Breakdown
							</Text>
							<Stack gap="md" mt="md">
								{swipeStats?.totals && swipeStats.totals.length > 0 ? (
									swipeStats.totals.map((t) => (
										<Group justify="space-between" key={t.action}>
											<Group gap="sm">{getActionBadge(t.action)}</Group>
											<Text c="white" fw={700} size="lg">
												{t.count.toLocaleString()}
											</Text>
										</Group>
									))
								) : (
									<Text c="dimmed" py="xl" size="sm" ta="center">
										No swipe data available yet.
									</Text>
								)}
							</Stack>
						</div>
					</SimpleGrid>

					{/* Top Content Tables */}
					<SimpleGrid cols={{ base: 1, md: 2 }}>
						{/* Most Liked Songs */}
						<div className={styles.glassCard}>
							<Text className={styles.sectionTitle} mb="md">
								Most Liked Songs
							</Text>
							{topContent?.topSongs && topContent.topSongs.length > 0 ? (
								<Table highlightOnHover verticalSpacing="sm">
									<Table.Thead>
										<Table.Tr>
											<Table.Th>#</Table.Th>
											<Table.Th>Song</Table.Th>
											<Table.Th style={{ textAlign: "right" }}>
												<IconHeartFilled
													color="rgba(34, 211, 238, 0.7)"
													size={14}
												/>
											</Table.Th>
										</Table.Tr>
									</Table.Thead>
									<Table.Tbody>
										{topContent.topSongs.map((song, idx) => (
											<Table.Tr className={styles.tableRow} key={song.id}>
												<Table.Td>
													<Text c="dimmed" size="sm">
														{idx + 1}
													</Text>
												</Table.Td>
												<Table.Td>
													<Group gap="sm">
														{song.albumArt ? (
															<Image
																alt={song.title}
																h={36}
																radius="sm"
																src={song.albumArt}
																w={36}
															/>
														) : (
															<Avatar color="cyan" radius="sm" size={36}>
																<IconMusic size={18} />
															</Avatar>
														)}
														<div>
															<div className={styles.songTitle}>
																{song.title}
															</div>
															<div className={styles.songArtist}>
																{song.artist}
															</div>
														</div>
													</Group>
												</Table.Td>
												<Table.Td style={{ textAlign: "right" }}>
													<Badge color="cyan" size="sm" variant="light">
														{song.likeCount}
													</Badge>
												</Table.Td>
											</Table.Tr>
										))}
									</Table.Tbody>
								</Table>
							) : (
								<Text c="dimmed" py="xl" size="sm" ta="center">
									No liked songs yet.
								</Text>
							)}
						</div>

						{/* Most Active Users */}
						<div className={styles.glassCard}>
							<Text className={styles.sectionTitle} mb="md">
								Most Active Users
							</Text>
							{topContent?.topActiveUsers &&
							topContent.topActiveUsers.length > 0 ? (
								<Table highlightOnHover verticalSpacing="sm">
									<Table.Thead>
										<Table.Tr>
											<Table.Th>#</Table.Th>
											<Table.Th>User</Table.Th>
											<Table.Th style={{ textAlign: "right" }}>Swipes</Table.Th>
										</Table.Tr>
									</Table.Thead>
									<Table.Tbody>
										{topContent.topActiveUsers.map((user, idx) => (
											<Table.Tr className={styles.tableRow} key={user.id}>
												<Table.Td>
													<Text c="dimmed" size="sm">
														{idx + 1}
													</Text>
												</Table.Td>
												<Table.Td>
													<Group gap="sm">
														<Avatar
															color="cyan"
															radius="xl"
															size={36}
															src={user.image}
														>
															{(user.name ?? "U").charAt(0).toUpperCase()}
														</Avatar>
														<div>
															<div className={styles.userName}>
																{user.name ?? "Unknown"}
															</div>
															<div className={styles.userEmail}>
																{user.email}
															</div>
														</div>
													</Group>
												</Table.Td>
												<Table.Td style={{ textAlign: "right" }}>
													<Badge color="cyan" size="sm" variant="light">
														{user.swipeCount}
													</Badge>
												</Table.Td>
											</Table.Tr>
										))}
									</Table.Tbody>
								</Table>
							) : (
								<Text c="dimmed" py="xl" size="sm" ta="center">
									No user activity yet.
								</Text>
							)}
						</div>
					</SimpleGrid>

					{/* Recent Activity Feed */}
					<div className={styles.glassCard}>
						<Text className={styles.sectionTitle} mb="md">
							Recent Activity
						</Text>
						{recentActivity?.recentSwipes &&
						recentActivity.recentSwipes.length > 0 ? (
							<Stack className={styles.activityFeed} gap="sm">
								{recentActivity.recentSwipes.map((swipe) => (
									<div className={styles.activityItem} key={swipe.id}>
										<Group gap="sm">
											<Avatar
												color="cyan"
												radius="xl"
												size={32}
												src={swipe.user.image}
											>
												{(swipe.user.name ?? "U").charAt(0).toUpperCase()}
											</Avatar>
											<div>
												<div className={styles.activityUser}>
													{swipe.user.name ?? "Unknown"}
												</div>
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
							<Text c="dimmed" py="xl" size="sm" ta="center">
								No recent activity yet.
							</Text>
						)}
					</div>
				</Stack>
			</div>
		</Box>
	);
};

export default AdminPage;
