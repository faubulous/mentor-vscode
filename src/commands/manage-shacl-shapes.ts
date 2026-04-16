import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { rdf, sh, Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { WorkspaceUri } from '@src/providers/workspace-uri';

interface ShapePickItem extends vscode.QuickPickItem {
	graphUri: string;
}

export const manageShaclShapes = {
	id: 'mentor.command.manageShaclShapes',
	handler: async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor || !editor.document) {
			return;
		}

		const store = container.resolve<Store>(ServiceToken.Store);
		const quickPickItems: ShapePickItem[] = [];

		for (const graphUri of store.getGraphs().sort()) {
			if (store.any(graphUri, null, rdf.type, sh.NodeShape) || store.any(graphUri, null, rdf.type, sh.PropertyShape)) {
				quickPickItems.push({
					label: graphUri.replace(/^workspace:\/\/\//, ''),
					graphUri
				});
			}
		}

		// Check the currently effective shapes for this document, if any.
		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
		const effectiveShapes = validationService.getEffectiveShapeGraphs(editor.document.uri);

		for (const item of quickPickItems) {
			if (effectiveShapes.includes(item.graphUri)) {
				item.picked = true;
			}
		}

		const selected = await vscode.window.showQuickPick(quickPickItems, {
			title: 'SHACL Configuration',
			placeHolder: quickPickItems.length === 0
				? 'No SHACL shape files in this workspace.'
				: 'Select SHACL shape files:',
			canPickMany: true,
		});

		if (selected) {
			const shacl = vscode.workspace.getConfiguration('mentor.shacl');
			const workspaceUri = WorkspaceUri.toWorkspaceUri(editor.document.uri);
			const key = workspaceUri ? WorkspaceUri.toCanonicalString(workspaceUri) : editor.document.uri.toString();

			const config = shacl.get<Record<string, string[]>>('validation', {});
			config[key] = selected.map(s => s.graphUri);

			await shacl.update('validation', config, vscode.ConfigurationTarget.Workspace);
		}
	}
};
