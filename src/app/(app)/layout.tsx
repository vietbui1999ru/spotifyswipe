"use client";

import type { ReactNode } from "react";
import { DemoBanner } from "../_components/DemoBanner";
import OnboardingGuard from "../_components/OnboardingGuard";

export default function AppLayout({ children }: { children: ReactNode }) {
	return (
		<OnboardingGuard>
			<DemoBanner />
			{children}
		</OnboardingGuard>
	);
}
