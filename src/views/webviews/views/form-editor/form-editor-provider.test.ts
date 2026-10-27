import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import 'reflect-metadata';

import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { createMockWebviewPanel } from '@src/utilities/mocks/vscode';
import { createMockDocumentContextService, createMockTextDocument } from '@src/utilities/mocks/factories';
import { FormEditorProvider } from './form-editor-provider';

const URI = 'file:///workspace/test.ttl';

/**
 * A resolved editor tab: its panel and the messages posted to it.
 */
interface OpenedEditor {
	panel: ReturnType<typeof createMockWebviewPanel>;
	posted: { id: string }[];
}

/**
 * Make a tab the active one, as VS Code does when the user focuses it.
 */
function activateTab(input: unknown): void {
	(vscode.window.tabGroups.activeTabGroup as { activeTab?: unknown }).activeTab = input === undefined ? undefined : { input };
}

/**
 * Create a provider registered with a bare extension context.
 */
function createProvider(): { provider: FormEditorProvider; subscriptions: vscode.Disposable[] } {
	const subscriptions: vscode.Disposable[] = [];
	const context = { subscriptions, extensionUri: vscode.Uri.parse('file:///extension') } as unknown as vscode.ExtensionContext;

	return { provider: new FormEditorProvider(context), subscriptions };
}

/**
 * Open a document in the provider, as VS Code does for a tab.
 */
async function open(provider: FormEditorProvider, uri = URI): Promise<OpenedEditor> {
	const panel = createMockWebviewPanel();
	const posted: { id: string }[] = [];

	panel.webview.postMessage = async (message: { id: string }) => {
		posted.push(message);

		return true;
	};

	await provider.resolveCustomTextEditor(createMockTextDocument('', { uri }), panel as unknown as vscode.WebviewPanel, { isCancellationRequested: false } as vscode.CancellationToken);

	return { panel, posted };
}

describe('FormEditorProvider', () => {
	beforeEach(() => {
		container.reset();
		container.registerInstance(ServiceToken.DocumentContextService, createMockDocumentContextService());
		activateTab(undefined);
	});

	it('registers itself with VS Code and disposes with the extension', () => {
		const { subscriptions } = createProvider();

		expect(subscriptions).toHaveLength(2);
	});

	it('tracks the documents open in a form editor', async () => {
		const { provider } = createProvider();
		const uri = vscode.Uri.parse(URI);

		expect(provider.isOpen(uri)).toBe(false);

		const { panel } = await open(provider);

		expect(provider.isOpen(uri)).toBe(true);

		panel.dispose();

		expect(provider.isOpen(uri)).toBe(false);
	});

	it('reveals and filters in every editor showing the document', async () => {
		const { provider } = createProvider();
		const first = await open(provider);
		const second = await open(provider);
		const other = await open(provider, 'file:///workspace/other.ttl');

		provider.revealResource(vscode.Uri.parse(URI), 'i:http://example.org/A');
		provider.filterResources(vscode.Uri.parse(URI), 'Classes', ['i:http://example.org/A']);

		// The sessions post the snapshot of the document on their own; the requests follow it.
		const requestsOf = (editor: OpenedEditor) => editor.posted.map(message => message.id).filter(id => id !== 'DocumentSnapshot');

		for (const editor of [first, second]) {
			expect(requestsOf(editor)).toEqual(['ScrollToResource', 'FilterResources']);
		}

		expect(requestsOf(other)).toEqual([]);
	});

	it('is active while the active tab is a form editor of the document', () => {
		const { provider } = createProvider();
		const uri = vscode.Uri.parse(URI);

		expect(provider.isActive(uri)).toBe(false);

		activateTab(new vscode.TabInputCustom(uri, FormEditorProvider.viewType));

		expect(provider.isActive(uri)).toBe(true);
		expect(provider.isActive(vscode.Uri.parse('file:///workspace/other.ttl'))).toBe(false);

		activateTab(new vscode.TabInputText(uri));

		expect(provider.isActive(uri)).toBe(false);
	});

	it('does not open an editor for a tab closed before it resolved', async () => {
		const { provider } = createProvider();

		await provider.resolveCustomTextEditor(createMockTextDocument('', { uri: URI }), createMockWebviewPanel() as unknown as vscode.WebviewPanel, { isCancellationRequested: true } as vscode.CancellationToken);

		expect(provider.isOpen(vscode.Uri.parse(URI))).toBe(false);
	});
});
