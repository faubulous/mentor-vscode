import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import 'reflect-metadata';
import * as vscode from 'vscode';
import { __events } from '@src/utilities/mocks/vscode';
import { createMockTextDocument, createMockTextEditor } from '@src/utilities/mocks/factories';
import { FormEditorDefaultView } from './form-editor-default-view';
import { FormEditorProvider } from './form-editor-provider';

const URI = 'file:///workspace/test.ttl';

/**
 * Show the given tabs in the one tab group of the window.
 */
function showTabs(...inputs: unknown[]): void {
	(vscode.window.tabGroups as unknown as { all: unknown[] }).all = [{ tabs: inputs.map(input => ({ input })) }];
}

/**
 * Make the text editor of a document the active one.
 */
async function activate(uri = URI, languageId = 'turtle'): Promise<void> {
	__events.fireDidChangeActiveTextEditor(createMockTextEditor(createMockTextDocument('', { uri, languageId })));
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
		showTabs();
		configureDefaultView('form');
		executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);
	});

	afterEach(() => {
		service?.dispose();
		vi.restoreAllMocks();
	});

	it('reopens a document that was just opened as text in the form editor', async () => {
		service = new FormEditorDefaultView();

		showTabs(new vscode.TabInputText(vscode.Uri.parse(URI)));
		await activate();

		expect(openedWith(executeCommand)).toEqual([FormEditorProvider.viewType]);
	});

	it('leaves a document alone when the text editor is the default', async () => {
		configureDefaultView('text');
		service = new FormEditorDefaultView();

		showTabs(new vscode.TabInputText(vscode.Uri.parse(URI)));
		await activate();

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('leaves a text editor alone that was already open', async () => {
		showTabs(new vscode.TabInputText(vscode.Uri.parse(URI)));
		service = new FormEditorDefaultView();

		await activate();

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('remembers a document the user switched to the text editor', async () => {
		service = new FormEditorDefaultView();
		service.dismiss(vscode.Uri.parse(URI));

		showTabs(new vscode.TabInputText(vscode.Uri.parse(URI)));
		await activate();

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('takes a form replaced by the text editor as the user choosing the text editor', async () => {
		showTabs(new vscode.TabInputCustom(vscode.Uri.parse(URI), FormEditorProvider.viewType));
		service = new FormEditorDefaultView();

		showTabs(new vscode.TabInputText(vscode.Uri.parse(URI)));
		await activate();
		await activate();

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('leaves a text editor alone that was opened beside the form of the document', async () => {
		showTabs(new vscode.TabInputCustom(vscode.Uri.parse(URI), FormEditorProvider.viewType));
		service = new FormEditorDefaultView();

		showTabs(new vscode.TabInputCustom(vscode.Uri.parse(URI), FormEditorProvider.viewType), new vscode.TabInputText(vscode.Uri.parse(URI)));
		await activate();

		expect(openedWith(executeCommand)).toEqual([]);
	});

	it('applies only to RDF documents backed by files', async () => {
		service = new FormEditorDefaultView();

		await activate('untitled:Untitled-1');
		await activate('file:///workspace/query.sparql', 'sparql');

		expect(openedWith(executeCommand)).toEqual([]);
	});
});
