import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({
		get: (_key: string, defaultValue?: any) => defaultValue ?? '',
	}),
}));

import * as vscode from 'vscode';
import { createNotebook } from './create-notebook';

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.workspace as any).textDocuments = [];
	(vscode.window as any).activeTextEditor = undefined;
});

afterEach(() => {
	(vscode.workspace as any).textDocuments = [];
});

describe('createNotebook', () => {
	it('should have the correct command id', () => {
		expect(createNotebook.id).toBe('mentor.command.createNotebook');
	});

	it('should open a new mentor-notebook document', async () => {
		const fakeNotebook = {};
		vi.spyOn(vscode.workspace as any, 'openNotebookDocument').mockResolvedValue(fakeNotebook);
		const showDoc = vi.spyOn(vscode.window as any, 'showNotebookDocument');

		await createNotebook.handler();

		expect(vscode.workspace.openNotebookDocument).toHaveBeenCalledWith('mentor-notebook', expect.anything());
		expect(showDoc).toHaveBeenCalledWith(fakeNotebook);
	});
});
