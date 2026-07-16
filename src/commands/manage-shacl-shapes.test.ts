import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { mockStore, mockValidationService, mockConfigUpdate } = vi.hoisted(() => ({
	mockStore: {
		getGraphs: vi.fn(),
		any: vi.fn(),
	},
	mockValidationService: {
		getValidationSettings: vi.fn(),
		getDocumentLocation: vi.fn(),
		getRdfExtensions: vi.fn(),
		getDocumentValidationState: vi.fn(),
		checkShaclProfiles: vi.fn(),
	},
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

const DOCUMENT_KEY = 'models/example.ttl';
const RDF_EXTENSIONS = ['.ttl', '.n3', '.nt', '.nq', '.trig', '.rdf'];

/** The per-scope settings values returned by the config double's inspect(). */
let workspaceValue: any;
let globalValue: any;

/**
 * Points the mocked validation service and configuration at the given per-scope
 * settings values; the merged view unions the profiles (workspace wins).
 */
function useSettings(workspace: any, user?: any) {
	workspaceValue = workspace;
	globalValue = user;
	mockValidationService.getValidationSettings.mockReturnValue({
		profiles: { ...(user?.profiles ?? {}), ...(workspace?.profiles ?? {}) },
	});
}

/**
 * Creates a quick pick mock whose `show()` runs the given scenario against the
 * captured event handlers.
 */
function createQuickPickMock(scenario: (quickPick: any, handlers: {
	changeSelection?: (items: any[]) => void;
	triggerButton?: (button: any) => void;
	accept?: () => void;
	hide?: () => void;
}) => void) {
	const handlers: any = {};

	const quickPick = {
		title: '',
		placeholder: '',
		items: [] as any[],
		selectedItems: [] as any[],
		buttons: [] as any[],
		canSelectMany: false,
		onDidChangeSelection: vi.fn((handler: any) => { handlers.changeSelection = handler; return { dispose: () => {} }; }),
		onDidTriggerButton: vi.fn((handler: any) => { handlers.triggerButton = handler; return { dispose: () => {} }; }),
		onDidTriggerItemButton: vi.fn(() => ({ dispose: () => {} })),
		onDidAccept: vi.fn((handler: any) => { handlers.accept = handler; return { dispose: () => {} }; }),
		onDidHide: vi.fn((handler: any) => { handlers.hide = handler; return { dispose: () => {} }; }),
		hide: vi.fn(() => handlers.hide?.()),
		dispose: vi.fn(),
		show: vi.fn(() => scenario(quickPick, handlers)),
	};

	return quickPick;
}

describe('manageShaclShapes', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		(vscode.window as any).activeTextEditor = {
			document: {
				uri: vscode.Uri.parse('file:///w/models/example.ttl'),
			},
		};
		(vscode.window as any).showInformationMessage = vi.fn();

		mockStore.getGraphs.mockReturnValue(['workspace:///shapes/default.ttl']);
		mockStore.any.mockReturnValue(true);

		useSettings({});
		mockValidationService.getDocumentLocation.mockReturnValue({ path: DOCUMENT_KEY, fragment: undefined });
		mockValidationService.getRdfExtensions.mockReturnValue(RDF_EXTENSIONS);
		mockValidationService.getDocumentValidationState.mockReturnValue({
			mode: 'none',
			profileNames: [],
			effectiveShapes: [],
			matchedPaths: [],
		});
		mockValidationService.checkShaclProfiles.mockResolvedValue({ profiles: {} });

		mockConfigUpdate.mockResolvedValue(undefined);

		(vscode.workspace as any).getConfiguration = vi.fn(() => ({
			inspect: (_key: string) => ({ workspaceValue, globalValue }),
			update: (...args: any[]) => mockConfigUpdate(...args),
		}));

		(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
	});

	it('opens the file picker when no profiles are defined and creates an auto profile', async () => {
		const quickPick = createQuickPickMock((qp, handlers) => {
			expect(qp.title).toBe('SHACL Shape Files');

			handlers.changeSelection?.(qp.items);
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledTimes(1);
		expect(mockConfigUpdate).toHaveBeenCalledWith(
			'validation',
			{
				profiles: {
					'models-example-ttl': {
						name: DOCUMENT_KEY,
						shapes: ['workspace:///shapes/default.ttl'],
						includeFiles: [DOCUMENT_KEY],
					},
				},
			},
			vscode.ConfigurationTarget.Workspace
		);
	});

	it('opens the file picker directly when only the document auto profile matches', async () => {
		useSettings({
			profiles: {
				'models-example-ttl': {
					name: DOCUMENT_KEY,
					shapes: ['workspace:///shapes/default.ttl'],
					includeFiles: [DOCUMENT_KEY],
				},
				'core': { name: 'Core', shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['other/*'] },
			},
		});
		mockValidationService.getDocumentValidationState.mockReturnValue({
			mode: 'matched',
			profileNames: ['models-example-ttl'],
			effectiveShapes: ['workspace:///shapes/default.ttl'],
			matchedPaths: [DOCUMENT_KEY],
		});

		let seenTitle = '';
		let preselected: string[] = [];

		const quickPick = createQuickPickMock((qp, handlers) => {
			seenTitle = qp.title;
			preselected = qp.selectedItems.map((item: any) => item.graphUri);
			handlers.hide?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(seenTitle).toBe('SHACL Shape Files');
		expect(preselected).toEqual(['workspace:///shapes/default.ttl']);
		expect(mockConfigUpdate).not.toHaveBeenCalled();
	});

	it('updates the auto profile shapes when the file selection changes', async () => {
		useSettings({
			profiles: {
				'models-example-ttl': {
					name: DOCUMENT_KEY,
					shapes: ['workspace:///shapes/old.ttl'],
					includeFiles: [DOCUMENT_KEY],
				},
			},
		});
		mockValidationService.getDocumentValidationState.mockReturnValue({
			mode: 'matched',
			profileNames: ['models-example-ttl'],
			effectiveShapes: ['workspace:///shapes/old.ttl'],
			matchedPaths: [DOCUMENT_KEY],
		});

		const quickPick = createQuickPickMock((qp, handlers) => {
			handlers.changeSelection?.(qp.items);
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledWith(
			'validation',
			{
				profiles: {
					'models-example-ttl': {
						name: DOCUMENT_KEY,
						shapes: ['workspace:///shapes/default.ttl'],
						includeFiles: [DOCUMENT_KEY],
					},
				},
			},
			vscode.ConfigurationTarget.Workspace
		);
	});

	it('deletes the auto profile when all files are unchecked', async () => {
		useSettings({
			profiles: {
				'models-example-ttl': {
					name: DOCUMENT_KEY,
					shapes: ['workspace:///shapes/default.ttl'],
					includeFiles: [DOCUMENT_KEY],
				},
				'core': { name: 'Core', shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['other/*'] },
			},
		});
		mockValidationService.getDocumentValidationState.mockReturnValue({
			mode: 'matched',
			profileNames: ['models-example-ttl'],
			effectiveShapes: ['workspace:///shapes/default.ttl'],
			matchedPaths: [DOCUMENT_KEY],
		});

		const quickPick = createQuickPickMock((_qp, handlers) => {
			handlers.changeSelection?.([]);
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledTimes(1);

		const persisted = (mockConfigUpdate as Mock).mock.calls[0][1];

		expect(persisted.profiles).not.toHaveProperty('models-example-ttl');
		expect(persisted.profiles).toHaveProperty('core');
	});

	it('adds the document path to a newly checked profile', async () => {
		useSettings({
			profiles: {
				'core': { name: 'Core', shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['other/*'] },
			},
		});

		const quickPick = createQuickPickMock((qp, handlers) => {
			expect(qp.title).toBe('SHACL Validation Profiles');
			expect(qp.items.map((item: any) => item.label)).toEqual(['Core']);
			expect(qp.selectedItems).toEqual([]);

			qp.selectedItems = qp.items;
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledWith(
			'validation',
			{
				profiles: {
					'core': {
						name: 'Core',
						shapes: ['workspace:///shapes/core.ttl'],
						includeFiles: ['other/*', DOCUMENT_KEY],
					},
				},
			},
			vscode.ConfigurationTarget.Workspace
		);
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
	});

	it('writes to the user scope when a user-scope profile is checked', async () => {
		useSettings(
			{},
			{
				profiles: {
					'personal': { name: 'Personal', shapes: ['workspace:///shapes/personal.ttl'], includeFiles: ['other/*'] },
				},
			}
		);

		const quickPick = createQuickPickMock((qp, handlers) => {
			qp.selectedItems = qp.items;
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledWith(
			'validation',
			{
				profiles: {
					'personal': {
						name: 'Personal',
						shapes: ['workspace:///shapes/personal.ttl'],
						includeFiles: ['other/*', DOCUMENT_KEY],
					},
				},
			},
			vscode.ConfigurationTarget.Global
		);
	});

	it('removes the literal entry when a literally-added profile is unchecked', async () => {
		useSettings({
			profiles: {
				'core': {
					name: 'Core',
					shapes: ['workspace:///shapes/core.ttl'],
					includeFiles: ['other/*', DOCUMENT_KEY],
				},
			},
		});
		mockValidationService.getDocumentValidationState.mockReturnValue({
			mode: 'matched',
			profileNames: ['core'],
			effectiveShapes: ['workspace:///shapes/core.ttl'],
			matchedPaths: [DOCUMENT_KEY],
		});

		const quickPick = createQuickPickMock((qp, handlers) => {
			expect(qp.selectedItems.map((item: any) => item.profileName)).toEqual(['core']);

			qp.selectedItems = [];
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledWith(
			'validation',
			{
				profiles: {
					'core': {
						name: 'Core',
						shapes: ['workspace:///shapes/core.ttl'],
						includeFiles: ['other/*'],
					},
				},
			},
			vscode.ConfigurationTarget.Workspace
		);
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
	});

	it('deletes the auto profile when it is unchecked in the profile picker', async () => {
		useSettings({
			profiles: {
				'models-example-ttl': {
					name: DOCUMENT_KEY,
					shapes: ['workspace:///shapes/extra.ttl'],
					includeFiles: [DOCUMENT_KEY],
				},
				'core': { name: 'Core', shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['**/*'] },
			},
		});
		mockValidationService.getDocumentValidationState.mockReturnValue({
			mode: 'matched',
			profileNames: ['models-example-ttl', 'core'],
			effectiveShapes: ['workspace:///shapes/extra.ttl', 'workspace:///shapes/core.ttl'],
			matchedPaths: [DOCUMENT_KEY, '**/*'],
		});

		const quickPick = createQuickPickMock((qp, handlers) => {
			// Keep the pattern-applied profile, uncheck the document's auto profile.
			qp.selectedItems = qp.items.filter((item: any) => item.profileName === 'core');
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledTimes(1);

		const persisted = (mockConfigUpdate as Mock).mock.calls[0][1];

		expect(persisted.profiles).not.toHaveProperty('models-example-ttl');
		expect(persisted.profiles).toHaveProperty('core');
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
	});

	it('excludes the document when a pattern-matched profile is unchecked', async () => {
		useSettings({
			profiles: {
				'core': { name: 'Core', shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['**/*'] },
			},
		});
		mockValidationService.getDocumentValidationState.mockReturnValue({
			mode: 'matched',
			profileNames: ['core'],
			effectiveShapes: ['workspace:///shapes/core.ttl'],
			matchedPaths: ['**/*'],
		});

		const quickPick = createQuickPickMock((qp, handlers) => {
			qp.selectedItems = [];
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledWith(
			'validation',
			{
				profiles: {
					'core': {
						name: 'Core',
						shapes: ['workspace:///shapes/core.ttl'],
						includeFiles: ['**/*'],
						excludeFiles: [DOCUMENT_KEY],
					},
				},
			},
			vscode.ConfigurationTarget.Workspace
		);
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
	});

	it('drops the exclusion when a previously-excluded pattern profile is re-checked', async () => {
		useSettings({
			profiles: {
				'core': {
					name: 'Core',
					shapes: ['workspace:///shapes/core.ttl'],
					includeFiles: ['**/*'],
					excludeFiles: [DOCUMENT_KEY],
				},
			},
		});
		// The document is excluded, so no profile currently matches it.
		mockValidationService.getDocumentValidationState.mockReturnValue({
			mode: 'none',
			profileNames: [],
			effectiveShapes: [],
			matchedPaths: [],
		});

		const quickPick = createQuickPickMock((qp, handlers) => {
			expect(qp.selectedItems).toEqual([]);

			qp.selectedItems = qp.items;
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).toHaveBeenCalledWith(
			'validation',
			{
				profiles: {
					'core': {
						name: 'Core',
						shapes: ['workspace:///shapes/core.ttl'],
						includeFiles: ['**/*'],
					},
				},
			},
			vscode.ConfigurationTarget.Workspace
		);
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
	});

	it('does not write when the selection matches the applied profiles', async () => {
		useSettings({
			profiles: {
				'core': { name: 'Core', shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['**/*'] },
			},
		});
		mockValidationService.getDocumentValidationState.mockReturnValue({
			mode: 'matched',
			profileNames: ['core'],
			effectiveShapes: ['workspace:///shapes/core.ttl'],
			matchedPaths: ['**/*'],
		});

		const quickPick = createQuickPickMock((qp, handlers) => {
			qp.selectedItems = qp.items.filter((item: any) => item.picked);
			handlers.accept?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(mockConfigUpdate).not.toHaveBeenCalled();
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
	});

	it('marks broken profiles with a warning in the description', async () => {
		useSettings({
			profiles: { 'core': { name: 'Core', shapes: ['workspace:///shapes/missing.ttl'], includeFiles: ['other/*'] } },
		});
		mockValidationService.checkShaclProfiles.mockResolvedValue({
			profiles: { 'core': ['workspace:///shapes/missing.ttl'] },
		});

		let capturedItems: any[] = [];

		const quickPick = createQuickPickMock((qp, handlers) => {
			capturedItems = qp.items;
			handlers.hide?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(capturedItems[0].description).toContain('$(warning) missing files');
		expect(mockConfigUpdate).not.toHaveBeenCalled();
	});

	it('opens the validation profiles settings when the manage-profiles button is triggered', async () => {
		useSettings({
			profiles: { 'core': { shapes: [], includeFiles: ['other/*'] } },
		});

		const quickPick = createQuickPickMock((qp, handlers) => {
			// Trigger the last title-bar button (manage profiles).
			handlers.triggerButton?.(qp.buttons[qp.buttons.length - 1]);
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mentor.command.openSettings', 'validation.profiles');
		expect(mockConfigUpdate).not.toHaveBeenCalled();
	});

	it('switches from the profile picker to the file picker and back', async () => {
		useSettings({
			profiles: { 'core': { shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['other/*'] } },
		});

		const seenTitles: string[] = [];

		(vscode.window as any).createQuickPick = vi.fn(() => createQuickPickMock((qp, handlers) => {
			seenTitles.push(qp.title);

			if (qp.title === 'SHACL Validation Profiles' && seenTitles.length === 1) {
				// First picker: switch to individual file selection.
				handlers.triggerButton?.(qp.buttons[0]);
			} else if (qp.title === 'SHACL Shape Files') {
				// File picker: go back to the profile picker.
				expect(qp.buttons[0]).toBe(vscode.QuickInputButtons.Back);
				handlers.triggerButton?.(qp.buttons[0]);
			} else {
				// Second profile picker: cancel.
				handlers.hide?.();
			}
		}));

		await manageShaclShapes.handler();

		expect(seenTitles).toEqual(['SHACL Validation Profiles', 'SHACL Shape Files', 'SHACL Validation Profiles']);
		expect(mockConfigUpdate).not.toHaveBeenCalled();
	});

	it('shows decoded labels for percent-encoded shape file paths', async () => {
		mockStore.getGraphs.mockReturnValue(['workspace:///my%20shapes/default%20shapes.ttl']);

		let capturedItems: any[] = [];

		const quickPick = createQuickPickMock((qp, handlers) => {
			capturedItems = qp.items;
			handlers.hide?.();
		});

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		await manageShaclShapes.handler();

		expect(capturedItems[0].label).toBe('my shapes/default shapes.ttl');
		expect(capturedItems[0].graphUri).toBe('workspace:///my%20shapes/default%20shapes.ttl');
	});
});
