import * as vscode from 'vscode';
import { DocumentContext } from '../document-context';
import { CodeActionsProvider } from "../providers";

/**
 * A provider for SPARQL code actions.
 */
export class SparqlActionsProvider extends CodeActionsProvider {
	constructor() {
		super();
	}

	providePrefixDefinitionAction(context: DocumentContext, prefix: string): vscode.CodeAction {
		const action = new vscode.CodeAction('Implement missing prefix: ' + prefix, vscode.CodeActionKind.QuickFix);
		action.isPreferred = true;
		action.command = {
			title: 'Implement missing prefix',
			command: 'mentor.action.fixMissingPrefix.sparql',
			arguments: [context.uri, prefix]
		};

		return action;
	}
}