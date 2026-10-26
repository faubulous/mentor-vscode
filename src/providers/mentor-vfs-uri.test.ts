import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { MentorVfsUri } from '@src/providers/mentor-vfs-uri';
import { PRESET_GRAPHS } from '@src/services/core/preset-graphs';

describe('MentorVfsUri', () => {
	const rdfs = PRESET_GRAPHS.find(graph => graph.path === 'vocabularies/rdfs.ttl')!;

	it('creates the document URI of a preset graph from its path', () => {
		expect(MentorVfsUri.toUri(rdfs).toString()).toBe('mentor-vfs:/vocabularies/rdfs.ttl');
	});

	it('returns the preset graph of every document URI', () => {
		for (const graph of PRESET_GRAPHS) {
			expect(MentorVfsUri.getGraph(MentorVfsUri.toUri(graph))).toBe(graph);
		}
	});

	it('returns undefined for a URI of another scheme', () => {
		expect(MentorVfsUri.getGraph(vscode.Uri.parse('file:///vocabularies/rdfs.ttl'))).toBeUndefined();
	});

	it('returns undefined for an unknown path', () => {
		expect(MentorVfsUri.getGraph(vscode.Uri.parse('mentor-vfs:/vocabularies/unknown.ttl'))).toBeUndefined();
	});
});
