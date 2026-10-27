import * as vscode from 'vscode';
import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveTabResource, resolveActiveRdfDocument } from './active-rdf-document';

/**
 * Create a text document stub that is recognized as open by the workspace mock.
 */
function createDocument(uri: string): vscode.TextDocument {
	return { uri: vscode.Uri.parse(uri) } as vscode.TextDocument;
}

describe('resolveActiveRdfDocument', () => {
	beforeEach(() => {
		(vscode.window as any).activeTextEditor = undefined;
		(vscode.window as any).tabGroups.activeTabGroup = { activeTab: undefined, tabs: [] };
		(vscode.workspace as any).textDocuments = [];
	});

	it('prefers the resource passed by the editor action', async () => {
		const document = createDocument('file:///passed.ttl');
		(vscode.workspace as any).textDocuments = [document];
		(vscode.window as any).activeTextEditor = { document: createDocument('file:///active.ttl') };

		const result = await resolveActiveRdfDocument(document.uri);

		expect(result?.uri.toString()).toBe('file:///passed.ttl');
	});

	it('falls back to the active text editor when no resource is passed', async () => {
		const document = createDocument('file:///active.ttl');
		(vscode.window as any).activeTextEditor = { document };

		const result = await resolveActiveRdfDocument();

		expect(result?.uri.toString()).toBe('file:///active.ttl');
	});

	it('resolves the active tab resource when there is no active text editor', async () => {
		const document = createDocument('file:///tab.ttl');
		(vscode.workspace as any).textDocuments = [document];
		(vscode.window as any).tabGroups.activeTabGroup = {
			activeTab: { input: { uri: document.uri, viewType: 'mentor.formEditor' } },
			tabs: []
		};

		const result = await resolveActiveRdfDocument();

		expect(result?.uri.toString()).toBe('file:///tab.ttl');
	});

	it('returns undefined when nothing is active', async () => {
		expect(await resolveActiveRdfDocument()).toBeUndefined();
	});
});

describe('getActiveTabResource', () => {
	beforeEach(() => {
		(vscode.window as any).tabGroups.activeTabGroup = { activeTab: undefined, tabs: [] };
	});

	it('returns undefined for a tab without a resource', () => {
		(vscode.window as any).tabGroups.activeTabGroup = { activeTab: { input: {} }, tabs: [] };

		expect(getActiveTabResource()).toBeUndefined();
	});
});
