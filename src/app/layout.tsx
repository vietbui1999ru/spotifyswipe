// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";

import {
	ColorSchemeScript,
	MantineProvider,
	mantineHtmlProps,
} from "@mantine/core";
import { TRPCReactProvider } from "~/trpc/react";
import { AuthProvider } from "./_components/AuthProvider";

export const metadata = {
	title: "Discover Music App",
	description: "Discover and Share Music with people",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" {...mantineHtmlProps}>
			<head>
				<ColorSchemeScript />
			</head>
			<body>
				<AuthProvider>
					<TRPCReactProvider>
						<MantineProvider defaultColorScheme="dark">
							{children}
						</MantineProvider>
					</TRPCReactProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
