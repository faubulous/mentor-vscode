import * as vscode from 'vscode';
import { DocumentContext } from '../document-context';
import { CodeActionsProvider } from "../providers";

/**
 * A provider for Turtle code actions.
 */
export class TurtleActionsProvider extends CodeActionsProvider {
	constructor() {
		super();
	}

	providePrefixDefinitionAction(context: DocumentContext, prefix: string): vscode.CodeAction {
		const action = new vscode.CodeAction('Implement missing prefix: ' + prefix, vscode.CodeActionKind.QuickFix);
		action.isPreferred = true;
		action.command = {
			title: 'Implement missing prefix',
			command: 'mentor.action.fixMissingPrefix.turtle',
			arguments: [context.uri, prefix]
		};

		return action;
	}
}