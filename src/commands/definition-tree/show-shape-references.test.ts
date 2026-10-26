import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const {
	mockActivateDocument,
	mockActiveContext,
	mockGetShapes,
	mockEnsureLoaded,
} = vi.hoisted(() => ({
	mockActivateDocument: vi.fn(),
	mockActiveContext: { graphs: ['urn:g1'] },
	mockGetShapes: vi.fn(function*(): Generator<string, void, unknown> {}),
	mockEnsureLoaded: vi.fn(async () => undefined),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === ServiceToken.DocumentContextService) {
				return {
					activateDocument: mockActivateDocument,
					activeContext: mockActiveContext,
				};
			}
			if (token === ServiceToken.VocabularyRepository) {
				return {
					getShapes: mockGetShapes,
				};
			}
			if (token === ServiceToken.PresetDocumentService) {
				return {
					ensureLoaded: mockEnsureLoaded,
				};
			}
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
import { showShapeReferences } from '@src/commands/definition-tree/show-shape-references';
import { ServiceToken } from '@src/services/tokens';

function makeRange(sl: number, sc: number, el: number, ec: number) {
	return new (vscode as any).Range(sl, sc, el, ec);
}

function makeLocation(uriStr: string, sl: number, sc: number, el: number, ec: number) {
	return new (vscode as any).Location(vscode.Uri.parse(uriStr), makeRange(sl, sc, el, ec));
}

function makeEditor(uriStr = 'file:///doc.ttl', line = 0, character = 0) {
	return {
		document: { uri: vscode.Uri.parse(uriStr) },
		selection: {
			active: new (vscode as any).Position(line, character),
		},
		revealRange: vi.fn(),
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.window as any).activeTextEditor = undefined;
	mockGetShapes.mockImplementation(function*() {});
	mockActivateDocument.mockResolvedValue(undefined);
});

afterEach(() => {
	(vscode.window as any).activeTextEditor = undefined;
});

describe('showShapeReferences', () => {
	it('should have the correct command id', () => {
		expect(showShapeReferences.id).toBe('mentor.command.showShapeReferences');
	});

	it('should do nothing when no shape definitions are found', async () => {
		const editor = makeEditor();
		mockActivateDocument.mockResolvedValue(editor);
		mockGetShapes.mockImplementation(function*() {});

		const execSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

		await showShapeReferences.handler('urn:ex#Res');

		expect(execSpy).not.toHaveBeenCalledWith('editor.action.peekLocations', expect.anything(), expect.anything(), expect.anything(), expect.anything());
	});

	it('should open shape-only references without navigating and dedupe locations', async () => {
		const editor = makeEditor('file:///doc.ttl', 7, 2);
		mockActivateDocument.mockResolvedValue(editor);
		mockGetShapes.mockImplementation(function*() {
			yield 'urn:shape#B';
			yield 'urn:shape#A';
			yield 'urn:shape#A';
		});

		const locationA = makeLocation('file:///a.ttl', 3, 0, 3, 10);
		const locationB = makeLocation('file:///b.ttl', 5, 0, 5, 8);
		const { ResourceDefinitionProvider } = await import('@src/providers');
		vi.spyOn(ResourceDefinitionProvider.prototype, 'provideDefinitionForResource').mockImplementation((_context: any, iri: string) => {
			if (iri === 'urn:shape#A') {
				return locationA;
			}
			if (iri === 'urn:shape#B') {
				return locationB;
			}
			return null;
		});

		const showTextDocumentSpy = vi.spyOn(vscode.window, 'showTextDocument');
		const execSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

		await showShapeReferences.handler('urn:ex#Res');

		// Shapes may be defined in a preset shape graph, whose document is loaded on demand.
		expect(mockEnsureLoaded.mock.invocationCallOrder[0]).toBeLessThan((ResourceDefinitionProvider.prototype.provideDefinitionForResource as any).mock.invocationCallOrder[0]);
		expect(showTextDocumentSpy).not.toHaveBeenCalled();
		expect(execSpy).toHaveBeenCalledWith(
			'editor.action.peekLocations',
			editor.document.uri,
			editor.selection.active,
			[locationA, locationB],
			'peek'
		);
	});
});
