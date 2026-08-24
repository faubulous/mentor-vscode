import * as vscode from 'vscode';
import { describe, it, expect } from 'vitest';
import { describeUriPath } from '@src/utilities/vscode/log';

describe('describeUriPath', () => {
	it('preserves the case of a Windows drive letter that toString() would lowercase', () => {
		// This is the whole point of the helper: workspace mapping compares `Uri.path`, but every
		// serialising accessor lowercases the drive letter, so a mismatch is invisible in a log.
		const uri = vscode.Uri.parse('file:///C:/projects/vocabularies/models/skos.ttl');

		expect(uri.toString()).toContain('/c%3A/');
		expect(uri.toString(true)).toContain('/c:/');
		expect(uri.fsPath.startsWith('c:')).toBe(true);

		expect(describeUriPath(uri)).toBe('file:///C:/projects/vocabularies/models/skos.ttl');
	});

	it('makes a root and a file that failed to map against it visibly different', () => {
		const root = vscode.Uri.parse('file:///C:/projects/vocabularies');
		const fileUri = vscode.Uri.parse('file:///c:/projects/vocabularies/models/skos.ttl');

		// Serialised, the file looks like it sits under the root.
		expect(fileUri.toString().startsWith(root.toString())).toBe(true);

		// Described by raw path, the mismatch that the comparison sees is legible.
		expect(describeUriPath(fileUri).startsWith(describeUriPath(root))).toBe(false);
	});

	it('leaves path segments unencoded so the logged text is the string that was compared', () => {
		const uri = vscode.Uri.parse('file:///projects/My%20Vocabularies/skos.ttl');

		expect(describeUriPath(uri)).toBe('file:///projects/My Vocabularies/skos.ttl');
	});

	it('includes the authority for remote URIs', () => {
		const uri = vscode.Uri.parse('vscode-vfs://github/owner/repo/models/skos.ttl');

		expect(describeUriPath(uri)).toBe('vscode-vfs://github/owner/repo/models/skos.ttl');
	});

	it('describes workspace URIs in the canonical triple-slash form', () => {
		const uri = vscode.Uri.from({ scheme: 'workspace', path: '/models/skos.ttl' });

		expect(describeUriPath(uri)).toBe('workspace:///models/skos.ttl');
	});

	it('returns <none> when no URI is given', () => {
		expect(describeUriPath(undefined)).toBe('<none>');
	});
});
