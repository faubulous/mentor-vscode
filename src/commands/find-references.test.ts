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
import { findReferences } from './find-references';

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

describe('findReferences', () => {
	it('should have the correct command id', () => {
		expect(findReferences.id).toBe('mentor.command.findReferences');
	});

	it('should do nothing when activateDocument returns no editor', async () => {
		mockActivateDocument.mockResolvedValue(undefined);
		const execSpy = vi.spyOn(vscode.commands, 'executeCommand');

		await findReferences.handler('urn:ex#Res');

		expect(execSpy).not.toHaveBeenCalledWith('references-view.findReferences', expect.anything());
	});

	it('should execute findReferences when a definition location is found', async () => {
		const editor = makeEditor();
		mockActivateDocument.mockResolvedValue(editor);

		const loc = makeLocation('file:///doc.ttl', 5, 0, 5, 20);
		const { ResourceDefinitionProvider } = await import('@src/providers');
		vi.spyOn(ResourceDefinitionProvider.prototype, 'provideDefinitionForResource').mockReturnValue(loc);

		const execSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined as any);

		await findReferences.handler('urn:ex#Res');

		expect(execSpy).toHaveBeenCalledWith('references-view.findReferences', expect.anything());
	});
});
