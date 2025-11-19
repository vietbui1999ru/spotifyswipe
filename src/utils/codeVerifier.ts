const generateRandomString = (length: number) => {
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const values = crypto.getRandomValues(new Uint8Array(length));
	return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

const codeVerifier = generateRandomString(64);

const sha256 = async (plain: string) => {
	const encoder = new TextEncoder()
	const data = encoder.encode(plain)
	return crypto.subtle.digest('SHA-256', data)
}

const base64encode = (input: ArrayBuffer) => {
	return btoa(String.fromCharCode(...new Uint8Array(input)))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

export const getCodeChallenge = async (codeVerifier: string) => {
	const sha256Hash = await sha256(codeVerifier);
	return base64encode(sha256Hash);
}

export const getCodeChallengeMethod = () => {
	return 'S256';
}

export const getCodeVerifier = () => {
	return codeVerifier;
}

