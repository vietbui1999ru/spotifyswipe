const CODE_VERIFIER_LENGTH = 128;
const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
];

function base64UrlEncode(array: Uint8Array): string {
  const str = String.fromCharCode(...array);
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateCodeVerifier(): string {
  const verifier = generateRandomString(CODE_VERIFIER_LENGTH);
  return verifier;
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

export function storePKCEVerifier(verifier: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pkce_code_verifier', verifier);
  }
}

export function getPKCEVerifier(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pkce_code_verifier');
  }
  return null;
}

export function clearPKCEVerifier(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pkce_code_verifier');
  }
}

export { CODE_VERIFIER_LENGTH, SPOTIFY_SCOPES };
