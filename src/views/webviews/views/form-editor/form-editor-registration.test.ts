import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import 'reflect-metadata';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { __events } from '@src/utilities/mocks/vscode';
import { DisabledFormEditorProvider } from './disabled-form-editor-provider';
import { FormEditorProvider } from './form-editor-provider';
import { registerFormEditor } from './form-editor-registration';

/**
 * Configure the experimental flag.
 */
function configureEnabled(enabled: boolean): void {
	vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
		get: (key: string, fallback: unknown) => key === 'enabled' ? enabled : fallback,
		inspect: () => undefined,
		update: async () => { }
	} as unknown as vscode.WorkspaceConfiguration);
}

/**
 * Create a bare extension context.
 */
function createContext(): vscode.ExtensionContext {
	return { subscriptions: [], extensionUri: vscode.Uri.parse('file:///extension') } as unknown as vscode.ExtensionContext;
}

/**
 * Report that the flag changed.
 */
async function changeFlag(): Promise<void> {
	__events.fireDidChangeConfiguration({ affectsConfiguration: (section: string) => section === 'mentor.formEditor.enabled' });
	await new Promise(resolve => setTimeout(resolve, 0));
}

describe('registerFormEditor', () => {
	beforeEach(() => {
		container.reset();
		__events.reset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('registers only the stand-in for the form editor while the flag is off', () => {
		const register = vi.spyOn(vscode.window, 'registerCustomEditorProvider');

		configureEnabled(false);
		registerFormEditor(createContext());

		expect(container.isRegistered(ServiceToken.DefinitionRevealTarget)).toBe(false);
		expect(register).toHaveBeenCalledWith(FormEditorProvider.viewType, expect.any(DisabledFormEditorProvider));
	});

	it('leaves the editor associations alone', () => {
		const update = vi.fn();

		vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: () => false, inspect: () => undefined, update } as unknown as vscode.WorkspaceConfiguration);
		registerFormEditor(createContext());

		expect(update).not.toHaveBeenCalled();
	});

	it('registers the provider while the flag is on', () => {
		configureEnabled(true);
		registerFormEditor(createContext());

		expect(container.isRegistered(ServiceToken.DefinitionRevealTarget)).toBe(true);
	});

	it('offers to reload the window when the flag changes', async () => {
		configureEnabled(false);
		registerFormEditor(createContext());

		const message = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue('Reload Window' as never);
		const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

		await changeFlag();

		expect(message).toHaveBeenCalledWith(expect.any(String), 'Reload Window');
		expect(executeCommand).toHaveBeenCalledWith('workbench.action.reloadWindow');
	});

	it('does not reload when the offer is dismissed', async () => {
		configureEnabled(false);
		registerFormEditor(createContext());

		vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);

		const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

		await changeFlag();

		expect(executeCommand).not.toHaveBeenCalled();
	});
});
