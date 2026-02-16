"use client";

import { Card, Center, Loader, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "~/lib/auth-client";
import SignIn from "../_components/SignIn";

const SignUpPage = () => {
	const { data: session, isPending } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (!isPending && session) {
			router.replace("/onboarding");
		}
	}, [session, isPending, router]);

	if (isPending) {
		return (
			<Center h="100vh">
				<Loader size="lg" />
			</Center>
		);
	}

	if (session) {
		return null;
	}

	return (
		<Center h="100vh">
			<Card maw={420} p="xl" radius="md" shadow="md" w="100%" withBorder>
				<Title mb="lg" order={2} ta="center">
					Create your account
				</Title>
				<SignIn mode="sign-up" />
			</Card>
		</Center>
	);
};

export default SignUpPage;
