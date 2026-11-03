import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import 'reflect-metadata';
import * as vscode from 'vscode';
import { createMockWebviewPanel } from '@src/utilities/mocks/vscode';
import { DisabledFormEditorProvider } from './disabled-form-editor-provider';

describe('DisabledFormEditorProvider', () => {
	it('shows a document the form editor was asked for in the text editor, in place of its tab', async () => {
		const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;
		const provider = new DisabledFormEditorProvider(context);
		const panel = createMockWebviewPanel() as unknown as vscode.WebviewPanel;
		const document = { uri: vscode.Uri.parse('file:///workspace/test.ttl') } as vscode.TextDocument;
		const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);
		const dispose = vi.spyOn(panel, 'dispose');

		await provider.resolveCustomTextEditor(document, panel);

		expect(executeCommand).toHaveBeenCalledWith('vscode.openWith', document.uri, 'default', panel.viewColumn);
		expect(dispose).toHaveBeenCalled();
		expect(context.subscriptions).toHaveLength(1);
	});
});
