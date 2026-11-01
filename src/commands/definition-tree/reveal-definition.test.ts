import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockActivateDocument, mockActiveContext, mockRevealTarget } = vi.hoisted(() => ({
	mockActivateDocument: vi.fn(),
	mockActiveContext: { graphs: ['urn:g1'] } as { graphs: string[]; uri?: unknown },
	mockRevealTarget: { current: undefined as { revealDefinition: (...args: unknown[]) => boolean; filterDefinitions: (...args: unknown[]) => boolean } | undefined },
}));

vi.mock('tsyringe', () => ({
	container: {
		isRegistered: vi.fn((token: string) => token === ServiceToken.DefinitionRevealTarget && mockRevealTarget.current !== undefined),
		resolve: vi.fn((token: string) => {
			if (token === ServiceToken.DefinitionRevealTarget) return mockRevealTarget.current;
			if (token === ServiceToken.DocumentContextService) return {
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

vi.mock('@faubulous/mentor-rdf', async (importOriginal) => ({
	...await importOriginal<typeof import('@faubulous/mentor-rdf')>(),
	VocabularyRepository: class {},
}));

import * as vscode from 'vscode';
import { revealDefinition } from '@src/commands/definition-tree/reveal-definition';
import { ServiceToken } from '@src/services/tokens';

function makeEditor(uriStr = 'file:///doc.ttl') {
	return {
		document: { uri: vscode.Uri.parse(uriStr) },
		selection: undefined,
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
	mockRevealTarget.current = undefined;
	mockActiveContext.uri = undefined;
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
		const execSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

		await revealDefinition.handler('urn:ex#X', true);

		expect(execSpy).toHaveBeenCalledWith('mentor.view.definitionTree.focus');
	});

	it('leaves the definition to an editor in front that shows it, and opens no text editor', async () => {
		const revealDefinitionSpy = vi.fn(() => true);

		mockRevealTarget.current = { revealDefinition: revealDefinitionSpy, filterDefinitions: vi.fn(() => true) };
		mockActiveContext.uri = vscode.Uri.parse('file:///doc.ttl');

		await revealDefinition.handler('urn:ex#X');

		expect(revealDefinitionSpy).toHaveBeenCalledWith(mockActiveContext.uri, 'urn:ex#X');
		expect(mockActivateDocument).not.toHaveBeenCalled();
	});

	it('opens a text editor when the editor in front does not show the definition', async () => {
		mockRevealTarget.current = { revealDefinition: vi.fn(() => false), filterDefinitions: vi.fn(() => false) };
		mockActiveContext.uri = vscode.Uri.parse('file:///doc.ttl');

		await revealDefinition.handler('urn:ex#X');

		expect(mockActivateDocument).toHaveBeenCalled();
	});
});

