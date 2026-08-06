import 'reflect-metadata';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getExcludeGlobForUri } from '@src/commands/workspace/exclude-from-index';

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(() => ({ get: vi.fn((_k: string, d?: any) => d), update: vi.fn() })),
}));

describe('getExcludeGlobForUri', () => {
	beforeEach(() => {
		// Resolve paths relative to a fixed monorepo root.
		WorkspaceUri.rootUri = vscode.Uri.parse('file:///mono');
	});

	afterEach(() => {
		WorkspaceUri.rootUri = undefined;
	});

	test('returns the monorepo-relative path for a file node', () => {
		expect(getExcludeGlobForUri('file:///mono/mentor-vscode/data/ontology.ttl')).toBe('mentor-vscode/data/ontology.ttl');
	});

	test('returns a recursive folder glob scoped to the subproject', () => {
		expect(getExcludeGlobForUri('file:///mono/mentor-rdf-parsers/src/n3')).toBe('mentor-rdf-parsers/src/n3/**');
	});

	test('returns undefined for the monorepo root itself', () => {
		expect(getExcludeGlobForUri('file:///mono')).toBeUndefined();
	});

	test('returns undefined for a path outside the monorepo root', () => {
		expect(getExcludeGlobForUri('file:///elsewhere/file.ttl')).toBeUndefined();
	});
});
