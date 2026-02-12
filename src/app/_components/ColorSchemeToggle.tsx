import {
	ActionIcon,
	Group,
	useComputedColorScheme,
	useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import cx from "clsx";
import classes from "~/styles/ColorSchemeToggle.module.css";

const ActionToggle = () => {
	const { setColorScheme } = useMantineColorScheme();
	const computedColorScheme = useComputedColorScheme("light", {
		getInitialValueInEffect: true,
	});

	return (
		<Group justify="center">
			<ActionIcon
				aria-label="Toggle color scheme"
				onClick={() =>
					setColorScheme(computedColorScheme === "light" ? "dark" : "light")
				}
				radius="md"
				size="xl"
				variant="default"
			>
				<IconSun className={cx(classes.icon, classes.light)} stroke={1.5} />
				<IconMoon className={cx(classes.icon, classes.dark)} stroke={1.5} />
			</ActionIcon>
		</Group>
	);
};

export default ActionToggle;
