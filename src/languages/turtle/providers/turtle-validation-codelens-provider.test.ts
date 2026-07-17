import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { mockConfigGet } = vi.hoisted(() => ({
	mockConfigGet: vi.fn(),
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(() => ({ get: (...args: any[]) => mockConfigGet(...args) })),
}));

import { TurtleValidationCodeLensProvider } from '@src/languages/turtle/providers/turtle-validation-codelens-provider';
import { ShaclDocumentValidationState } from '@src/services/validation/shacl-validation-configuration';

const DOCUMENT_URI = vscode.Uri.parse('file:///w/models/example.ttl');

/**
 * Constructs the provider with a validation-service double returning the given
 * document state, settings and optional last-skip record.
 */
function createProvider(state: ShaclDocumentValidationState, settings: any = {}, lastSkip?: { triples: number; maxGraphSize: number }) {
	const contextService = {
		contexts: { [DOCUMENT_URI.toString()]: { graphs: [] } },
		onDidChangeDocumentContext: vi.fn(() => ({ dispose: () => {} })),
	} as any;

	const workspaceIndexerService = {
		waitForIndexed: vi.fn(async () => undefined),
	} as any;

	const validationService = {
		getDocumentValidationState: vi.fn(() => state),
		getValidationSettings: vi.fn(() => settings),
		getLastResult: vi.fn(() => undefined),
		getLastSkip: vi.fn(() => lastSkip),
		onDidValidate: vi.fn(() => ({ dispose: () => {} })),
	} as any;

	return new TurtleValidationCodeLensProvider(contextService, workspaceIndexerService, validationService);
}

/**
 * Resolves the CodeLens carrying the manage-shapes command (the status lens).
 */
async function getStatusLens(provider: TurtleValidationCodeLensProvider) {
	const document = { uri: DOCUMENT_URI } as any;
	const token = {} as any;

	const lenses = await provider.provideCodeLenses(document, token) as vscode.CodeLens[];
	const lens = lenses.find(l => l.command?.command === 'mentor.command.manageShaclShapes');

	expect(lens).toBeDefined();

	return lens!;
}

function state(partial: Partial<ShaclDocumentValidationState>): ShaclDocumentValidationState {
	return {
		mode: 'none',
		profileNames: [],
		effectiveShapes: [],
		matchedPaths: [],
		...partial,
	};
}

describe('TurtleValidationCodeLensProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockConfigGet.mockImplementation((key: string, defaultValue?: any) =>
			key === 'shacl.enabled' ? true : defaultValue);
	});

	it('keeps the title unqualified and lists matched globs in the tooltip', async () => {
		const provider = createProvider(
			state({
				mode: 'matched',
				profileNames: ['core'],
				effectiveShapes: ['workspace:///shapes/core.ttl'],
				matchedPaths: ['**/*.ttl'],
			}),
			{ profiles: { 'core': { name: 'Core' } } }
		);

		const lens = await getStatusLens(provider);

		expect(lens.command?.title).toContain('Core');
		expect(lens.command?.title).not.toContain('(via');
		expect(lens.command?.tooltip).toContain('Matched path patterns');
		expect(lens.command?.tooltip).toContain('**/*.ttl');
	});

	it('omits literal path entries from the tooltip pattern list', async () => {
		const provider = createProvider(
			state({
				mode: 'matched',
				profileNames: ['core'],
				effectiveShapes: ['workspace:///shapes/core.ttl'],
				matchedPaths: ['models/example.ttl'],
			}),
			{ profiles: { 'core': { name: 'Core' } } }
		);

		const lens = await getStatusLens(provider);

		expect(lens.command?.title).not.toContain('(via');
		expect(lens.command?.tooltip).not.toContain('Matched path patterns');
	});

	it('resolves profile ids to display names, falling back to the id', async () => {
		const provider = createProvider(
			state({
				mode: 'matched',
				profileNames: ['core', 'unnamed'],
				effectiveShapes: ['workspace:///shapes/core.ttl'],
				matchedPaths: ['models/example.ttl'],
			}),
			{ profiles: { 'core': { name: 'Core Shapes' }, 'unnamed': {} } }
		);

		const lens = await getStatusLens(provider);

		expect(lens.command?.title).toContain('Core Shapes, unnamed');
		expect(lens.command?.tooltip).toContain('Core Shapes, unnamed');
	});

	it('shows not configured when nothing applies', async () => {
		const provider = createProvider(state({}));

		const lens = await getStatusLens(provider);

		expect(lens.command?.title).toContain('not configured');
	});

	it('surfaces a skipped automatic validation with a validate action', async () => {
		const provider = createProvider(
			state({
				mode: 'matched',
				profileNames: ['core'],
				effectiveShapes: ['workspace:///shapes/core.ttl'],
				matchedPaths: ['**/*.ttl'],
			}),
			{ profiles: { 'core': { name: 'Core' } } },
			{ triples: 82_000, maxGraphSize: 50_000 }
		);

		const document = { uri: DOCUMENT_URI } as any;
		const lenses = await provider.provideCodeLenses(document, {} as any) as vscode.CodeLens[];
		const skipLens = lenses.find(l => l.command?.title.includes('Validation skipped'));

		expect(skipLens).toBeDefined();
		expect(skipLens!.command?.title).toContain('Validation skipped (size limit)');
		expect(skipLens!.command?.command).toBe('mentor.command.validateDocument');
		expect(skipLens!.command?.tooltip).toContain('82000 triples');
		expect(skipLens!.command?.tooltip).toContain('mentor.shacl.maxGraphSize (50000)');
	});

	it('shows no skip lens without a recorded skip', async () => {
		const provider = createProvider(state({ mode: 'matched', profileNames: ['core'], effectiveShapes: ['s:1'], matchedPaths: [] }));

		const document = { uri: DOCUMENT_URI } as any;
		const lenses = await provider.provideCodeLenses(document, {} as any) as vscode.CodeLens[];

		expect(lenses.some(l => l.command?.title.includes('Validation skipped'))).toBe(false);
	});
});
