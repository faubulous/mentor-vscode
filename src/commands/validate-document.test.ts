import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateDocument } from '@src/commands/validate-document';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ShaclValidationService') return mockValidationService;
			if (token === 'WorkspaceIndexerService') return mockWorkspaceIndexerService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => { },
	singleton: () => (t: any) => t,
}));

const { mockValidationService, mockWorkspaceIndexerService } = vi.hoisted(() => ({
	mockValidationService: {
		getEffectiveShapeGraphs: vi.fn(),
		validateDocument: vi.fn(),
	},
	mockWorkspaceIndexerService: {
		waitForIndexed: vi.fn(),
	},
}));

describe('validateDocument command', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		(vscode.window as any).activeTextEditor = {
			document: {
				uri: vscode.Uri.parse('file:///w/models/example.ttl'),
			},
		};

		(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
		(vscode.window as any).showInformationMessage = vi.fn(async () => undefined);
		(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);

		mockWorkspaceIndexerService.waitForIndexed.mockResolvedValue(undefined);
		mockValidationService.getEffectiveShapeGraphs.mockReturnValue(['workspace:///shapes/default.ttl']);
		mockValidationService.validateDocument.mockResolvedValue({
			conforms: true,
			results: [],
		});
	});

	it('waits for workspace indexing before SHACL validation', async () => {
		let resolveWait!: () => void;
		mockWorkspaceIndexerService.waitForIndexed.mockImplementation(
			() => new Promise<void>((resolve) => {
				resolveWait = resolve;
			})
		);

		const pending = validateDocument.handler();
		await Promise.resolve();

		expect(mockWorkspaceIndexerService.waitForIndexed).toHaveBeenCalledTimes(1);
		expect(mockValidationService.getEffectiveShapeGraphs).not.toHaveBeenCalled();
		expect(mockValidationService.validateDocument).not.toHaveBeenCalled();

		resolveWait();
		await pending;

		expect(mockValidationService.getEffectiveShapeGraphs).toHaveBeenCalledTimes(1);
		expect(mockValidationService.validateDocument).toHaveBeenCalledTimes(1);

		const waitCallOrder = mockWorkspaceIndexerService.waitForIndexed.mock.invocationCallOrder[0];
		const effectiveCallOrder = mockValidationService.getEffectiveShapeGraphs.mock.invocationCallOrder[0];
		expect(waitCallOrder).toBeLessThan(effectiveCallOrder);
	});

	it('returns immediately when there is no active editor', async () => {
		(vscode.window as any).activeTextEditor = undefined;

		await validateDocument.handler();

		expect(mockWorkspaceIndexerService.waitForIndexed).not.toHaveBeenCalled();
		expect(mockValidationService.getEffectiveShapeGraphs).not.toHaveBeenCalled();
		expect(mockValidationService.validateDocument).not.toHaveBeenCalled();
	});

	it('focuses the Problems panel when View is selected for validation issues', async () => {
		mockValidationService.validateDocument.mockResolvedValue({
			conforms: false,
			results: [{}],
		});
		(vscode.window as any).showWarningMessage = vi.fn(async () => 'View');

		await validateDocument.handler();

		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
			'SHACL validation: 1 issue(s) found.',
			'View'
		);
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.panel.markers.view.focus');
	});

	it('does not focus the Problems panel when View is not selected', async () => {
		mockValidationService.validateDocument.mockResolvedValue({
			conforms: false,
			results: [{}, {}],
		});
		(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);

		await validateDocument.handler();

		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
			'SHACL validation: 2 issue(s) found.',
			'View'
		);
		expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith('workbench.panel.markers.view.focus');
	});
});
