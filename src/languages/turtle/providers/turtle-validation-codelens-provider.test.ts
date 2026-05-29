import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const {
mockContextService,
mockIndexerService,
mockValidationService,
mockConfigGet
} = vi.hoisted(() => ({
mockContextService: {
contexts: {} as Record<string, any>,
onDidChangeDocumentContext: vi.fn(() => ({ dispose: vi.fn() }))
},
mockIndexerService: {
waitForIndexed: vi.fn(() => Promise.resolve())
},
mockValidationService: {
onDidValidate: vi.fn(() => ({ dispose: vi.fn() })),
getEffectiveShapeGraphs: vi.fn(() => [] as string[]),
getLastResult: vi.fn(() => undefined)
},
mockConfigGet: vi.fn(() => true)
}));

vi.mock('tsyringe', () => ({
container: {
resolve: vi.fn((token: string) => {
if (token === 'DocumentContextService') return mockContextService;
if (token === 'WorkspaceIndexerService') return mockIndexerService;
if (token === 'ShaclValidationService') return mockValidationService;
return {};
})
},
injectable: () => (_target: any) => _target,
inject: () => () => {
},
singleton: () => (_target: any) => _target
}));

vi.mock('@src/utilities/vscode/config', () => ({
getConfig: () => ({
get: (key: string, defaultValue?: any) => {
const value = mockConfigGet(key);
return value === undefined ? defaultValue : value;
}
})
}));

import { TurtleValidationCodeLensProvider } from '@src/languages/turtle/providers/turtle-validation-codelens-provider';

const doc = (uri: string = 'file:///doc.ttl') => ({ uri: { toString: () => uri } }) as any;

beforeEach(() => {
vi.clearAllMocks();
mockContextService.contexts = {};
mockContextService.onDidChangeDocumentContext.mockReturnValue({ dispose: vi.fn() });
mockIndexerService.waitForIndexed.mockResolvedValue(undefined);
mockValidationService.onDidValidate.mockReturnValue({ dispose: vi.fn() });
mockValidationService.getEffectiveShapeGraphs.mockReturnValue([]);
mockValidationService.getLastResult.mockReturnValue(undefined);
mockConfigGet.mockReturnValue(true);
});

describe('TurtleValidationCodeLensProvider', () => {
it('can be created', () => {
expect(() => new TurtleValidationCodeLensProvider()).not.toThrow();
});

it('returns empty result when currently initializing', async () => {
const provider = new TurtleValidationCodeLensProvider();
(provider as any)._initializing = true;

const result = await provider.provideCodeLenses(doc(), null as any);

expect(result).toEqual([]);
});

it('returns empty result when disabled', async () => {
const provider = new TurtleValidationCodeLensProvider();
(provider as any)._initialized = true;
(provider as any)._enabled = false;

const result = await provider.provideCodeLenses(doc(), null as any);

expect(result).toEqual([]);
});

it('returns empty result when document context is missing', async () => {
const provider = new TurtleValidationCodeLensProvider();
(provider as any)._initialized = true;
(provider as any)._enabled = true;

const result = await provider.provideCodeLenses(doc('file:///missing.ttl'), null as any);

expect(result).toEqual([]);
});

it('creates not-configured lens when no shape files are configured', async () => {
const uri = 'file:///no-shapes.ttl';
mockContextService.contexts[uri] = { any: true };
mockValidationService.getEffectiveShapeGraphs.mockReturnValue([]);

const provider = new TurtleValidationCodeLensProvider();
(provider as any)._initialized = true;
(provider as any)._enabled = true;

const result = await provider.provideCodeLenses(doc(uri), null as any);

expect(result).toHaveLength(1);
expect(result[0].command?.command).toBe('mentor.command.manageShaclShapes');
expect(result[0].command?.title).toContain('Validation: not configured');
expect(result[0].command?.tooltip).toContain('Configure SHACL shape files');
});

it('creates lenses for configured shapes and conforming result', async () => {
const uri = 'file:///one-shape.ttl';
mockContextService.contexts[uri] = { any: true };
mockValidationService.getEffectiveShapeGraphs.mockReturnValue(['file:///shape.ttl']);
mockValidationService.getLastResult.mockReturnValue({ conforms: true, results: [], reportDataset: {} as any });

const provider = new TurtleValidationCodeLensProvider();
(provider as any)._initialized = true;
(provider as any)._enabled = true;

const result = await provider.provideCodeLenses(doc(uri), null as any);

expect(result).toHaveLength(3);
expect(result[0].command?.title).toContain('Validation: 1 file enabled');
expect(result[1].command?.command).toBe('mentor.command.validateDocument');
expect(result[2].command?.title).toContain('Conforms');
});

it('creates multi-shape tooltip and failing status lens', async () => {
const uri = 'file:///two-shapes.ttl';
mockContextService.contexts[uri] = { any: true };
mockValidationService.getEffectiveShapeGraphs.mockReturnValue(['file:///shape-a.ttl', 'file:///shape-b.ttl']);
mockValidationService.getLastResult.mockReturnValue({
conforms: false,
results: [{}, {}],
reportDataset: {} as any
});

const provider = new TurtleValidationCodeLensProvider();
(provider as any)._initialized = true;
(provider as any)._enabled = true;

const result = await provider.provideCodeLenses(doc(uri), null as any);

expect(result).toHaveLength(3);
expect(result[0].command?.title).toContain('Validation: 2 files enabled');
expect(result[0].command?.tooltip).toContain('- file:///shape-a.ttl');
expect(result[2].command?.title).toContain('2 issue(s)');
});

it('fires code lens change from initialize callbacks when enabled', async () => {
let resolveIndexed!: () => void;
let contextChanged!: () => void;
let validated!: () => void;

mockIndexerService.waitForIndexed.mockReturnValue(new Promise<void>((resolve) => {
resolveIndexed = resolve;
}));
mockContextService.onDidChangeDocumentContext.mockImplementation((handler: () => void) => {
contextChanged = handler;
return { dispose: vi.fn() };
});
mockValidationService.onDidValidate.mockImplementation((handler: () => void) => {
validated = handler;
return { dispose: vi.fn() };
});

const uri = 'file:///callbacks.ttl';
mockContextService.contexts[uri] = { any: true };

const provider = new TurtleValidationCodeLensProvider();
const fired: number[] = [];
provider.onDidChangeCodeLenses(() => fired.push(1));

await provider.provideCodeLenses(doc(uri), null as any);
resolveIndexed();
await Promise.resolve();
contextChanged();
validated();

expect(fired).toHaveLength(3);
});

it('updates enabled state and fires on relevant configuration change', () => {
let configChanged!: (e: { affectsConfiguration: (key: string) => boolean }) => void;
vi.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockImplementation((handler: any) => {
configChanged = handler;
return { dispose: vi.fn() } as any;
});

const provider = new TurtleValidationCodeLensProvider();
const fired: number[] = [];
provider.onDidChangeCodeLenses(() => fired.push(1));

mockConfigGet.mockReturnValue(false);
configChanged({ affectsConfiguration: (key: string) => key === 'mentor.shacl.enabled' });
expect((provider as any)._enabled).toBe(false);
expect(fired).toHaveLength(1);

configChanged({ affectsConfiguration: () => false });
expect(fired).toHaveLength(1);
});
});
