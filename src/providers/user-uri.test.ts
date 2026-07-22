import * as vscode from 'vscode';
import { describe, it, expect } from 'vitest';
import { UserUri } from '@src/providers/user-uri';

describe('UserUri', () => {
	it('canonicalizes user URIs to the triple-slash form', () => {
		// vscode.Uri.toString() drops the empty authority, producing 'user:/…'.
		const uri = vscode.Uri.parse('user:///shapes/my-shapes.ttl');

		expect(uri.toString()).toBe('user:/shapes/my-shapes.ttl');
		expect(UserUri.toCanonicalString(uri)).toBe('user:///shapes/my-shapes.ttl');
	});

	it('returns string inputs unchanged', () => {
		expect(UserUri.toCanonicalString('user:///shapes/my-shapes.ttl')).toBe('user:///shapes/my-shapes.ttl');
	});

	it('delegates non-user URIs to plain toString', () => {
		const uri = vscode.Uri.parse('https://example.org/shapes');

		expect(UserUri.toCanonicalString(uri)).toBe('https://example.org/shapes');
	});

	it('detects user URIs from strings and URI objects', () => {
		expect(UserUri.isUserUri('user:///shapes/x.ttl')).toBe(true);
		expect(UserUri.isUserUri(vscode.Uri.parse('user:///shapes/x.ttl'))).toBe(true);
		expect(UserUri.isUserUri('workspace:///x.ttl')).toBe(false);
		expect(UserUri.isUserUri('https://example.org/user')).toBe(false);
	});

	it('builds canonical file URIs for a settings-backed folder', () => {
		expect(UserUri.forFile('/shapes', 'my-shapes.ttl')).toBe('user:///shapes/my-shapes.ttl');
		expect(UserUri.forFile('shapes', 'my-shapes.ttl')).toBe('user:///shapes/my-shapes.ttl');
	});
});
