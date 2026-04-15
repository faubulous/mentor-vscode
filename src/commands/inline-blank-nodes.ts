import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { TurtleParser, TurtleReader } from '@faubulous/mentor-rdf-parsers';
import { QuadContextSerializer, TurtleSerializer } from '@faubulous/mentor-rdf-serializers';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { TurtleDocument } from '@src/languages';

export const inlineBlankNodes = {
	id: 'mentor.command.inlineBlankNodes',
	handler: async (documentUri?: vscode.Uri) => {
		documentUri = documentUri ?? vscode.window.activeTextEditor?.document.uri;

		if (!documentUri) {
			vscode.window.showErrorMessage('Invalid document URI.');
			return;
		}

		const targetUri = WorkspaceUri.toCanonicalString(documentUri);

		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const context = contextService.contexts[targetUri] as TurtleDocument | undefined;

		if (!context) {
			vscode.window.showErrorMessage('The document context could not be retrieved.');
			return;
		}

		if (!(context instanceof TurtleDocument)) {
			vscode.window.showErrorMessage('Unsupported language for inlining blank nodes.');
			return;
		}

		const document = context.getTextDocument();

		if (!document) {
			vscode.window.showErrorMessage('The document could not be retrieved from the context.');
			return;
		}

		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		const hasErrors = diagnostics.some((d) => d.severity === vscode.DiagnosticSeverity.Error);

		if (hasErrors) {
			await vscode.window.showErrorMessage('This document has syntax errors and cannot be refactored.');
			return;
		}

		try {
			const cst = new TurtleParser().parse(context.tokens);

			const reader = new TurtleReader();
			const quadContexts = reader.readQuadContexts(cst, context.tokens);

			const serializer = new TurtleSerializer();
			const output = serializer.serialize(quadContexts, {
				prefixes: context.namespaces,
				baseIri: context.baseIri,
				inlineSingleUseBlankNodes: true,
			});

			const fullRange = new vscode.Range(
				document.positionAt(0),
				document.positionAt(document.getText().length)
			);

			const edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, fullRange, output);

			await vscode.workspace.applyEdit(edit);
		} catch (error) {
			vscode.window.showErrorMessage(`Error inlining blank nodes: ${error}`);
		}
	}
};
