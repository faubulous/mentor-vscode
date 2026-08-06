import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentConnectionService } from '@src/languages/sparql/services';
import { resolveNotebookFromContext } from '../../utilities/vscode/notebook';

export const setNotebookInference = {
	id: 'mentor.command.setNotebookInference',
	handler: async (context?: any) => {
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
		const notebook = resolveNotebookFromContext(context);

		if (!notebook) {
			vscode.window.showWarningMessage('No notebook is currently open.');
			return;
		}

		// Show quick pick to select inference setting
		const items = [
			{ label: 'On', description: 'Include inferred triples in query results.', value: true },
			{ label: 'Off', description: 'Only return asserted triples.', value: false },
			{ label: 'Default', description: 'Use connection defaults for each cell.', value: undefined }
		];

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Set inference for all cells in this notebook'
		});

		if (selected === undefined) {
			return; // User cancelled
		}

		// Update all cells in one bulk edit; the service fires the change event
		// once per cell so URI-scoped consumers (code lenses, FROM-graph linting)
		// re-evaluate each cell against the new setting.
		await documentConnectionService.setInferenceEnabledForNotebook(notebook, selected.value);

		const statusText = selected.value === undefined
			? 'Cleared inference settings'
			: selected.value ? 'Enabled inference' : 'Disabled inference';

		vscode.window.setStatusBarMessage(`${statusText} for all ${notebook.getCells().length} cells`, 3000);
	}
};
