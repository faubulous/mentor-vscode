'use strict';
import * as vscode from 'vscode';
import { mentor } from './mentor';
import { Disposable } from 'vscode-languageclient';
import { TreeView } from './views/tree-view';
import { WorkspaceTree } from './views/workspace-tree';
import { DefinitionTree } from './views/definition-tree';
import { DefinitionNodeDecorationProvider } from './views/definition-node-decoration-provider';
import { ResourceNode } from './views/nodes/resource-node';
import { getIriFromNodeId } from './utilities';
import { DefinitionProvider } from './providers';
import {
	LanguageClientBase,
	SparqlLanguageClient,
	SparqlTokenProvider,
	TrigLanguageClient,
	TurtleLanguageClient,
	TurtleTokenProvider,
} from './languages';

const clients: LanguageClientBase[] = [
	new TurtleLanguageClient(),
	new TrigLanguageClient(),
	new SparqlLanguageClient()
];

const providers: Disposable[] = [
	...new TurtleTokenProvider().register(),
	...new SparqlTokenProvider().register()
];

const commands: Disposable[] = [];

const views: TreeView[] = [];

export async function activate(context: vscode.ExtensionContext) {
	registerCommands(context);

	// Register the tree views.
	views.push(new WorkspaceTree());
	views.push(new DefinitionTree());

	// Start the language clients..
	for (const client of clients) {
		client.start(context);
	}

	providers.push(vscode.window.registerFileDecorationProvider(new DefinitionNodeDecorationProvider()));

	mentor.initialize(context);
}

export function deactivate(): Thenable<void> {
	return new Promise(async () => {
		for (const client of clients) {
			await client.dispose();
		}

		for (const provider of providers) {
			provider.dispose();
		}

		for (const command of commands) {
			command.dispose();
		}

		for (const view of views) {
			view.treeView.dispose();
		}
	});
}

function getUriFromArgument(arg: ResourceNode | string): string {
	if (arg instanceof ResourceNode) {
		return getIriFromNodeId(arg.id);
	} else if (typeof arg === 'string') {
		return getIriFromNodeId(arg);
	} else {
		throw new Error('Invalid argument type: ' + typeof arg);
	}
}

function registerCommands(context: vscode.ExtensionContext) {
	// Open the settings view via command
	commands.push(vscode.commands.registerCommand("mentor.action.openSettings", () => {
		vscode.commands.executeCommand('workbench.action.openSettings', '@ext:faubulous.mentor');
	}));

	commands.push(vscode.commands.registerCommand('mentor.action.openInBrowser', (arg: ResourceNode | string) => {
		const internalBrowser = mentor.configuration.get('internalBrowserEnabled');
		const uri = getUriFromArgument(arg);

		if (internalBrowser === true) {
			vscode.commands.executeCommand('simpleBrowser.show', uri);
		} else {
			vscode.env.openExternal(vscode.Uri.parse(uri, true));
		}
	}));

	commands.push(vscode.commands.registerCommand('mentor.action.findReferences', (arg: ResourceNode | string) => {
		mentor.activateDocument().then((editor) => {
			if (mentor.activeContext && editor) {
				const uri = getUriFromArgument(arg);
				const location = new DefinitionProvider().provideDefintionForUri(mentor.activeContext, uri);

				if (location instanceof vscode.Location) {
					// We need to set the selection before executing the findReferences command.
					const start = location.range.start;
					const end = location.range.end;

					editor.selection = new vscode.Selection(start, end);

					// Note: The findReferences command operates on the active editor selection.
					vscode.commands.executeCommand('references-view.findReferences', editor.document.uri);
				}
			}
		});
	}));

	commands.push(vscode.commands.registerCommand('mentor.action.revealDefinition', (arg: ResourceNode | string, restoreFocus: boolean = false) => {
		mentor.activateDocument().then((editor) => {
			const uri = getUriFromArgument(arg);

			if (!uri) {
				// If no id is provided, we fail gracefully.
				return;
			}

			if (mentor.activeContext && editor && uri) {
				const location = new DefinitionProvider().provideDefintionForUri(mentor.activeContext, uri, true);

				if (location instanceof vscode.Location) {
					editor.selection = new vscode.Selection(location.range.start, location.range.end);
					editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);

					if (restoreFocus) {
						// Reset the focus to the definition tree.
						vscode.commands.executeCommand('mentor.view.definitionTree.focus');
					}
				} else {
					vscode.window.showErrorMessage('No definition found for: ' + uri);
				}
			}
		});
	}));

	commands.push(vscode.commands.registerCommand('mentor.action.revealShapeDefinition', (arg: ResourceNode | string, restoreFocus: boolean = false) => {
		mentor.activateDocument().then((editor) => {
			const uri = getUriFromArgument(arg);

			if (!uri) {
				// If no id is provided, we fail gracefully.
				return;
			}

			if (mentor.activeContext && editor && uri) {
				const shapeUri = mentor.vocabulary.getShapes(mentor.activeContext.graphs, uri, { includeBlankNodes: true })[0];

				if (!shapeUri) {
					return;
				}

				const location = new DefinitionProvider().provideDefintionForUri(mentor.activeContext, shapeUri, true);

				if (location instanceof vscode.Location) {
					editor.selection = new vscode.Selection(location.range.start, location.range.end);
					editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);

					if (restoreFocus) {
						// Reset the focus to the definition tree.
						vscode.commands.executeCommand('mentor.view.definitionTree.focus');
					}
				} else {
					vscode.window.showErrorMessage('No definition found for: ' + uri);
				}
			}
		});
	}));

	commands.push(vscode.commands.registerCommand('mentor.action.analyzeWorkspace', async () => {
		// Force re-indexing of the workspace, including oversized files.
		mentor.workspaceIndexer.indexWorkspace(true);
	}));

	vscode.commands.registerCommand('mentor.action.implementPrefixes', async (documentUri: vscode.Uri, prefixes: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const edit = await mentor.prefixDeclarationService.implementPrefixes(document, prefixes.map(p => ({ prefix: p, namespaceIri: undefined })));

			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	});

	vscode.commands.registerCommand('mentor.action.deletePrefixes', async (documentUri: vscode.Uri, prefixes: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const edit = await mentor.prefixDeclarationService.deletePrefixes(document, prefixes);

			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	});

	vscode.commands.registerCommand('mentor.action.implementPrefixForIri', async (documentUri: vscode.Uri, namespaceIri: string) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const edit = await mentor.prefixDeclarationService.implementPrefixForIri(document, namespaceIri);

			if (edit.size > 0) {
				vscode.workspace.applyEdit(edit);
			}
		}
	});
}