import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { ValidatorMock } = vi.hoisted(() => {
	const ValidatorMock = vi.fn(function (this: any) {
		this.validate = vi.fn(async () => ({ conforms: true, dataset: {}, results: [] }));
	});

	return { ValidatorMock };
});

vi.mock('shacl-engine', () => ({ Validator: ValidatorMock }));

import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { ShaclValidationSettings } from '@src/services/validation/shacl-validation-configuration';
import { WorkspaceUri } from '@src/providers/workspace-uri';

/**
 * Constructs the service with minimal mocks and a configuration double whose
 * `inspect().workspaceValue` returns the given settings and whose `update` calls
 * are recorded.
 */
function createService(settings: ShaclValidationSettings, defaults?: ShaclValidationSettings, hasGraph: (uri: string) => boolean = () => false) {
	const updates: { key: string; value: any; target: number }[] = [];

	(vscode.workspace as any).getConfiguration = vi.fn(() => ({
		get: (_key: string, defaultValue?: any) => settings ?? defaultValue,
		inspect: (_key: string) => ({ defaultValue: defaults, workspaceValue: settings }),
		update: async (key: string, value: any, target: number) => { updates.push({ key, value, target }); },
	}));

	const context = { subscriptions: [] } as any;
	const store = { hasGraph } as any;
	const contextService = { contexts: {}, onDidChangeDocumentContext: () => ({ dispose: () => {} }) } as any;
	const documentFactory = {
		supportedExtensions: {
			'.ttl': { language: 'turtle', isTripleSource: true },
			'.rdf': { language: 'xml', isTripleSource: true },
			'.sparql': { language: 'sparql', isTripleSource: false },
			'.mnb': { language: 'json', isTripleSource: false },
		},
	} as any;

	const service = new ShaclValidationService(context, store, contextService, documentFactory);

	return { service, updates };
}

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.parse('file:///w'), name: 'w', index: 0 }];
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
	WorkspaceUri.rootUri = undefined;
});

describe('ShaclValidationService.getDocumentLocation', () => {
	it('returns the bare workspace-relative path without a leading slash', () => {
		const { service } = createService({});

		expect(service.getDocumentLocation(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual({ path: 'models/data.ttl', fragment: undefined });
	});

	it('carries the fragment for notebook cell URIs', () => {
		const { service } = createService({});

		expect(service.getDocumentLocation(vscode.Uri.parse('file:///w/nb.mnb#cell-1')))
			.toEqual({ path: 'nb.mnb', fragment: 'cell-1' });
	});

	it('falls back to an inert full-URI path for documents outside the workspace', () => {
		const { service } = createService({});

		expect(service.getDocumentLocation(vscode.Uri.parse('file:///other/data.ttl')))
			.toEqual({ path: 'file:///other/data.ttl' });
	});
});

describe('ShaclValidationService.getRdfExtensions', () => {
	it('returns only triple-source extensions', () => {
		const { service } = createService({});

		expect(service.getRdfExtensions()).toEqual(['.ttl', '.rdf']);
	});
});

describe('ShaclValidationService.getEffectiveShapeGraphs', () => {
	it('resolves the profiles whose paths match the document', () => {
		const { service } = createService({
			profiles: {
				'core': { name: 'Core', shapes: ['workspace:///shapes/core.ttl'], paths: ['models/*'] },
			},
		});

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual(['workspace:///shapes/core.ttl']);
		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/other/data.ttl')))
			.toEqual([]);
	});

	it('respects bang exclusions', () => {
		const { service } = createService({
			profiles: {
				'core': { shapes: ['workspace:///shapes/core.ttl'], paths: ['**/*', '!models/data.ttl'] },
			},
		});

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual([]);
	});

	it('resolves built-in preset profiles shipped as the manifest default', () => {
		const { service } = createService(
			{},
			{
				profiles: {
					'skos': { name: 'SKOS', shapes: ['http://www.w3.org/2004/02/skos/core#'], paths: ['**/*'] },
				},
			}
		);

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual(['http://www.w3.org/2004/02/skos/core#']);
	});

	it('lets workspace profiles shadow same-id presets', () => {
		const { service } = createService(
			{
				profiles: {
					'skos': { name: 'My SKOS', shapes: ['workspace:///shapes/skos.ttl'], paths: ['**/*'] },
				},
			},
			{
				profiles: {
					'skos': { name: 'SKOS', shapes: ['http://www.w3.org/2004/02/skos/core#'], paths: ['**/*'] },
				},
			}
		);

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual(['workspace:///shapes/skos.ttl']);
	});

	it('resolves no shape graphs for dormant presets without paths', () => {
		const { service } = createService(
			{},
			{
				profiles: {
					'basic-ontology': { name: 'Basic Ontology', shapes: ['https://w3id.org/mentor/shacl/profiles/basic-ontology'] },
				},
			}
		);

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual([]);
	});
});

describe('ShaclValidationService.checkShaclProfiles', () => {
	const defaults: ShaclValidationSettings = {
		profiles: {
			'basic-ontology': { name: 'Basic Ontology', shapes: ['https://w3id.org/mentor/shacl/profiles/basic-ontology'] },
		},
	};

	it('reports preset shape graphs clean when they are loaded in the store', async () => {
		const { service } = createService({}, defaults, () => true);

		expect(await service.checkShaclProfiles()).toEqual({ profiles: {} });
	});

	it('reports preset shape graphs missing when they are not in the store', async () => {
		const { service } = createService({}, defaults, () => false);

		expect(await service.checkShaclProfiles()).toEqual({
			profiles: { 'basic-ontology': ['https://w3id.org/mentor/shacl/profiles/basic-ontology'] },
		});
	});
});

describe('ShaclValidationService.getDocumentValidationState', () => {
	it('reports the matched profiles and path entries', () => {
		const { service } = createService({
			profiles: {
				'core': { shapes: ['workspace:///shapes/core.ttl'], paths: ['**/*.ttl'] },
			},
		});

		const state = service.getDocumentValidationState(vscode.Uri.parse('file:///w/models/data.ttl'));

		expect(state.mode).toBe('matched');
		expect(state.matchedPaths).toEqual(['**/*.ttl']);
		expect(state.profileNames).toEqual(['core']);
	});
});

describe('ShaclValidationService.migrateShaclSettings', () => {
	it('rewrites shape URIs and path entries on a folder rename', async () => {
		const { service, updates } = createService({
			profiles: {
				'core': {
					shapes: ['workspace:///models/shapes.ttl'],
					paths: ['models/*.ttl', 'models/data.ttl', '**/*.ttl'],
				},
			},
		});

		await service.migrateShaclSettings([
			{ oldUri: vscode.Uri.parse('file:///w/models'), newUri: vscode.Uri.parse('file:///w/renamed') },
		]);

		expect(updates).toHaveLength(1);
		expect(updates[0].target).toBe(vscode.ConfigurationTarget.Workspace);

		const migrated = updates[0].value as ShaclValidationSettings;

		expect(migrated.profiles?.['core'].shapes).toEqual(['workspace:///renamed/shapes.ttl']);
		expect(migrated.profiles?.['core'].paths).toEqual(['renamed/*.ttl', 'renamed/data.ttl', '**/*.ttl']);
	});

	it('ignores renames of files outside the workspace', async () => {
		const { service, updates } = createService({
			profiles: { 'core': { paths: ['data.ttl'] } },
		});

		await service.migrateShaclSettings([
			{ oldUri: vscode.Uri.parse('file:///other/a.ttl'), newUri: vscode.Uri.parse('file:///other/b.ttl') },
		]);

		expect(updates).toHaveLength(0);
	});
});

/**
 * Constructs the service with a store stub whose per-graph versions can be
 * mutated between validation runs, and a document context registered for
 * `file:///w/data.ttl`.
 */
function createValidationService(graphVersions: Record<string, number> = {}) {
	(vscode.workspace as any).getConfiguration = vi.fn(() => ({
		get: (_key: string, defaultValue?: any) => defaultValue,
		inspect: () => ({}),
		update: async () => { },
	}));

	const context = { subscriptions: [] } as any;
	const store = {
		hasGraph: () => true,
		getGraphVersion: vi.fn((uri: string) => graphVersions[uri] ?? 0),
		getDataset: vi.fn(() => ({})),
	} as any;

	const documentUri = vscode.Uri.parse('file:///w/data.ttl');
	const documentContext = { graphs: [documentUri.toString()], subjects: {}, references: {} } as any;
	const contextService = {
		contexts: { [documentUri.toString()]: documentContext },
		onDidChangeDocumentContext: () => ({ dispose: () => { } }),
	} as any;
	const documentFactory = { supportedExtensions: {} } as any;

	const service = new ShaclValidationService(context, store, contextService, documentFactory);

	return { service, store, documentUri, graphVersions };
}

describe('ShaclValidationService.validateDocument', () => {
	const shapes = ['workspace:///shapes/core.ttl'];

	it('reuses the cached validator when the shape graph versions are unchanged', async () => {
		const { service, documentUri } = createValidationService({ [shapes[0]]: 1 });

		await service.validateDocument(documentUri, shapes);
		await service.validateDocument(documentUri, shapes);

		expect(ValidatorMock).toHaveBeenCalledTimes(1);
		expect((ValidatorMock.mock.instances[0] as any).validate).toHaveBeenCalledTimes(2);
	});

	it('rebuilds the validator when a shape graph version changes', async () => {
		const { service, documentUri, graphVersions } = createValidationService({ [shapes[0]]: 1 });

		await service.validateDocument(documentUri, shapes);

		graphVersions[shapes[0]] = 2;

		await service.validateDocument(documentUri, shapes);

		expect(ValidatorMock).toHaveBeenCalledTimes(2);
	});

	it('shares a single validation between concurrent triggers', async () => {
		const { service, documentUri } = createValidationService();

		const [first, second] = await Promise.all([
			service.validateDocument(documentUri, shapes),
			service.validateDocument(documentUri, shapes),
		]);

		expect(first).toBe(second);
		expect(ValidatorMock).toHaveBeenCalledTimes(1);
		expect((ValidatorMock.mock.instances[0] as any).validate).toHaveBeenCalledTimes(1);
	});

	it('resolves the result without waiting for the status bar hold', async () => {
		vi.useFakeTimers();

		try {
			const dispose = vi.fn();
			(vscode.window as any).setStatusBarMessage = vi.fn(() => ({ dispose }));

			const { service, documentUri } = createValidationService();
			const promise = service.validateDocument(documentUri, shapes);

			await vi.advanceTimersByTimeAsync(0);

			const result = await promise;

			expect(result).toBeDefined();
			expect(dispose).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(300);

			expect(dispose).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('ShaclValidationService.handleFileDeletes', () => {
	it('prunes literal path entries when the document is deleted', async () => {
		const { service, updates } = createService({
			profiles: {
				'core': { shapes: ['workspace:///shapes/core.ttl'], paths: ['data.ttl', 'other.ttl'] },
			},
		});

		await service.handleFileDeletes([vscode.Uri.parse('file:///w/data.ttl')]);

		expect(updates).toHaveLength(1);
		expect(updates[0].value.profiles['core'].paths).toEqual(['other.ttl']);
		expect(updates[0].target).toBe(vscode.ConfigurationTarget.Workspace);
	});

	it('removes the paths field when the last entry is pruned', async () => {
		const { service, updates } = createService({
			profiles: {
				'doc': { shapes: ['workspace:///shapes/core.ttl'], paths: ['data.ttl'] },
			},
		});

		await service.handleFileDeletes([vscode.Uri.parse('file:///w/data.ttl')]);

		expect(updates).toHaveLength(1);
		expect(updates[0].value.profiles['doc'].paths).toBeUndefined();
	});

	it('prunes fragment-qualified entries when the notebook is deleted', async () => {
		const { service, updates } = createService({
			profiles: {
				'cell': { shapes: ['workspace:///shapes/core.ttl'], paths: ['nb.mnb#cell-1'] },
			},
		});

		await service.handleFileDeletes([vscode.Uri.parse('file:///w/nb.mnb')]);

		expect(updates).toHaveLength(1);
		expect(updates[0].value.profiles['cell'].paths).toBeUndefined();
	});

	it('prunes folder-scoped patterns and exclusions but keeps root-anchored ones', async () => {
		const { service, updates } = createService({
			profiles: {
				'core': { paths: ['ontologies/*.ttl', '!ontologies/scratch.ttl', '**/*.ttl'] },
			},
		});

		await service.handleFileDeletes([vscode.Uri.parse('file:///w/ontologies')]);

		expect(updates).toHaveLength(1);
		expect(updates[0].value.profiles['core'].paths).toEqual(['**/*.ttl']);
	});

	it('warns without pruning when a deleted file is referenced as a shape', async () => {
		const { service, updates } = createService({
			profiles: {
				'core': { shapes: ['workspace:///shapes/core.ttl'], paths: ['**/*'] },
			},
		});

		(vscode.window as any).showWarningMessage = vi.fn(async () => 'Manage Profiles');

		await service.handleFileDeletes([vscode.Uri.parse('file:///w/shapes/core.ttl')]);

		// The shape list is not modified — no settings write.
		expect(updates).toHaveLength(0);
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
			expect.stringContaining('core'),
			'Manage Profiles'
		);
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mentor.command.openSettings', 'validation.profiles');
	});

	it('ignores deletions of files outside the workspace', async () => {
		const { service, updates } = createService({
			profiles: { 'core': { paths: ['data.ttl'] } },
		});

		await service.handleFileDeletes([vscode.Uri.parse('file:///other/thing.ttl')]);

		expect(updates).toHaveLength(0);
		expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
	});
});
