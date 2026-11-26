import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import 'reflect-metadata';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { FormEditorProvider } from './form-editor-provider';
import { registerFormEditor } from './form-editor-registration';

/**
 * Create a bare extension context.
 */
function createContext(): vscode.ExtensionContext {
	return { subscriptions: [], extensionUri: vscode.Uri.parse('file:///extension') } as unknown as vscode.ExtensionContext;
}

describe('registerFormEditor', () => {
	beforeEach(() => {
		container.reset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('registers the form editor', () => {
		const register = vi.spyOn(vscode.window, 'registerCustomEditorProvider');

		registerFormEditor(createContext());

		expect(container.isRegistered(ServiceToken.DefinitionRevealTarget)).toBe(true);
		expect(register).toHaveBeenCalledWith(FormEditorProvider.viewType, expect.any(FormEditorProvider), expect.anything());
	});

	it('leaves the editor associations alone', () => {
		const update = vi.fn();

		vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: (_key: string, fallback: unknown) => fallback, inspect: () => undefined, update } as unknown as vscode.WorkspaceConfiguration);
		registerFormEditor(createContext());

		expect(update).not.toHaveBeenCalled();
	});
});
