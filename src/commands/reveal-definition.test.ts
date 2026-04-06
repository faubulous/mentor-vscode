import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockActivateDocument, mockActiveContext } = vi.hoisted(() => ({
	mockActivateDocument: vi.fn(),
	mockActiveContext: { graphs: ['urn:g1'] },
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return {
				activateDocument: mockActivateDocument,
				activeContext: mockActiveContext,
			};
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@faubulous/mentor-rdf', () => ({
	VocabularyRepository: class {},
}));

import * as vscode from 'vscode';
import { revealDefinition } from './reveal-definition';

function makeEditor(uriStr = 'file:///doc.ttl') {
	return {
		document: { uri: vscode.Uri.parse(uriStr) },
		selection: undefined as any,
		revealRange: vi.fn(),
	};
}

function makeRange(sl: number, sc: number, el: number, ec: number) {
	return new (vscode as any).Range(sl, sc, el, ec);
}

function makeLocation(uriStr: string, sl: number, sc: number, el: number, ec: number) {
	return new (vscode as any).Location(vscode.Uri.parse(uriStr), makeRange(sl, sc, el, ec));
}

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.window as any).activeTextEditor = undefined;
	mockActivateDocument.mockResolvedValue(undefined);
});

afterEach(() => {
	(vscode.window as any).activeTextEditor = undefined;
});

describe('revealDefinition', () => {
	it('should have the correct command id', () => {
		expect(revealDefinition.id).toBe('mentor.command.revealDefinition');
	});

	it('should do nothing when arg is empty string', async () => {
		const editor = makeEditor();
		mockActivateDocument.mockResolvedValue(editor);
		const execSpy = vi.spyOn(vscode.commands, 'executeCommand');

		await revealDefinition.handler('');

		expect(editor.revealRange).not.toHaveBeenCalled();
		expect(execSpy).not.toHaveBeenCalledWith('mentor.view.definitionTree.focus', expect.anything());
	});

	it('should reveal the range when a definition location is found', async () => {
		const editor = makeEditor();
		mockActivateDocument.mockResolvedValue(editor);

		const loc = makeLocation('file:///doc.ttl', 10, 4, 10, 24);
		const { ResourceDefinitionProvider } = await import('@src/providers');
		vi.spyOn(ResourceDefinitionProvider.prototype, 'provideDefinitionForResource').mockReturnValue(loc);

		await revealDefinition.handler('urn:ex#X');

		expect(editor.revealRange).toHaveBeenCalledWith(loc.range, expect.anything());
	});

	it('should reset focus when restoreFocus is true', async () => {
		const editor = makeEditor();
		mockActivateDocument.mockResolvedValue(editor);

		const loc = makeLocation('file:///doc.ttl', 2, 0, 2, 10);
		const { ResourceDefinitionProvider } = await import('@src/providers');
		vi.spyOn(ResourceDefinitionProvider.prototype, 'provideDefinitionForResource').mockReturnValue(loc);
		const execSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined as any);

		await revealDefinition.handler('urn:ex#X', true);

		expect(execSpy).toHaveBeenCalledWith('mentor.view.definitionTree.focus');
	});
});
