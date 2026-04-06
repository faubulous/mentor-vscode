import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockActivateDocument, mockActiveContext, mockGetShapes } = vi.hoisted(() => ({
	mockActivateDocument: vi.fn(),
	mockActiveContext: { graphs: ['urn:g1'] },
	mockGetShapes: vi.fn(function*() {}),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return {
				activateDocument: mockActivateDocument,
				activeContext: mockActiveContext,
			};
			if (token === 'VocabularyRepository') return {
				getShapes: mockGetShapes,
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
import { revealShapeDefinition } from './reveal-shape-definition';

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
	mockGetShapes.mockImplementation(function*() {});
});

afterEach(() => {
	(vscode.window as any).activeTextEditor = undefined;
});

describe('revealShapeDefinition', () => {
	it('should have the correct command id', () => {
		expect(revealShapeDefinition.id).toBe('mentor.command.revealShapeDefinition');
	});

	it('should do nothing when arg is empty string', async () => {
		const editor = makeEditor();
		mockActivateDocument.mockResolvedValue(editor);

		await revealShapeDefinition.handler('');

		expect(editor.revealRange).not.toHaveBeenCalled();
	});

	it('should do nothing when no shape is found for the URI', async () => {
		const editor = makeEditor();
		mockActivateDocument.mockResolvedValue(editor);
		mockGetShapes.mockImplementation(function*() {});

		await revealShapeDefinition.handler('urn:ex#NoShape');

		expect(editor.revealRange).not.toHaveBeenCalled();
	});

	it('should reveal range when shape and location are found', async () => {
		const editor = makeEditor();
		mockActivateDocument.mockResolvedValue(editor);
		mockGetShapes.mockImplementation(function*() { yield 'urn:ex#Shape'; });

		const loc = makeLocation('file:///doc.ttl', 3, 0, 3, 15);
		const { ResourceDefinitionProvider } = await import('@src/providers');
		vi.spyOn(ResourceDefinitionProvider.prototype, 'provideDefinitionForResource').mockReturnValue(loc);

		await revealShapeDefinition.handler('urn:ex#X');

		expect(editor.revealRange).toHaveBeenCalledWith(loc.range, expect.anything());
	});
});
