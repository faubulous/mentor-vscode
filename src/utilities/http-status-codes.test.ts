import { describe, it, expect } from 'vitest';
import { HttpStatusCodes } from '@src/utilities/http-status-codes';

describe('HttpStatusCodes', () => {
	it('contains a 200 OK entry', () => {
		expect(HttpStatusCodes['200']).toBeDefined();
		expect(HttpStatusCodes['200'].code).toBe(200);
		expect(HttpStatusCodes['200'].message).toBe('OK');
	});

	it('contains a 404 Not Found entry', () => {
		expect(HttpStatusCodes['404']).toBeDefined();
		expect(HttpStatusCodes['404'].code).toBe(404);
		expect(HttpStatusCodes['404'].message).toBe('Not Found');
	});

	it('contains a 500 Internal Server Error entry', () => {
		expect(HttpStatusCodes['500']).toBeDefined();
		expect(HttpStatusCodes['500'].code).toBe(500);
		expect(HttpStatusCodes['500'].message).toBe('Internal Server Error');
	});

	it('contains a 499 Client Closed Request entry (used by CancellationError)', () => {
		expect(HttpStatusCodes['499']).toBeDefined();
		expect(HttpStatusCodes['499'].code).toBe(499);
	});

	it('every entry has a code, message, and description', () => {
		for (const [key, value] of Object.entries(HttpStatusCodes)) {
			expect(typeof value.code, `code for ${key}`).toBe('number');
			expect(typeof value.message, `message for ${key}`).toBe('string');
			expect(typeof value.description, `description for ${key}`).toBe('string');
		}
	});

	it('string key matches the numeric code', () => {
		for (const [key, value] of Object.entries(HttpStatusCodes)) {
			expect(value.code, `key=${key}`).toBe(Number(key));
		}
	});
});
