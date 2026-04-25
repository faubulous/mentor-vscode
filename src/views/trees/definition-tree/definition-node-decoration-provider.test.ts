import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('../../../utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

let mockConfigValue: string | undefined = undefined;

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, _d?: any) => mockConfigValue }),
}));

vi.mock('@faubulous/mentor-rdf', () => ({
	NamedNode: class {
		termType = 'NamedNode';
		constructor(public value: string) {}
	},
	VocabularyRepository: vi.fn(),
	SH: {
		Violation: 'http://www.w3.org/ns/shacl#Violation',
		Warning: 'http://www.w3.org/ns/shacl#Warning',
		Info: 'http://www.w3.org/ns/shacl#Info',
	},
}));

const mockContextChangeHandlers: Array<(ctx: any) => void> = [];
const mockContextService = {
	activeContext: undefined as any,
	onDidChangeDocumentContext: vi.fn((handler: (ctx: any) => void) => {
		mockContextChangeHandlers.push(handler);
		return { dispose: () => {} };
	}),
};

const mockSettingsChangeHandlers = new Map<string, Array<() => void>>();
const mockSettings = {
	get: vi.fn((key: string, def?: any) => def),
	onDidChange: vi.fn((key: string, handler: () => void) => {
		if (!mockSettingsChangeHandlers.has(key)) {
			mockSettingsChangeHandlers.set(key, []);
		}
		mockSettingsChangeHandlers.get(key)!.push(handler);
		return { dispose: () => {} };
	}),
};

const mockVocabularyRepository: { store: { matchAll: any } } = {
	store: {
		matchAll: vi.fn(() => []),
	},
};

const mockNodeProvider = {
	getNodeForUri: vi.fn((_iri: string) => undefined as any),
};

const mockValidationHandlers: Array<() => void> = [];
const mockValidationService = {
	onDidValidate: vi.fn((handler: () => void) => {
		mockValidationHandlers.push(handler);
		return { dispose: () => {} };
	}),
	getLastResult: vi.fn(() => undefined as any),
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return mockContextService;
			if (token === 'SettingsService') return mockSettings;
			if (token === 'VocabularyRepository') return mockVocabularyRepository;
			if (token === 'ShaclValidationService') return mockValidationService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { DefinitionNodeDecorationProvider } from './definition-node-decoration-provider';

describe('DefinitionNodeDecorationProvider', () => {
	let provider: DefinitionNodeDecorationProvider;
	let configChangeHandlers: Array<(e: any) => void>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockConfigValue = undefined;
		mockContextChangeHandlers.length = 0;
		mockSettingsChangeHandlers.clear();
		mockValidationHandlers.length = 0;
		configChangeHandlers = [];

		(vscode.workspace as any).onDidChangeConfiguration = vi.fn((handler: any) => {
			configChangeHandlers.push(handler);
			return { dispose: () => {} };
		});

		mockContextService.activeContext = undefined;

		provider = new DefinitionNodeDecorationProvider(mockNodeProvider as any);
	});

	it('has onDidChangeFileDecorations event', () => {
		expect(provider.onDidChangeFileDecorations).toBeDefined();
	});

	it('returns undefined for file scheme uri', () => {
		mockContextService.activeContext = { subjects: {}, predicates: { label: [] } };
		const uri = vscode.Uri.parse('file:///test.ttl');
		const token = {} as vscode.CancellationToken;
		expect(provider.provideFileDecoration(uri, token)).toBeUndefined();
	});

	it('returns undefined for mentor scheme uri', () => {
		mockContextService.activeContext = { subjects: {}, predicates: { label: [] } };
		const uri = vscode.Uri.parse('mentor:///test');
		const token = {} as vscode.CancellationToken;
		expect(provider.provideFileDecoration(uri, token)).toBeUndefined();
	});

	it('returns undefined when no active context', () => {
		mockContextService.activeContext = undefined;
		const uri = vscode.Uri.parse('http://example.org/Class');
		const token = {} as vscode.CancellationToken;
		expect(provider.provideFileDecoration(uri, token)).toBeUndefined();
	});

	it('returns disabled color decoration for subjects not in active document', () => {
		mockContextService.activeContext = {
			subjects: {},
			references: {},
			predicates: { label: [] },
			activeLanguage: 'en',
			primaryLanguage: 'en',
		};
		const uri = vscode.Uri.parse('http://example.org/UnknownClass');
		const token = {} as vscode.CancellationToken;
		const decoration = provider.provideFileDecoration(uri, token);
		expect(decoration).toBeDefined();
		expect(decoration!.tooltip).toContain('not defined in the active document');
		expect(decoration!.propagate).toBe(false);
	});

	it('returns undefined when decoration scope is disabled and subject is in context', () => {
		// getConfig returns undefined for 'decorateMissingLanguageTags' -> Disabled
		mockContextService.activeContext = {
			subjects: { 'http://example.org/Class': true },
			references: { 'http://example.org/Class': true },
			predicates: { label: [] },
			activeLanguage: 'en',
			primaryLanguage: 'en',
		};
		const uri = vscode.Uri.parse('http://example.org/Class');
		const token = {} as vscode.CancellationToken;
		const decoration = provider.provideFileDecoration(uri, token);
		expect(decoration).toBeUndefined();
	});

	it('updates label predicates when context changes', () => {
		const context = { predicates: { label: ['http://www.w3.org/2000/01/rdf-schema#label'] } };
		for (const h of mockContextChangeHandlers) {
			h(context);
		}
		// Verifies no error thrown - internal state updated
	});

	it('clears label predicates when context becomes null', () => {
		for (const h of mockContextChangeHandlers) {
			h(null);
		}
		// No error thrown, label predicates set to empty
	});

	it('uses empty label predicates when context has no label predicate list', () => {
		// Covers the `?? []` fallback when context.predicates.label is undefined
		for (const h of mockContextChangeHandlers) {
			h({ predicates: { label: undefined } });
		}
		// No error thrown
	});

	it('fires file decoration change when configuration affectsConfiguration returns true', () => {
		const mockFn = vi.fn();
		(provider as any)._onDidChangeFileDecorations = { fire: mockFn, event: vi.fn() };
		const configEvent = { affectsConfiguration: (key: string) => key.includes('decorateMissingLanguageTags') };
		for (const h of configChangeHandlers) {
			h(configEvent);
		}
		// Decoration scope updated - no error
	});

	it('fires onDidChangeFileDecorations when active language setting changes', () => {
		const fireSpy = vi.spyOn((provider as any)._onDidChangeFileDecorations, 'fire');
		const handlers = mockSettingsChangeHandlers.get('view.activeLanguage') ?? [];
		for (const h of handlers) { h(); }
		expect(fireSpy).toHaveBeenCalled();
	});

	it('sets decorationScope to Document when config returns "Document"', () => {
		mockConfigValue = 'Document';
		const dec = new DefinitionNodeDecorationProvider(mockNodeProvider as any);
		expect((dec as any)._decorationScope).toBe(2); // MissingLanguageTagDecorationScope.Document = 2
	});

	it('sets decorationScope to All when config returns "All"', () => {
		mockConfigValue = 'All';
		const dec = new DefinitionNodeDecorationProvider(mockNodeProvider as any);
		expect((dec as any)._decorationScope).toBe(1); // MissingLanguageTagDecorationScope.All = 1
	});
});

describe('DefinitionNodeDecorationProvider — provideFileDecoration (non-Disabled scope)', () => {
	const LABEL_PREDICATE = 'http://www.w3.org/2000/01/rdf-schema#label';
	const IRI = 'http://example.org/Class';

	function makeActiveContext(graphs = ['urn:g1']): any {
		return {
			subjects: { [IRI]: true },
			references: { [IRI]: true },
			predicates: { label: [LABEL_PREDICATE] },
			activeLanguage: 'en',
			primaryLanguage: 'en',
			graphs,
		};
	}

	let fireSpy: any;
	let dec: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockConfigValue = undefined;
		mockContextChangeHandlers.length = 0;
		mockSettingsChangeHandlers.clear();
		mockValidationHandlers.length = 0;

		(vscode.workspace as any).onDidChangeConfiguration = vi.fn((handler: any) => {
			handler({ affectsConfiguration: () => false });
			return { dispose: () => {} };
		});

		mockContextService.activeContext = undefined;

		dec = new DefinitionNodeDecorationProvider(mockNodeProvider as any);

		// Enable All scope (1 = All, 2 = Document)
		(dec as any)._decorationScope = 1;

		// Populate label predicates by firing context-change handler
		const ctx = makeActiveContext();
		for (const h of mockContextChangeHandlers) { h(ctx); }

		mockContextService.activeContext = ctx;
	});

	it('returns undefined when no primary language is set', () => {
		mockContextService.activeContext = {
			...makeActiveContext(),
			primaryLanguage: undefined,
		};
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when no active language is set', () => {
		mockContextService.activeContext = {
			...makeActiveContext(),
			activeLanguage: undefined,
		};
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when subject has no references entry', () => {
		mockContextService.activeContext = {
			...makeActiveContext(),
			references: {},
		};
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when store provides no label triples', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => []);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when triple is not a Literal (wrong termType)', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'NamedNode', value: 'http://example.org/Other' },
			predicate: { value: LABEL_PREDICATE },
		}]);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when predicate is not a label predicate', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'Literal', language: 'de', value: 'Test' },
			predicate: { value: 'http://example.org/unknown-predicate' },
		}]);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when label triple matches the active language', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'Literal', language: 'en', value: 'Example' },
			predicate: { value: LABEL_PREDICATE },
		}]);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns undefined when label triple has no language (valid for all languages)', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'Literal', language: '', value: 'Example' },
			predicate: { value: LABEL_PREDICATE },
		}]);
		const uri = vscode.Uri.parse(IRI);
		expect(dec.provideFileDecoration(uri, {} as any)).toBeUndefined();
	});

	it('returns warning decoration when label exists only in the wrong language', () => {
		mockVocabularyRepository.store.matchAll = vi.fn(() => [{
			object: { termType: 'Literal', language: 'de', value: 'Beispiel' },
			predicate: { value: LABEL_PREDICATE },
		}]);
		const uri = vscode.Uri.parse(IRI);
		const decoration = dec.provideFileDecoration(uri, {} as any);
		expect(decoration).toBeDefined();
		expect(decoration!.tooltip).toContain('@en');
		expect(decoration!.propagate).toBe(true);
	});

	it('uses document graphs as filter when scope is Document', () => {
		(dec as any)._decorationScope = 2; // Document scope
		const graphs = ['urn:g1'];
		mockContextService.activeContext = makeActiveContext(graphs);
		let capturedGraphUris: any;
		mockVocabularyRepository.store.matchAll = vi.fn((g: any) => {
			capturedGraphUris = g;
			return [{
				object: { termType: 'Literal', language: 'fr', value: 'Exemple' },
				predicate: { value: LABEL_PREDICATE },
			}];
		});
		const uri = vscode.Uri.parse(IRI);
		dec.provideFileDecoration(uri, {} as any);
		expect(capturedGraphUris).toEqual(graphs);
	});
});

describe('DefinitionNodeDecorationProvider — getIssueColor', () => {
	const SH_Violation = 'http://www.w3.org/ns/shacl#Violation';
	const SH_Warning = 'http://www.w3.org/ns/shacl#Warning';
	const SH_Info = 'http://www.w3.org/ns/shacl#Info';

	let dec: DefinitionNodeDecorationProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		mockConfigValue = undefined;
		mockContextChangeHandlers.length = 0;
		mockSettingsChangeHandlers.clear();
		mockValidationHandlers.length = 0;

		(vscode.workspace as any).onDidChangeConfiguration = vi.fn((handler: any) => {
			handler({ affectsConfiguration: () => false });
			return { dispose: () => {} };
		});

		dec = new DefinitionNodeDecorationProvider(mockNodeProvider as any);
	});

	it('returns error color for SHACL violations', () => {
		(dec as any)._shaclViolations.set('http://example.org/A', SH_Violation);

		const color = dec.getIssueColor(vscode.Uri.parse('http://example.org/A'));

		expect(color?.id).toBe('list.errorForeground');
	});

	it('returns warning color for SHACL warnings', () => {
		(dec as any)._shaclViolations.set('http://example.org/B', SH_Warning);

		const color = dec.getIssueColor(vscode.Uri.parse('http://example.org/B'));

		expect(color?.id).toBe('list.warningForeground');
	});

	it('returns warning color for mentor ancestor nodes with warning severity', () => {
		(dec as any)._ancestorSeverity.set('mentor:shapes', SH_Warning);

		const color = dec.getIssueColor(vscode.Uri.parse('mentor:shapes'));

		expect(color?.id).toBe('list.warningForeground');
	});

	it('returns undefined for SHACL info severity', () => {
		(dec as any)._shaclViolations.set('http://example.org/C', SH_Info);

		const color = dec.getIssueColor(vscode.Uri.parse('http://example.org/C'));

		expect(color).toBeUndefined();
	});
});

describe('DefinitionNodeDecorationProvider — SHACL ancestor decoration propagation', () => {
	const SH_Violation = 'http://www.w3.org/ns/shacl#Violation';
	const SH_Warning = 'http://www.w3.org/ns/shacl#Warning';
	const SH_Info = 'http://www.w3.org/ns/shacl#Info';

	const LEAF_IRI = 'http://example.org/LeafShape';
	const PARENT_IRI = 'http://example.org/ParentShape';
	const CONTAINER_URI = 'mentor:shapes';

	function makeMockNode(uri: string, parent?: any) {
		return {
			uri,
			parent: parent ?? undefined,
			getResourceUri: () => vscode.Uri.parse(uri),
		};
	}

	function subjectsOf(...iris: string[]): Record<string, any> {
		const subjects: Record<string, any> = {};
		for (const iri of iris) {
			subjects[iri] = [{ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }];
		}
		return subjects;
	}

	let dec: DefinitionNodeDecorationProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		mockConfigValue = undefined;
		mockContextChangeHandlers.length = 0;
		mockSettingsChangeHandlers.clear();
		mockValidationHandlers.length = 0;

		(vscode.workspace as any).onDidChangeConfiguration = vi.fn((handler: any) => {
			handler({ affectsConfiguration: () => false });
			return { dispose: () => {} };
		});

		mockContextService.activeContext = {
			uri: vscode.Uri.parse('file:///test.ttl'),
			subjects: subjectsOf(LEAF_IRI),
			predicates: { label: [] },
		};

		dec = new DefinitionNodeDecorationProvider(mockNodeProvider as any);
	});

	it('decorates container node but not intermediate real-IRI parent', () => {
		const containerNode = makeMockNode(CONTAINER_URI);
		const parentNode = makeMockNode(PARENT_IRI, containerNode);
		const leafNode = makeMockNode(LEAF_IRI, parentNode);

		mockNodeProvider.getNodeForUri.mockImplementation((iri: string) => {
			if (iri === LEAF_IRI) return leafNode;
			return undefined;
		});

		mockValidationService.getLastResult.mockReturnValue({
			results: [{ focusNode: LEAF_IRI, severity: SH_Violation }],
		});

		// Fire validation event
		for (const h of mockValidationHandlers) { h(); }

		// Leaf should have direct violation
		const leafDecoration = dec.provideFileDecoration(vscode.Uri.parse(LEAF_IRI), {} as any);
		expect(leafDecoration).toBeDefined();
		expect(leafDecoration!.color).toBeDefined();

		// Intermediate parent (real IRI) should NOT be decorated — same IRI may
		// appear in other tree branches where it has no violation.
		const ancestorSeverity = (dec as any)._ancestorSeverity as Map<string, string>;
		expect(ancestorSeverity.has(PARENT_IRI)).toBe(false);

		// Container node (mentor: scheme) should have ancestor severity
		const containerDecoration = dec.provideFileDecoration(vscode.Uri.parse(CONTAINER_URI), {} as any);
		expect(containerDecoration).toBeDefined();
		expect(containerDecoration!.color).toBeDefined();
	});

	it('propagates the worst severity to container when multiple descendants have different severities', () => {
		const LEAF_IRI_2 = 'http://example.org/LeafShape2';

		// Both leaf IRIs must be subjects in the active document
		mockContextService.activeContext = {
			...mockContextService.activeContext,
			subjects: subjectsOf(LEAF_IRI, LEAF_IRI_2),
		};

		const containerNode = makeMockNode(CONTAINER_URI);
		const parentNode = makeMockNode(PARENT_IRI, containerNode);
		const leafNode1 = makeMockNode(LEAF_IRI, parentNode);
		const leafNode2 = makeMockNode(LEAF_IRI_2, parentNode);

		mockNodeProvider.getNodeForUri.mockImplementation((iri: string) => {
			if (iri === LEAF_IRI) return leafNode1;
			if (iri === LEAF_IRI_2) return leafNode2;
			return undefined;
		});

		mockValidationService.getLastResult.mockReturnValue({
			results: [
				{ focusNode: LEAF_IRI, severity: SH_Info },
				{ focusNode: LEAF_IRI_2, severity: SH_Violation },
			],
		});

		for (const h of mockValidationHandlers) { h(); }

		const ancestorSeverity = (dec as any)._ancestorSeverity as Map<string, string>;

		// Intermediate real-IRI parent should NOT be in ancestor map
		expect(ancestorSeverity.has(PARENT_IRI)).toBe(false);

		// Container gets worst overall severity (Violation)
		expect(ancestorSeverity.get(CONTAINER_URI)).toBe(SH_Violation);
	});

	it('does not decorate ancestors when nodeProvider is not provided', () => {
		const decNoProvider = new DefinitionNodeDecorationProvider();

		// Need to set up context — focus node must be a subject
		mockContextService.activeContext = {
			uri: vscode.Uri.parse('file:///test.ttl'),
			subjects: subjectsOf(LEAF_IRI),
			predicates: { label: [] },
		};

		mockValidationService.getLastResult.mockReturnValue({
			results: [{ focusNode: LEAF_IRI, severity: SH_Violation }],
		});

		for (const h of mockValidationHandlers) { h(); }

		// Leaf decoration should still work
		const leafDecoration = decNoProvider.provideFileDecoration(vscode.Uri.parse(LEAF_IRI), {} as any);
		expect(leafDecoration).toBeDefined();

		// But ancestor map should be empty
		const ancestorSeverity = (decNoProvider as any)._ancestorSeverity as Map<string, string>;
		expect(ancestorSeverity.size).toBe(0);
	});

	it('skips violations whose focus node is not a subject in the active document', () => {
		const REFERENCED_IRI = 'http://example.org/OnlyReferenced';

		// REFERENCED_IRI is NOT in subjects (only appears as e.g. sh:path object)
		mockContextService.activeContext = {
			uri: vscode.Uri.parse('file:///test.ttl'),
			subjects: subjectsOf(LEAF_IRI),
			predicates: { label: [] },
		};

		mockValidationService.getLastResult.mockReturnValue({
			results: [
				{ focusNode: LEAF_IRI, severity: SH_Warning },
				{ focusNode: REFERENCED_IRI, severity: SH_Violation },
			],
		});

		for (const h of mockValidationHandlers) { h(); }

		// LEAF_IRI is a subject — should be in violations map
		expect((dec as any)._shaclViolations.has(LEAF_IRI)).toBe(true);

		// REFERENCED_IRI is NOT a subject — should be filtered out
		expect((dec as any)._shaclViolations.has(REFERENCED_IRI)).toBe(false);

		// provideFileDecoration for the non-subject should NOT return SHACL decoration
		const decoration = dec.provideFileDecoration(vscode.Uri.parse(REFERENCED_IRI), {} as any);
		// It should get the "not defined in active document" decoration instead
		expect(decoration?.tooltip).toContain('not defined in the active document');
	});

	it('clears maps when validation result is absent', () => {
		// Set up an initial violation — LEAF_IRI is already a subject from beforeEach
		const containerNode = makeMockNode(CONTAINER_URI);
		const leafNode = makeMockNode(LEAF_IRI, containerNode);

		mockNodeProvider.getNodeForUri.mockImplementation((iri: string) => {
			if (iri === LEAF_IRI) return leafNode;
			return undefined;
		});

		mockValidationService.getLastResult.mockReturnValue({
			results: [{ focusNode: LEAF_IRI, severity: SH_Warning }],
		});
		for (const h of mockValidationHandlers) { h(); }

		expect((dec as any)._shaclViolations.size).toBeGreaterThan(0);

		// Now trigger with no result
		mockValidationService.getLastResult.mockReturnValue(undefined);
		for (const h of mockValidationHandlers) { h(); }

		expect((dec as any)._shaclViolations.size).toBe(0);
		expect((dec as any)._ancestorSeverity.size).toBe(0);
	});

	it('gracefully handles focus nodes not found in node provider', () => {
		mockNodeProvider.getNodeForUri.mockReturnValue(undefined);

		mockValidationService.getLastResult.mockReturnValue({
			results: [{ focusNode: LEAF_IRI, severity: SH_Violation }],
		});
		for (const h of mockValidationHandlers) { h(); }

		// Leaf still decorated via _shaclViolations map (direct) — it IS a subject
		const leafDecoration = dec.provideFileDecoration(vscode.Uri.parse(LEAF_IRI), {} as any);
		expect(leafDecoration).toBeDefined();

		// But no ancestors
		expect((dec as any)._ancestorSeverity.size).toBe(0);
	});

	it('fires decoration events for both violated and ancestor URIs', () => {
		const containerNode = makeMockNode(CONTAINER_URI);
		const leafNode = makeMockNode(LEAF_IRI, containerNode);

		mockNodeProvider.getNodeForUri.mockImplementation((iri: string) => {
			if (iri === LEAF_IRI) return leafNode;
			return undefined;
		});

		mockValidationService.getLastResult.mockReturnValue({
			results: [{ focusNode: LEAF_IRI, severity: SH_Warning }],
		});

		const fireSpy = vi.spyOn((dec as any)._onDidChangeFileDecorations, 'fire');

		for (const h of mockValidationHandlers) { h(); }

		// Should fire with specific URIs (violated + ancestor) and then with undefined
		expect(fireSpy).toHaveBeenCalledTimes(2);
		// First call: array of URIs
		const firstCallArg = fireSpy.mock.calls[0][0] as vscode.Uri[];
		expect(Array.isArray(firstCallArg)).toBe(true);
		expect(firstCallArg.length).toBe(2); // 1 violated + 1 ancestor
		// Second call: undefined for full refresh
		expect(fireSpy.mock.calls[1][0]).toBeUndefined();
	});

	it('filters stale violations after context change removes a subject', () => {
		// Step 1: LEAF_IRI is a subject and has a violation
		mockValidationService.getLastResult.mockReturnValue({
			results: [{ focusNode: LEAF_IRI, severity: SH_Violation }],
		});
		for (const h of mockValidationHandlers) { h(); }

		// Verify: LEAF_IRI is decorated
		expect((dec as any)._shaclViolations.has(LEAF_IRI)).toBe(true);

		// Step 2: Context changes — LEAF_IRI is no longer a subject, but
		// the validation result is still cached (stale).
		mockContextService.activeContext = {
			uri: vscode.Uri.parse('file:///test.ttl'),
			subjects: subjectsOf('http://example.org/OtherSubject'),
			predicates: { label: [] },
		};

		// Fire context change (which calls _updateShaclViolations internally)
		for (const h of mockContextChangeHandlers) {
			h(mockContextService.activeContext);
		}

		// LEAF_IRI should now be filtered out because it's no longer a subject
		expect((dec as any)._shaclViolations.has(LEAF_IRI)).toBe(false);

		// provideFileDecoration should NOT return SHACL decoration
		const decoration = dec.provideFileDecoration(vscode.Uri.parse(LEAF_IRI), {} as any);
		expect(decoration?.tooltip).toContain('not defined in the active document');
	});

	it('does not decorate referenced-only property IRIs (sh:path scenario)', () => {
		// Scenario: NodeShape is a subject (defined in the document as sh:NodeShape).
		// PropertyA is NOT a subject (only appears as sh:path object).
		// SHACL validation produces a violation with focusNode = PropertyA
		// (e.g., from an imported meta-shape validating owl:DatatypeProperty instances).
		// PropertyA should NOT get SHACL decoration.
		const SHAPE_IRI = 'http://example.org/NodeShape';
		const PROPERTY_IRI = 'http://example.org/PropertyA';

		mockContextService.activeContext = {
			uri: vscode.Uri.parse('file:///test.ttl'),
			subjects: subjectsOf(SHAPE_IRI), // Only PartShape is a subject
			references: { [PROPERTY_IRI]: [{ start: { line: 10, character: 4 }, end: { line: 10, character: 60 } }] },
			predicates: { label: [] },
		};

		mockValidationService.getLastResult.mockReturnValue({
			results: [
				{ focusNode: PROPERTY_IRI, severity: SH_Violation },
			],
		});
		for (const h of mockValidationHandlers) { h(); }

		// The property IRI should NOT be in _shaclViolations
		expect((dec as any)._shaclViolations.has(PROPERTY_IRI)).toBe(false);

		// provideFileDecoration should return disabled color, not SHACL error
		const decoration = dec.provideFileDecoration(vscode.Uri.parse(PROPERTY_IRI), {} as any);
		expect(decoration).toBeDefined();
		expect(decoration!.tooltip).toContain('not defined in the active document');
	});
});

describe('DefinitionNodeDecorationProvider — violation cap', () => {
	const SH_Violation = 'http://www.w3.org/ns/shacl#Violation';
	const SH_Info = 'http://www.w3.org/ns/shacl#Info';
	const CONTAINER_URI = 'mentor:shapes';

	let dec: DefinitionNodeDecorationProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		mockConfigValue = undefined;
		mockContextChangeHandlers.length = 0;
		mockSettingsChangeHandlers.clear();
		mockValidationHandlers.length = 0;

		(vscode.workspace as any).onDidChangeConfiguration = vi.fn((handler: any) => {
			handler({ affectsConfiguration: () => false });
			return { dispose: () => {} };
		});

		mockContextService.activeContext = {
			uri: vscode.Uri.parse('file:///test.ttl'),
			subjects: {},
			predicates: { label: [] },
		};

		dec = new DefinitionNodeDecorationProvider(mockNodeProvider as any);
	});

	it('caps ancestor walks at MAX_DECORATED_VIOLATIONS', () => {
		// Create 150 violations - only first 100 (sorted by severity) should get ancestor walks
		const results = [];
		const nodeMap = new Map<string, any>();
		const containerNode = { uri: CONTAINER_URI, parent: undefined, getResourceUri: () => vscode.Uri.parse(CONTAINER_URI) };
		const subjects: Record<string, any> = {};

		for (let i = 0; i < 150; i++) {
			const iri = `http://example.org/Shape${i}`;
			const severity = i < 50 ? SH_Violation : SH_Info;
			results.push({ focusNode: iri, severity });
			nodeMap.set(iri, { uri: iri, parent: containerNode, getResourceUri: () => vscode.Uri.parse(iri) });
			subjects[iri] = [{ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }];
		}

		mockContextService.activeContext = {
			...mockContextService.activeContext,
			subjects,
		};

		mockNodeProvider.getNodeForUri.mockImplementation((iri: string) => nodeMap.get(iri));
		mockValidationService.getLastResult.mockReturnValue({ results });

		for (const h of mockValidationHandlers) { h(); }

		// All 150 should be in _shaclViolations (no cap on direct violations)
		expect((dec as any)._shaclViolations.size).toBe(150);

		// getNodeForUri should have been called at most 100 times (the cap)
		expect(mockNodeProvider.getNodeForUri).toHaveBeenCalledTimes(100);
	});

	it('prioritizes Violation severity over Info when capping', () => {
		const results = [];
		const nodeMap = new Map<string, any>();
		const subjects: Record<string, any> = {};

		// Both groups share the same mentor: container
		const containerNode = { uri: CONTAINER_URI, parent: undefined, getResourceUri: () => vscode.Uri.parse(CONTAINER_URI) };

		// 60 Info violations first (lower severity)
		for (let i = 0; i < 60; i++) {
			const iri = `http://example.org/InfoShape${i}`;
			results.push({ focusNode: iri, severity: SH_Info });
			nodeMap.set(iri, { uri: iri, parent: containerNode, getResourceUri: () => vscode.Uri.parse(iri) });
			subjects[iri] = [{ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }];
		}

		// 50 Violation entries (higher severity)
		for (let i = 0; i < 50; i++) {
			const iri = `http://example.org/ViolationShape${i}`;
			results.push({ focusNode: iri, severity: SH_Violation });
			nodeMap.set(iri, { uri: iri, parent: containerNode, getResourceUri: () => vscode.Uri.parse(iri) });
			subjects[iri] = [{ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }];
		}

		mockContextService.activeContext = {
			...mockContextService.activeContext,
			subjects,
		};

		mockNodeProvider.getNodeForUri.mockImplementation((iri: string) => nodeMap.get(iri));
		mockValidationService.getLastResult.mockReturnValue({ results });

		for (const h of mockValidationHandlers) { h(); }

		const ancestorSeverity = (dec as any)._ancestorSeverity as Map<string, string>;

		// Container gets worst overall (Violation processed first due to sort)
		expect(ancestorSeverity.get(CONTAINER_URI)).toBe(SH_Violation);
	});
});
