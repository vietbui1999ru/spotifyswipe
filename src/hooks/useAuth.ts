/**
 * Authentication Hook
 * Provides easy access to authentication state and methods
 */

'use client';

import { useAuth as useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  return useAuthContext();
}
