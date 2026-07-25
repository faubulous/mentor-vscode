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

	it('builds canonical URIs from settings-backed file paths', () => {
		expect(UserUri.forPath('shapes/my-shapes.ttl')).toBe('user:///shapes/my-shapes.ttl');
		expect(UserUri.forPath('/shapes/my-shapes.ttl')).toBe('user:///shapes/my-shapes.ttl');
		expect(UserUri.forPath('shapes/core/base.ttl')).toBe('user:///shapes/core/base.ttl');
	});
});
