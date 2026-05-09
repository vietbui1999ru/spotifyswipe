"use client";

import { type ReactNode } from "react";

interface OnboardingGuardProps {
  children: ReactNode;
}

const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  return <>{children}</>;
};

export default OnboardingGuard;
