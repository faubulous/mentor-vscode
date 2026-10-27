import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import 'reflect-metadata';
import * as vscode from 'vscode';
import { __events } from '@src/utilities/mocks/vscode';
import { createMockTextDocument } from '@src/utilities/mocks/factories';
import { FormEditorDefaultView } from './form-editor-default-view';
import { FormEditorProvider } from './form-editor-provider';

const URI = 'file:///workspace/test.ttl';

/**
 * A text editor tab of a document.
 */
function textTab(uri: string): { input: vscode.TabInputText } {
	return { input: new vscode.TabInputText(vscode.Uri.parse(uri)) };
}

/**
 * A form editor tab of a document.
 */
function formTab(uri: string): { input: vscode.TabInputCustom } {
	return { input: new vscode.TabInputCustom(vscode.Uri.parse(uri), FormEditorProvider.viewType) };
}

/**
 * Show the given tabs in the one tab group of the window.
 */
function showTabs(...tabs: unknown[]): void {
	(vscode.window.tabGroups as unknown as { all: unknown[] }).all = [{ tabs }];
}

/**
 * Report tabs that opened and closed, and let the service act on it.
 */
async function changeTabs(change: { opened?: unknown[]; closed?: unknown[] }): Promise<void> {
	__events.fireDidChangeTabs({ opened: change.opened ?? [], closed: change.closed ?? [], changed: [] });
	await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Configure the default view.
 */
function configureDefaultView(view: string): void {
	vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: (key: string) => key === 'formEditor.defaultView' ? view : undefined } as unknown as vscode.WorkspaceConfiguration);
}

/**
 * The view switches requested through `vscode.openWith`.
 */
function openedWith(spy: { mock: { calls: unknown[][] } }): string[] {
	return spy.mock.calls.filter(call => call[0] === 'vscode.openWith').map(call => String(call[2]));
}

describe('FormEditorDefaultView', () => {
	let executeCommand: { mock: { calls: unknown[][] } };
	let service: FormEditorDefaultView | undefined;

	beforeEach(() => {
		__events.reset();
		showTabs();
		configureDefaultView('form');
		vi.spyOn(vscode.workspace, 'openTextDocument').mockImplementation(async uri => createMockTextDocument('', { uri: uri as vscode.Uri, languageId: String(uri).endsWith('.sparql') ? 'sparql' : 'turtle' }));
		executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);
		service = new FormEditorDefaultView();
	});

	afterEach(() => {
		service?.dispose();
		vi.restoreAllMocks();
	});

	it('reopens a document in the form editor when a text editor opens for it', async () => {
		showTabs(textTab(URI));
		await changeTabs({ opened: [textTab(URI)] });

		expect(openedWith(executeCommand)).toEqual([FormEditorProvider.viewType]);
	});

	it('reopens a document again right after its form editor was closed', async () => {
		await changeTabs({ closed: [formTab(URI)] });
		showTabs(textTab(URI));
		await changeTabs({ opened: [textTab(URI)] });

		expect(openedWith(executeCommand)).toEqual([FormEditorProvider.viewType]);
	});

	it('leaves a document alone when the text editor is the default', async () => {
		configureDefaultView('text');
		showTabs(textTab(URI));
		await changeTabs({ opened: [textTab(URI)] });

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('does nothing when the user switches between open tabs', async () => {
		showTabs(textTab(URI), formTab('file:///workspace/other.ttl'));
		await changeTabs({ opened: [], closed: [] });

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('remembers a document the user switched to the text editor', async () => {
		service!.dismiss(vscode.Uri.parse(URI));
		showTabs(textTab(URI));
		await changeTabs({ opened: [textTab(URI)] });

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('leaves a text editor alone that was opened beside the form of the document', async () => {
		showTabs(formTab(URI), textTab(URI));
		await changeTabs({ opened: [textTab(URI)] });

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('leaves the text editor the user reopened the document with, which VS Code opens before it closes the form', async () => {
		showTabs(formTab(URI), textTab(URI));
		await changeTabs({ opened: [textTab(URI)] });

		showTabs(textTab(URI));
		await changeTabs({ closed: [formTab(URI)] });

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('applies only to RDF documents backed by files', async () => {
		showTabs(textTab('untitled:Untitled-1'), textTab('file:///workspace/query.sparql'));
		await changeTabs({ opened: [textTab('untitled:Untitled-1'), textTab('file:///workspace/query.sparql')] });

		expect(openedWith(executeCommand)).toEqual([]);
	});
});
