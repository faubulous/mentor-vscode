import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { createMockTextEditor } from '@src/utilities/mocks/factories';
import { ValidationProfilesSectionController } from '@src/views/webviews/views/settings/sections/validation/profiles-controller';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({ container: { resolve: vi.fn() } }));

const BROKEN = { profiles: { 'core': ['workspace:///missing.ttl'] } };

function setup(files: string[] = [], cells: { notebook: string; slug: string }[] = [], userShapeFiles: string[] = []) {
	const store = {
		getGraphs: vi.fn(() => ['workspace:///shapes/core.ttl']),
		any: vi.fn(() => true),
	};

	// User shape files are candidates by definition, even when their graph is
	// empty and therefore absent from the store.
	const shapeGraphService = {
		getUserShapeFileNames: vi.fn(() => userShapeFiles),
		getUserShapeGraphUri: vi.fn((fileName: string) => `user:///shapes/${fileName}`),
		getOrphanedUserShapeFiles: vi.fn(() => [] as string[]),
		onDidChangeShapeGraphs: vi.fn(() => ({ dispose: () => { } })),
	};

	// Cell contexts, keyed by the opaque cell-handle URI, exposing a slug-based
	// graph IRI — mirroring how the indexer stores notebook cell contexts.
	const cellContexts: Record<string, any> = {};

	for (const { notebook, slug } of cells) {
		const cellUri = vscode.Uri.parse(`vscode-notebook-cell:///${notebook}#HANDLE-${slug}`);
		cellContexts[cellUri.toString()] = {
			uri: cellUri,
			graphIri: vscode.Uri.parse(`workspace:///${notebook}#${slug}`),
		};
	}

	const contextService = { contexts: cellContexts };

	const validationService = {
		checkShaclProfiles: vi.fn(async () => BROKEN),
		getRdfExtensions: vi.fn(() => ['.ttl', '.rdf']),
		// Resolves cells to their slug-based location (as the real service does after
		// the notebook-cell fix), and files to their bare workspace-relative path.
		getDocumentLocation: vi.fn((uri: vscode.Uri) => {
			const graphIri = uri.scheme === 'vscode-notebook-cell' ? cellContexts[uri.toString()]?.graphIri : undefined;
			const source = graphIri ?? uri;
			return { path: source.path.replace(/^\/+/, ''), fragment: source.fragment || undefined };
		}),
	};
	const fileService = {
		files: files.map(path => vscode.Uri.parse(`file:///${path}`)),
	};

	(container.resolve as any).mockImplementation((token: any) => {
		if (token === ServiceToken.Store) return store;
		if (token === ServiceToken.ShaclValidationService) return validationService;
		if (token === ServiceToken.WorkspaceFileService) return fileService;
		if (token === ServiceToken.DocumentContextService) return contextService;
		if (token === ServiceToken.ShapeGraphService) return shapeGraphService;
		return {};
	});

	const controller = new ValidationProfilesSectionController();
	const post = vi.fn();
	(controller as any)._post = post;

	return { controller, post, store, validationService, shapeGraphService };
}

const deleteMessage = {
	section: 'validation.profiles',
	id: 'DeleteValidationProfile',
	profileId: 'core',
	name: 'Core',
	scope: 'workspace',
} as any;

/**
 * Creates a quick pick mock whose `show()` runs the given scenario against the
 * captured event handlers.
 */
function createQuickPickMock(scenario: (quickPick: any, handlers: {
	changeValue?: (value: string) => void;
	accept?: () => void;
	hide?: () => void;
}) => void) {
	const handlers: any = {};

	const quickPick = {
		title: '',
		placeholder: '',
		value: '',
		items: [] as any[],
		activeItems: [] as any[],
		selectedItems: [] as any[],
		onDidChangeValue: vi.fn((handler: any) => { handlers.changeValue = handler; return { dispose: () => {} }; }),
		onDidAccept: vi.fn((handler: any) => { handlers.accept = handler; return { dispose: () => {} }; }),
		onDidHide: vi.fn((handler: any) => { handlers.hide = handler; return { dispose: () => {} }; }),
		hide: vi.fn(() => handlers.hide?.()),
		dispose: vi.fn(),
		show: vi.fn(() => scenario(quickPick, handlers)),
	};

	return quickPick;
}

describe('ValidationProfilesSectionController', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('answers GetShapeCandidates with the shape graphs of the store', async () => {
		const { controller, post } = setup();

		const handled = await controller.handleMessage({ section: 'validation.profiles', id: 'GetShapeCandidates' } as any);

		expect(handled).toBe(true);
		expect(post).toHaveBeenCalledWith(expect.objectContaining({
			id: 'GetShapeCandidatesResult',
			candidates: ['workspace:///shapes/core.ttl'],
		}));
	});

	it('includes user shape files in the candidates even when their graph is empty', async () => {
		// A freshly created user shape file holds only the commented skeleton, so
		// its graph is absent from the store — it must be offered regardless.
		const { controller, post } = setup([], [], ['drafted.ttl']);

		await controller.handleMessage({ section: 'validation.profiles', id: 'GetShapeCandidates' } as any);

		expect(post).toHaveBeenCalledWith(expect.objectContaining({
			id: 'GetShapeCandidatesResult',
			candidates: ['user:///shapes/drafted.ttl', 'workspace:///shapes/core.ttl'],
		}));
	});

	it('answers GetValidationHealth with the broken references', async () => {
		const { controller, post, validationService } = setup();

		const handled = await controller.handleMessage({ section: 'validation.profiles', id: 'GetValidationHealth' } as any);

		expect(handled).toBe(true);
		expect(validationService.checkShaclProfiles).toHaveBeenCalledOnce();
		expect(post).toHaveBeenCalledWith(expect.objectContaining({ id: 'GetValidationHealthResult', broken: BROKEN }));
	});

	it('resolves a match preview against the workspace files', async () => {
		const { controller, post } = setup([
			'models/a.ttl',
			'models/b.rdf',
			'models/readme.md',
			'other/c.ttl',
		]);

		const handled = await controller.handleMessage({
			section: 'validation.profiles',
			id: 'GetProfileMatchPreview',
			key: 'core',
			includeFiles: ['models/*'],
			excludeFiles: [],
		} as any);

		expect(handled).toBe(true);
		expect(post).toHaveBeenCalledWith(expect.objectContaining({
			id: 'GetProfileMatchPreviewResult',
			key: 'core',
			count: 2,
			sample: ['models/a.ttl', 'models/b.rdf'],
		}));
	});

	it('respects bang exclusions and limits the sample size in match previews', async () => {
		const { controller, post } = setup(['a.ttl', 'b.ttl', 'c.ttl', 'd.ttl', 'scratch.ttl']);

		await controller.handleMessage({
			section: 'validation.profiles',
			id: 'GetProfileMatchPreview',
			key: 'draft:new',
			includeFiles: ['**/*'],
			excludeFiles: ['scratch.ttl'],
		} as any);

		const message = post.mock.calls[0][0];

		expect(message.count).toBe(4);
		expect(message.sample).toHaveLength(3);
	});

	it('counts an exact notebook cell pattern as exactly one match', async () => {
		const { controller, post } = setup(
			['nb.mnb'],
			[{ notebook: 'nb.mnb', slug: 'cell-1' }, { notebook: 'nb.mnb', slug: 'cell-2' }]
		);

		await controller.handleMessage({
			section: 'validation.profiles',
			id: 'GetProfileMatchPreview',
			key: 'core',
			includeFiles: ['nb.mnb#cell-1'],
			excludeFiles: [],
		} as any);

		expect(post).toHaveBeenCalledWith(expect.objectContaining({
			id: 'GetProfileMatchPreviewResult',
			count: 1,
			sample: ['nb.mnb#cell-1'],
		}));
	});

	it('applies a fragment-less notebook pattern to all cells, excluding the container file', async () => {
		const { controller, post } = setup(
			['nb.mnb'],
			[{ notebook: 'nb.mnb', slug: 'cell-1' }, { notebook: 'nb.mnb', slug: 'cell-2' }]
		);

		await controller.handleMessage({
			section: 'validation.profiles',
			id: 'GetProfileMatchPreview',
			key: 'core',
			includeFiles: ['nb.mnb'],
			excludeFiles: [],
		} as any);

		const message = post.mock.calls[0][0];

		// The two cells match; the notebook container file is not counted.
		expect(message.count).toBe(2);
		expect(message.sample).toEqual(['nb.mnb#cell-1', 'nb.mnb#cell-2']);
	});

	it('shows the matched files in the pattern editor and posts the confirmed pattern', async () => {
		const { controller, post } = setup(['models/a.ttl', 'models/b.ttl', 'other/c.ttl']);

		const quickPick = createQuickPickMock((qp, handlers) => {
			// The initial pattern matches the two files under models/.
			expect(qp.items).toHaveLength(2);
			expect(qp.title).toContain('2 files match');

			// Broaden the pattern and confirm it.
			qp.value = '**/*';
			handlers.changeValue?.('**/*');
			expect(qp.items).toHaveLength(3);

			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		const handled = await controller.handleMessage({
			section: 'validation.profiles',
			id: 'EditPathPattern',
			pattern: 'models/*',
		} as any);

		expect(handled).toBe(true);
		expect(post).toHaveBeenCalledWith(expect.objectContaining({ id: 'EditPathPatternResult', pattern: '**/*' }));
	});

	it('opens a picked file and leaves the pattern unchanged', async () => {
		const { controller, post } = setup(['models/a.ttl', 'models/b.ttl']);

		const show = vi.spyOn(vscode.window, 'showTextDocument').mockResolvedValue(createMockTextEditor());

		const quickPick = createQuickPickMock((qp, handlers) => {
			// Pick the first file item instead of confirming the typed pattern.
			qp.selectedItems = [qp.items[0]];
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await controller.handleMessage({
			section: 'validation.profiles',
			id: 'EditPathPattern',
			pattern: 'models/*',
		} as any);

		expect(show).toHaveBeenCalledTimes(1);
		expect(show.mock.calls[0][0].toString()).toBe('file:///models/a.ttl');
		expect(post).toHaveBeenCalledTimes(1);
		expect(post.mock.calls[0][0]).toMatchObject({ id: 'EditPathPatternResult' });
		expect(post.mock.calls[0][0].pattern).toBeUndefined();
	});

	it('shows a message item when no file matches the pattern', async () => {
		const { controller } = setup(['models/a.ttl']);

		const quickPick = createQuickPickMock((qp, handlers) => {
			expect(qp.title).toContain('0 files match');
			expect(qp.items).toHaveLength(1);
			expect(qp.items[0].description).toContain('No files match');
			expect(qp.items[0].fileUri).toBeUndefined();

			handlers.hide?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await controller.handleMessage({
			section: 'validation.profiles',
			id: 'EditPathPattern',
			pattern: 'other/*',
		} as any);
	});

	it('posts no pattern when the pattern editor is dismissed', async () => {
		const { controller, post } = setup(['models/a.ttl']);

		const quickPick = createQuickPickMock((_qp, handlers) => {
			handlers.hide?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await controller.handleMessage({
			section: 'validation.profiles',
			id: 'EditPathPattern',
			pattern: 'models/*',
		} as any);

		expect(post).toHaveBeenCalledTimes(1);
		expect(post.mock.calls[0][0]).toMatchObject({ id: 'EditPathPatternResult' });
		expect(post.mock.calls[0][0].pattern).toBeUndefined();
	});

	it('opens a workspace shape graph as its backing file', async () => {
		const { controller } = setup();

		(vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.parse('file:///w'), name: 'w', index: 0 }];
		WorkspaceUri.rootUri = undefined;

		const show = vi.spyOn(vscode.window, 'showTextDocument').mockResolvedValue(createMockTextEditor());

		const handled = await controller.handleMessage({
			section: 'validation.profiles',
			id: 'OpenShapeGraph',
			uri: 'workspace:///shapes/core.ttl',
		} as any);

		expect(handled).toBe(true);
		expect(show).toHaveBeenCalledTimes(1);
		expect(show.mock.calls[0][0].toString()).toBe('file:///w/shapes/core.ttl');
	});

	it('opens a non-workspace shape graph through the graph exporter', async () => {
		const { controller } = setup();

		const show = vi.spyOn(vscode.window, 'showTextDocument').mockResolvedValue(createMockTextEditor());
		(vscode.commands as any).executeCommand = vi.fn(async () => undefined);

		const handled = await controller.handleMessage({
			section: 'validation.profiles',
			id: 'OpenShapeGraph',
			uri: 'http://www.w3.org/ns/shacl#',
		} as any);

		expect(handled).toBe(true);
		expect(show).not.toHaveBeenCalled();
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mentor.command.openGraph', 'http://www.w3.org/ns/shacl#');
	});

	it('warns when a shape graph cannot be resolved', async () => {
		const { controller } = setup();

		(vscode.workspace as any).workspaceFolders = undefined;
		WorkspaceUri.rootUri = undefined;

		const show = vi.spyOn(vscode.window, 'showTextDocument').mockResolvedValue(createMockTextEditor());
		const warn = vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

		await controller.handleMessage({
			section: 'validation.profiles',
			id: 'OpenShapeGraph',
			uri: 'workspace:///shapes/core.ttl',
		} as any);

		expect(show).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('workspace:///shapes/core.ttl'));
	});

	it('posts ValidationProfileDeleted after a confirmed deletion', async () => {
		const { controller, post } = setup();
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Delete' as any);

		await controller.handleMessage(deleteMessage);

		expect(post).toHaveBeenCalledWith(expect.objectContaining({
			id: 'ValidationProfileDeleted',
			profileId: 'core',
			scope: 'workspace',
		}));
	});

	it('does not post when the deletion is cancelled', async () => {
		const { controller, post } = setup();
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

		await controller.handleMessage(deleteMessage);

		expect(post).not.toHaveBeenCalled();
	});

	it('ignores unknown messages', async () => {
		const { controller, post } = setup();

		const handled = await controller.handleMessage({ section: 'validation.profiles', id: 'SomethingElse' } as any);

		expect(handled).toBe(false);
		expect(post).not.toHaveBeenCalled();
	});
});
