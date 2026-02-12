import { Card, Container, SimpleGrid } from "@mantine/core";

const MusicExploreArea = () => {
	return (
		<Container strategy="grid">
			<SimpleGrid cols={{ base: 1, xs: 3 }} spacing="50px">
				<Card />
			</SimpleGrid>
		</Container>
	);
};

export default MusicExploreArea;
