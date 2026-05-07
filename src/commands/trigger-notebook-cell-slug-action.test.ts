import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockContexts: Record<string, any>;
let mockEditHandler: Mock;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') {
				return { contexts: mockContexts };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/utilities/vscode/notebook', () => ({
	findNotebookContainingCell: vi.fn(),
}));

vi.mock('@src/providers/workspace-uri', () => ({
	WorkspaceUri: {
		toWorkspaceUri: vi.fn((uri: any, slug: string) => ({ scheme: 'workspace', path: '/test', fragment: slug })),
		toCanonicalString: vi.fn((uri: any) => `workspace:///test#${uri.fragment}`),
	},
}));

vi.mock('./edit-notebook-cell-slug', () => ({
	editNotebookCellSlug: {
		id: 'mentor.command.editNotebookCellSlug',
		handler: (...args: any[]) => mockEditHandler(...args),
	},
}));

import * as vscode from 'vscode';
import { findNotebookContainingCell } from '@src/utilities/vscode/notebook';
import { triggerNotebookCellSlugAction } from '@src/commands/trigger-notebook-cell-slug-action';

const cellUri = vscode.Uri.parse('vscode-notebook-cell:///test.mentor-notebook#W0');

function makeNotebook(cellMeta: Record<string, any> = {}) {
	const cell = { index: 0, document: { uri: cellUri }, metadata: cellMeta };
	return { getCells: vi.fn(() => [cell]) };
}

beforeEach(() => {
	mockContexts = {};
	mockEditHandler = vi.fn();
	(findNotebookContainingCell as Mock).mockReturnValue(undefined);
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showInformationMessage = vi.fn(async () => undefined);
	(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
	(vscode.env as any).clipboard = { writeText: vi.fn(async () => {}), readText: vi.fn(async () => '') };
});

describe('triggerNotebookCellSlugAction command', () => {
	it('has correct command id', () => {
		expect(triggerNotebookCellSlugAction.id).toBe('mentor.command.triggerNotebookCellSlugAction');
	});

	it('shows warning when no cell URI provided', async () => {
		await triggerNotebookCellSlugAction.handler(undefined as any);
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No notebook cell specified.');
	});

	it('shows warning when notebook not found', async () => {
		(findNotebookContainingCell as Mock).mockReturnValue(undefined);
		await triggerNotebookCellSlugAction.handler(cellUri);
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Could not find the notebook containing this cell.');
	});

	it('shows warning when cell not found in notebook', async () => {
		const notebook = { getCells: vi.fn(() => []) };
		(findNotebookContainingCell as Mock).mockReturnValue(notebook);
		await triggerNotebookCellSlugAction.handler(cellUri);
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Could not find the notebook cell.');
	});

	it('shows warning when no slug found', async () => {
		const notebook = makeNotebook({});
		(findNotebookContainingCell as Mock).mockReturnValue(notebook);
		await triggerNotebookCellSlugAction.handler(cellUri);
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('This cell has no slug.');
	});

	it('does nothing when quick pick is dismissed', async () => {
		const notebook = makeNotebook({ slug: 'my-cell' });
		(findNotebookContainingCell as Mock).mockReturnValue(notebook);
		(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
		await triggerNotebookCellSlugAction.handler(cellUri);
		expect(mockEditHandler).not.toHaveBeenCalled();
		expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
	});

	it('calls editNotebookCellSlug handler when Edit Slug is selected', async () => {
		const notebook = makeNotebook({ slug: 'my-cell' });
		(findNotebookContainingCell as Mock).mockReturnValue(notebook);
		(vscode.window as any).showQuickPick = vi.fn(async () => ({ label: '$(pencil) Edit Slug', id: 'edit' }));
		await triggerNotebookCellSlugAction.handler(cellUri);
		expect(mockEditHandler).toHaveBeenCalledWith(cellUri);
		expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
	});

	it('writes workspace URI to clipboard when Copy URI is selected', async () => {
		const notebook = makeNotebook({ slug: 'my-cell' });
		(findNotebookContainingCell as Mock).mockReturnValue(notebook);
		(vscode.window as any).showQuickPick = vi.fn(async () => ({ label: '$(copy) Copy URI', id: 'copy' }));
		await triggerNotebookCellSlugAction.handler(cellUri);
		expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('workspace:///test#my-cell');
		expect(mockEditHandler).not.toHaveBeenCalled();
	});

	it('shows information message after copying', async () => {
		const notebook = makeNotebook({ slug: 'my-cell' });
		(findNotebookContainingCell as Mock).mockReturnValue(notebook);
		(vscode.window as any).showQuickPick = vi.fn(async () => ({ label: '$(copy) Copy URI', id: 'copy' }));
		await triggerNotebookCellSlugAction.handler(cellUri);
		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Copied: workspace:///test#my-cell');
	});

	it('uses slug from context when not in cell metadata', async () => {
		const notebook = makeNotebook({});
		(findNotebookContainingCell as Mock).mockReturnValue(notebook);
		mockContexts[cellUri.toString()] = { slug: 'ctx-slug' };
		(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
		await triggerNotebookCellSlugAction.handler(cellUri);
		expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({ title: 'Cell: #ctx-slug' })
		);
	});
});
