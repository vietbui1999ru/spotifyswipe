"use client";

import { Box, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import styles from "~/styles/shareboard.module.css";
import ShareboardDetail from "./_components/ShareboardDetail";
import ShareboardGrid from "./_components/ShareboardGrid";

const ShareboardPage = () => {
	const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
	const [opened, { open, close }] = useDisclosure(false);

	const handleSelectPost = (id: string) => {
		setSelectedPostId(id);
		open();
	};

	const handleClose = () => {
		close();
		setSelectedPostId(null);
	};

	return (
		<Box className={styles.container}>
			<ShareboardGrid onSelectPost={handleSelectPost} />

			<Modal
				centered
				onClose={handleClose}
				opened={opened}
				overlayProps={{ blur: 4, backgroundOpacity: 0.6 }}
				radius="lg"
				size="lg"
				styles={{
					body: { background: "rgba(24, 24, 27, 0.95)" },
					header: { background: "rgba(24, 24, 27, 0.95)" },
					content: { background: "rgba(24, 24, 27, 0.95)" },
				}}
				title={null}
				withCloseButton={false}
			>
				{selectedPostId && (
					<ShareboardDetail
						onClose={handleClose}
						shareboardId={selectedPostId}
					/>
				)}
			</Modal>
		</Box>
	);
};

export default ShareboardPage;
