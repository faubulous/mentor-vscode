import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockWebviewRegistry: any;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'WebviewControllerRegistry') {
				return mockWebviewRegistry;
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { showWebview } from './show-webview';

beforeEach(() => {
	mockWebviewRegistry = {
		collectTargets: vi.fn(() => []),
		findById: vi.fn(() => undefined),
	};
	(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
	(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
});

describe('showWebview command', () => {
	it('should have correct id', () => {
		expect(showWebview.id).toBe('mentor.webview.show');
	});

	it('should do nothing when no targets are available and no id provided', async () => {
		mockWebviewRegistry.collectTargets.mockReturnValue([]);
		(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
		await showWebview.handler(undefined);
		expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
	});

	it('should do nothing when target not found for provided id', async () => {
		mockWebviewRegistry.collectTargets.mockReturnValue([]);
		await showWebview.handler({ id: 'unknown-view' });
		expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
	});

	it('should execute focus command for view kind webview', async () => {
		const target = { id: 'myView', label: 'My View', kind: 'view' };
		mockWebviewRegistry.collectTargets.mockReturnValue([target]);
		mockWebviewRegistry.findById.mockReturnValue({ show: vi.fn(), focus: vi.fn() });
		await showWebview.handler('myView');
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('myView.focus');
	});

	it('should call controller.show for panel kind', async () => {
		const mockController = { show: vi.fn(), focus: vi.fn() };
		const target = { id: 'myPanel', label: 'My Panel', kind: 'panel' };
		mockWebviewRegistry.collectTargets.mockReturnValue([target]);
		mockWebviewRegistry.findById.mockReturnValue(mockController);
		await showWebview.handler('myPanel');
		expect(mockController.show).toHaveBeenCalledWith(vscode.ViewColumn.Active);
	});
});
