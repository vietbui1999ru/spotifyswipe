"use client";

import { usePathname } from "next/navigation";
import { Component, type ReactNode, useEffect, useRef } from "react";
import { installGlobalErrorHandlers, reportBug } from "~/lib/bug-monitor";

// ─── React Error Boundary ──────────────────────────────────────────────────

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		reportBug({
			type: "react-error",
			message: error.message,
			stack: error.stack,
			metadata: {
				componentStack: errorInfo.componentStack ?? undefined,
			},
		});
	}

	render(): ReactNode {
		if (this.state.hasError) {
			return (
				<div
					style={{
						padding: "2rem",
						textAlign: "center",
						color: "rgba(255,255,255,0.8)",
					}}
				>
					<h2>Something went wrong</h2>
					<p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
						{this.state.error?.message ?? "An unexpected error occurred."}
					</p>
					<button
						onClick={() => this.setState({ hasError: false, error: null })}
						style={{
							marginTop: "1rem",
							padding: "0.5rem 1.5rem",
							background: "rgba(34, 211, 238, 0.2)",
							border: "1px solid rgba(34, 211, 238, 0.4)",
							borderRadius: "0.5rem",
							color: "white",
							cursor: "pointer",
						}}
						type="button"
					>
						Try Again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

// ─── Navigation Monitor ────────────────────────────────────────────────────

function NavigationMonitor(): null {
	const pathname = usePathname();
	const prevPathRef = useRef(pathname);

	// Install global error handlers once
	useEffect(() => {
		const cleanup = installGlobalErrorHandlers();
		console.debug("[BugMonitor] Global error handlers installed");
		return cleanup;
	}, []);

	// Track navigation events
	useEffect(() => {
		const from = prevPathRef.current;
		const to = pathname;

		if (from !== to) {
			console.debug(`[BugMonitor] Navigation: ${from} → ${to}`);
			prevPathRef.current = to;
		}
	}, [pathname]);

	return null;
}

// ─── Combined Provider ─────────────────────────────────────────────────────

export function BugMonitorProvider({ children }: { children: ReactNode }) {
	return (
		<ErrorBoundary>
			<NavigationMonitor />
			{children}
		</ErrorBoundary>
	);
}
