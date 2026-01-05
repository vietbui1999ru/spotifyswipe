export function encryptToken(token: string): string {
	return Buffer.from(token, 'utf-8').toString('base64');
}

export function decryptToken(encrypted: string): string {
	if (!encrypted) return encrypted;

	const normalizedInput = encrypted.replace(/\s/g, '');
	if (!isBase64(normalizedInput)) {
		return encrypted;
	}

	return Buffer.from(normalizedInput, 'base64').toString('utf-8');
}

function isBase64(value: string): boolean {
	if (!value) return false;
	if (value.length % 4 === 1) return false;

	const buffer = Buffer.from(value, 'base64');
	const reencoded = buffer.toString('base64').replace(/=+$/, '');
	return reencoded === value.replace(/=+$/, '');
}
