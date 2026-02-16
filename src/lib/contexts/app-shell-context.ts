"use client";

import { createContext, useContext } from "react";

interface AppShellState {
	opened: boolean;
	toggle: () => void;
}

export const AppShellStateContext = createContext<AppShellState | null>(null);

export function useAppShellState(): AppShellState {
	const ctx = useContext(AppShellStateContext);
	if (!ctx) {
		throw new Error(
			"useAppShellState must be used within AppShellStateContext",
		);
	}
	return ctx;
}
