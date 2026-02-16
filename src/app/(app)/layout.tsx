"use client";

import type { ReactNode } from "react";
import OnboardingGuard from "../_components/OnboardingGuard";

export default function AppLayout({ children }: { children: ReactNode }) {
	return <OnboardingGuard>{children}</OnboardingGuard>;
}
