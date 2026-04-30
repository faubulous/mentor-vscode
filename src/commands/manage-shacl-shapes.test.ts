import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { mockStore, mockValidationService, mockConfigGet, mockConfigUpdate } = vi.hoisted(() => ({
	mockStore: {
		getGraphs: vi.fn(),
		any: vi.fn(),
	},
	mockValidationService: {
		getEffectiveShapeGraphs: vi.fn(),
	},
	mockConfigGet: vi.fn(),
	mockConfigUpdate: vi.fn(),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'Store') return mockStore;
			if (token === 'ShaclValidationService') return mockValidationService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { manageShaclShapes } from '@src/commands/manage-shacl-shapes';

describe('manageShaclShapes', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		(vscode.window as any).activeTextEditor = {
			document: {
				uri: vscode.Uri.parse('file:///w/models/example.ttl'),
			},
		};

		mockStore.getGraphs.mockReturnValue(['workspace:///shapes/default.ttl']);
		mockStore.any.mockReturnValue(true);
		mockValidationService.getEffectiveShapeGraphs.mockReturnValue([]);

		mockConfigGet.mockImplementation((key: string, defaultValue?: any) => {
			if (key === 'validation') {
				return {};
			}
			return defaultValue;
		});
		mockConfigUpdate.mockResolvedValue(undefined);

		(vscode.workspace as any).getConfiguration = vi.fn(() => ({
			get: (...args: any[]) => mockConfigGet(...args),
			update: (...args: any[]) => mockConfigUpdate(...args),
		}));
	});

	it('selects and persists default shape when clicking item default button', async () => {
		let onDidChangeSelection: ((items: any[]) => void) | undefined;
		let onDidTriggerItemButton: ((e: any) => void) | undefined;
		let onDidAccept: (() => void) | undefined;
		let onDidHide: (() => void) | undefined;

		const quickPick = {
			title: '',
			placeholder: '',
			items: [] as any[],
			buttons: [] as any[],
			canSelectMany: false,
			onDidChangeSelection: vi.fn((handler: (items: any[]) => void) => {
				onDidChangeSelection = handler;
				return { dispose: () => {} };
			}),
			onDidTriggerButton: vi.fn((_handler: () => void) => ({ dispose: () => {} })),
			onDidTriggerItemButton: vi.fn((handler: (e: any) => void) => {
				onDidTriggerItemButton = handler;
				return { dispose: () => {} };
			}),
			onDidAccept: vi.fn((handler: () => void) => {
				onDidAccept = handler;
				return { dispose: () => {} };
			}),
			onDidHide: vi.fn((handler: () => void) => {
				onDidHide = handler;
				return { dispose: () => {} };
			}),
			hide: vi.fn(() => {
				onDidHide?.();
			}),
			dispose: vi.fn(),
			show: vi.fn(() => {
				const firstItem = quickPick.items[0];
				expect(firstItem).toBeDefined();

				// Reproduce regression: set as default using item button without manually checking item.
				onDidTriggerItemButton?.({
					item: firstItem,
					button: firstItem.buttons?.[0],
				});

				// Simulate internal quick-pick selection event after item update.
				onDidChangeSelection?.(quickPick.items.filter((item: any) => item.picked));

				onDidAccept?.();
			}),
		};

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(quickPick.items[0].picked).toBe(true);
		expect(mockConfigUpdate).toHaveBeenCalledTimes(1);
		expect(mockConfigUpdate).toHaveBeenCalledWith(
			'validation',
			expect.objectContaining({
				defaults: ['workspace:///shapes/default.ttl'],
			}),
			vscode.ConfigurationTarget.Global
		);

		const persistedConfig = (mockConfigUpdate as Mock).mock.calls[0][1];
		expect(persistedConfig.graphs).toBeUndefined();
	});

	it('shows decoded label when shape file path contains percent-encoded characters', async () => {
		mockStore.getGraphs.mockReturnValue(['workspace:///my%20shapes/default%20shapes.ttl']);

		let capturedItems: any[] = [];

		const quickPick = {
			title: '',
			placeholder: '',
			items: [] as any[],
			buttons: [] as any[],
			canSelectMany: false,
			onDidChangeSelection: vi.fn(() => ({ dispose: () => {} })),
			onDidTriggerButton: vi.fn(() => ({ dispose: () => {} })),
			onDidTriggerItemButton: vi.fn(() => ({ dispose: () => {} })),
			onDidAccept: vi.fn(() => ({ dispose: () => {} })),
			onDidHide: vi.fn((handler: () => void) => {
				// Trigger hide immediately to resolve the promise
				setImmediate(handler);
				return { dispose: () => {} };
			}),
			hide: vi.fn(),
			dispose: vi.fn(),
			show: vi.fn(() => {
				capturedItems = quickPick.items;
			}),
		};

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(capturedItems[0].label).toBe('my shapes/default shapes.ttl');
		expect(capturedItems[0].graphUri).toBe('workspace:///my%20shapes/default%20shapes.ttl');
	});

	it('persists default shape when selection events provide plain QuickPickItem values', async () => {
		let onDidChangeSelection: ((items: any[]) => void) | undefined;
		let onDidTriggerItemButton: ((e: any) => void) | undefined;
		let onDidAccept: (() => void) | undefined;
		let onDidHide: (() => void) | undefined;

		const quickPick = {
			title: '',
			placeholder: '',
			items: [] as any[],
			buttons: [] as any[],
			canSelectMany: false,
			onDidChangeSelection: vi.fn((handler: (items: any[]) => void) => {
				onDidChangeSelection = handler;
				return { dispose: () => {} };
			}),
			onDidTriggerButton: vi.fn((_handler: () => void) => ({ dispose: () => {} })),
			onDidTriggerItemButton: vi.fn((handler: (e: any) => void) => {
				onDidTriggerItemButton = handler;
				return { dispose: () => {} };
			}),
			onDidAccept: vi.fn((handler: () => void) => {
				onDidAccept = handler;
				return { dispose: () => {} };
			}),
			onDidHide: vi.fn((handler: () => void) => {
				onDidHide = handler;
				return { dispose: () => {} };
			}),
			hide: vi.fn(() => {
				onDidHide?.();
			}),
			dispose: vi.fn(),
			show: vi.fn(() => {
				const firstItem = quickPick.items[0];

				onDidTriggerItemButton?.({
					item: { ...firstItem, graphUri: undefined },
					button: firstItem.buttons?.[0],
				});

				// Simulate a selection payload without custom graphUri property.
				onDidChangeSelection?.(quickPick.items
					.filter((item: any) => item.picked)
					.map((item: any) => ({ label: item.label, detail: item.detail, description: item.description })));

				onDidAccept?.();
			}),
		};

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledTimes(1);
		expect(mockConfigUpdate).toHaveBeenCalledWith(
			'validation',
			expect.objectContaining({
				defaults: ['workspace:///shapes/default.ttl'],
			}),
			vscode.ConfigurationTarget.Global
		);
	});

	it('writes excludeShapes when a default shape is unchecked', async () => {
		let onDidChangeSelection: ((items: any[]) => void) | undefined;
		let onDidAccept: (() => void) | undefined;
		let onDidHide: (() => void) | undefined;

		mockConfigGet.mockImplementation((key: string, defaultValue?: any) => {
			if (key === 'validation') {
				return {
					defaults: ['workspace:///shapes/default.ttl'],
					graphs: {},
				};
			}
			return defaultValue;
		});

		mockValidationService.getEffectiveShapeGraphs.mockReturnValue(['workspace:///shapes/default.ttl']);

		const quickPick = {
			title: '',
			placeholder: '',
			items: [] as any[],
			buttons: [] as any[],
			canSelectMany: false,
			onDidChangeSelection: vi.fn((handler: (items: any[]) => void) => {
				onDidChangeSelection = handler;
				return { dispose: () => {} };
			}),
			onDidTriggerButton: vi.fn((_handler: () => void) => ({ dispose: () => {} })),
			onDidTriggerItemButton: vi.fn((_handler: (e: any) => void) => ({ dispose: () => {} })),
			onDidAccept: vi.fn((handler: () => void) => {
				onDidAccept = handler;
				return { dispose: () => {} };
			}),
			onDidHide: vi.fn((handler: () => void) => {
				onDidHide = handler;
				return { dispose: () => {} };
			}),
			hide: vi.fn(() => {
				onDidHide?.();
			}),
			dispose: vi.fn(),
			show: vi.fn(() => {
				// User unchecks all items, including the default one.
				onDidChangeSelection?.([]);
				onDidAccept?.();
			}),
		};

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledTimes(1);

		const persistedConfig = (mockConfigUpdate as Mock).mock.calls[0][1];
		expect(persistedConfig.defaults).toEqual(['workspace:///shapes/default.ttl']);

		const graphConfig = Object.values(persistedConfig.graphs ?? {})[0] as any;
		expect(graphConfig).toEqual({
			includeDefaults: true,
			includeShapes: [],
			excludeShapes: ['workspace:///shapes/default.ttl'],
		});
	});
});
