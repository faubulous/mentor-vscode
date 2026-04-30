import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({
		get: (_key: string, defaultValue?: any) => defaultValue ?? '',
	}),
}));

import * as vscode from 'vscode';
import { createDocumentFromLanguage } from '@src/commands/create-document-from-language';

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.workspace as any).textDocuments = [];
	(vscode.window as any).activeTextEditor = undefined;
});

afterEach(() => {
	(vscode.workspace as any).textDocuments = [];
});

describe('createDocumentFromLanguage', () => {
	it('should have the correct command id', () => {
		expect(createDocumentFromLanguage.id).toBe('mentor.command.createDocumentFromLanguage');
	});

	it('should open a text document with the given language and default template', async () => {
		const fakeDoc = { uri: { toString: () => 'untitled:1' } };
		vi.spyOn(vscode.workspace as any, 'openTextDocument').mockResolvedValue(fakeDoc);
		const showDoc = vi.spyOn(vscode.window as any, 'showTextDocument');

		await createDocumentFromLanguage.handler('turtle');

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(expect.objectContaining({ language: 'turtle' }));
		expect(showDoc).toHaveBeenCalledWith(fakeDoc);
	});
});
