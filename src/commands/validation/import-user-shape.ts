import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { SettingsFileStore } from '@src/services/core';
import { UserUri } from '@src/providers/user-uri';
import { USER_SHAPES_FOLDER } from '@src/services/validation/shape-graph-service';
import { isWorkspaceShapeUri } from '@src/services/validation/shacl-validation-configuration';
import { getShapeGraphCandidates } from '@src/utilities';
import { validateUserShapeFileName, withDefaultShapeExtension } from './create-user-shape';

/**
 * The serialization used per target file extension.
 */
function formatForExtension(fileName: string): string {
	if (fileName.endsWith('.nq')) {
		return 'application/n-quads';
	}

	if (fileName.endsWith('.nt')) {
		return 'application/n-triples';
	}

	return 'text/turtle';
}

/**
 * Imports a workspace shape file into the user shapes: the selected workspace
 * shape graph is serialized under a new `user:///shapes/<name>` graph URI and
 * stored in the user settings, making it available in every workspace. The
 * original workspace file is left untouched.
 */
export const importUserShape = {
	id: 'mentor.command.importUserShape',
	handler: async () => {
		const store = container.resolve<Store>(ServiceToken.Store);
		const files = container.resolve<SettingsFileStore>(ServiceToken.UserFileStore);

		const candidates = getShapeGraphCandidates(store).filter(isWorkspaceShapeUri);

		if (candidates.length === 0) {
			vscode.window.showInformationMessage('There are no workspace shape graphs to import.');
			return;
		}

		const source = await vscode.window.showQuickPick(candidates, {
			title: 'Import Workspace Shape File into User Shapes',
			placeHolder: 'Select the workspace shape graph to import',
		});

		if (!source) {
			return;
		}

		const input = await vscode.window.showInputBox({
			title: 'Import Workspace Shape File into User Shapes',
			prompt: 'Name of the new user shape file. The copy is stored in your user settings and available in every workspace.',
			value: source.split('/').pop() ?? 'shapes.ttl',
			validateInput: value => validateUserShapeFileName(value, files),
		});

		if (!input) {
			return;
		}

		const path = `${USER_SHAPES_FOLDER}/${withDefaultShapeExtension(input.trim())}`;
		const targetUri = UserUri.forPath(path);

		// Quad formats re-label the graph to the new user URI; triple formats carry
		// no graph label and are addressed by the settings entry alone.
		const content = await store.serializeGraph(source, formatForExtension(path), targetUri);

		await files.write(path, content);

		vscode.window.showInformationMessage(`Imported the shape graph as '${targetUri}'.`);
	}
};
