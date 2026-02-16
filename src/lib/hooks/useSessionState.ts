"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * useState backed by sessionStorage.
 * Persists across client-side navigation and page reloads within the same tab.
 * Falls back to defaultValue on SSR or when sessionStorage is unavailable.
 */
export function useSessionState<T>(
	key: string,
	defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
	const [state, setState] = useState<T>(() => {
		if (typeof window === "undefined") return defaultValue;
		try {
			const stored = sessionStorage.getItem(key);
			return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
		} catch {
			return defaultValue;
		}
	});

	useEffect(() => {
		try {
			sessionStorage.setItem(key, JSON.stringify(state));
		} catch {
			// sessionStorage full or unavailable
		}
	}, [key, state]);

	const wrappedSetState = useCallback((value: T | ((prev: T) => T)) => {
		setState(value);
	}, []);

	return [state, wrappedSetState];
}
