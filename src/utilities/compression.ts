/**
 * Gzip + base64 codec for storing text content in VS Code settings values.
 *
 * Uses the web-standard CompressionStream/DecompressionStream and btoa/atob
 * globals, which are available in both the desktop (Node >= 18) and browser
 * extension hosts — no Node-specific imports.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Reads a stream to completion and returns its bytes.
 */
async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Encodes bytes as base64. btoa takes a binary string, so the input is
 * chunked to avoid exceeding the argument-spread call stack limit.
 */
function bytesToBase64(bytes: Uint8Array): string {
	const chunkSize = 0x8000;

	let binary = '';

	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}

	return btoa(binary);
}

/**
 * Decodes a base64 string into bytes.
 * @throws When the input is not valid base64.
 */
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);

	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}

	return bytes;
}

/**
 * Compresses a text with gzip and encodes the result as base64.
 * @param text The text to compress.
 * @returns The gzip-compressed content as a base64 string.
 */
export async function compressToBase64(text: string): Promise<string> {
	const stream = new Blob([encoder.encode(text)]).stream().pipeThrough(new CompressionStream('gzip'));

	return bytesToBase64(await streamToBytes(stream));
}

/**
 * Decodes a base64 string and decompresses its gzip content back into text.
 * @param base64 A base64 string holding gzip-compressed content.
 * @returns The decompressed text.
 * @throws When the input is not valid base64 or not valid gzip data.
 */
export async function decompressFromBase64(base64: string): Promise<string> {
	const stream = new Blob([base64ToBytes(base64)]).stream().pipeThrough(new DecompressionStream('gzip'));

	return decoder.decode(await streamToBytes(stream));
}
