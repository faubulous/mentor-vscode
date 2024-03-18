import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { PrefixLookupService } from '../services/prefix-lookup-service';
import { FeatureProvider } from './feature-provider';
import { DocumentContext } from '../document-context';

export abstract class CodeActionsProvider extends FeatureProvider implements vscode.CodeActionProvider {
	protected readonly prefixLookupService = new PrefixLookupService();

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	constructor() {
		super();
	}

	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range, actionContext: vscode.CodeActionContext): Promise<vscode.CodeAction[]> {
		const context = this.getDocumentContext(document);

		if (!context) {
			return [];
		}

		// Wait until the workspace has been indexed to have access to all prefix definitions.
		await mentor.indexer.waitForIndexed();

		const prefixes = actionContext.diagnostics
			.filter(diagnostics => diagnostics.code === 'NoNamespacePrefixError')
			.map(diagnostics => document.getText(diagnostics.range).split(':')[0])
			.filter(prefix => prefix);

		return prefixes.map(prefix => this.providePrefixDefinitionAction(context, prefix));
	}

	/**
	 * Get a code action for defining a missing prefix.
	 * @param context An RDF document context.
	 * @param prefix The prefix to define.
	 */
	abstract providePrefixDefinitionAction(context: DocumentContext, prefix: string): vscode.CodeAction;
}