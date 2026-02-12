"use client";

import { Button } from "@mantine/core";
import { IconBrandLastfm } from "@tabler/icons-react";
import { signIn } from "next-auth/react";

interface SignInProps {
	redirectTo?: string;
}

const SignIn = ({ redirectTo = "/dashboard" }: SignInProps) => {
	const handleSignIn = async () => {
		// NextAuth handles the callback URL configuration server-side
		// Just pass the redirect destination
		await signIn("lastfm", {
			redirect: true,
			callbackUrl: redirectTo,
		});
	};

	return (
		<Button
			gradient={{ from: "red", to: "pink" }}
			leftSection={<IconBrandLastfm size={18} />}
			onClick={handleSignIn}
			radius="md"
			size="lg"
			variant="gradient"
		>
			Sign in with Last.fm
		</Button>
	);
};

export default SignIn;
