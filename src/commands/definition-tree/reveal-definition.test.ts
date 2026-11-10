import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockActivateDocument, mockActiveContext, mockRevealTarget } = vi.hoisted(() => ({
	mockActivateDocument: vi.fn(),
	mockActiveContext: { graphs: ['urn:g1'], uri: undefined as unknown },
	mockRevealTarget: {
		registered: false,
		revealDefinition: vi.fn((_documentUri: unknown, _resource: string) => true),
		filterDefinitions: vi.fn((_documentUri: unknown, _label: string, _resources: readonly string[]) => true)
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		isRegistered: vi.fn((token: string) => token === ServiceToken.DefinitionRevealTarget && mockRevealTarget.registered),
		resolve: vi.fn((token: string) => {
			if (token === ServiceToken.DocumentContextService) return {
				activateDocument: mockActivateDocument,
				activeContext: mockActiveContext,
			};
			if (token === ServiceToken.DefinitionRevealTarget) return mockRevealTarget;
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
	mockRevealTarget.registered = false;
	mockRevealTarget.revealDefinition.mockReturnValue(true);
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

	it('leaves the definition to an editor in front that shows definitions, by an IRI or by the identifier of a blank node', async () => {
		mockRevealTarget.registered = true;
		mockActiveContext.uri = vscode.Uri.parse('file:///doc.ttl');

		await revealDefinition.handler('http://example.org/A');
		await revealDefinition.handler('c1x2_k9b3');

		expect(mockRevealTarget.revealDefinition.mock.calls.map(([, resource]) => resource)).toEqual(['http://example.org/A', 'c1x2_k9b3']);
		expect(mockActivateDocument).not.toHaveBeenCalled();
	});

	it('opens a text editor when the editor in front declines the definition', async () => {
		const editor = makeEditor();
		const loc = makeLocation('file:///doc.ttl', 3, 0, 3, 8);
		const { ResourceDefinitionProvider } = await import('@src/providers');

		mockRevealTarget.registered = true;
		mockRevealTarget.revealDefinition.mockReturnValue(false);
		mockActiveContext.uri = vscode.Uri.parse('file:///doc.ttl');
		mockActivateDocument.mockResolvedValue(editor);
		vi.spyOn(ResourceDefinitionProvider.prototype, 'provideDefinitionForResource').mockReturnValue(loc);

		await revealDefinition.handler('urn:store:b1');

		expect(mockRevealTarget.revealDefinition).toHaveBeenCalledWith(mockActiveContext.uri, 'urn:store:b1');
		expect(editor.revealRange).toHaveBeenCalledWith(loc.range, expect.anything());
	});
});
