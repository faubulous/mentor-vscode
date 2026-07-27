import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { RdfSyntax, TurtleReader } from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';
import { QuadContextSerializer, TurtleSerializer, QuadSortingStrategy } from '@faubulous/mentor-rdf-serializers';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';

function isShaclDiagnostic(diagnostic: vscode.Diagnostic): boolean {
	return typeof diagnostic.source === 'string'
		&& diagnostic.source.toLowerCase().includes('shacl');
}

/**
 * Sorts the active RDF document according to a given sorting strategy using the StatementSerializer.
 * Re-lexes and re-parses the document to extract QuadContexts (with comments), then
 * serializes using the provided sorting strategy.
 * @param documentUri Optional URI of the document to sort; defaults to the active editor's document.
 * @param strategy The sorting strategy to apply.
 */
export async function sortDocument(documentUri: vscode.Uri | undefined, strategy: QuadSortingStrategy): Promise<void> {
	const targetUri = documentUri ?? vscode.window.activeTextEditor?.document.uri;

	if (!targetUri) {
		vscode.window.showErrorMessage('No document selected.');
		return;
	}

	const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === targetUri.toString())
		?? await vscode.workspace.openTextDocument(targetUri);

	const diagnostics = vscode.languages.getDiagnostics(document.uri);
	const hasErrors = diagnostics.some((d) => d.severity === vscode.DiagnosticSeverity.Error && !isShaclDiagnostic(d));

	if (hasErrors) {
		await vscode.window.showErrorMessage('This document has syntax errors and cannot be sorted.');
		return;
	}

	const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	const context = contextService.contexts[document.uri.toString()];

	if (!context) {
		vscode.window.showErrorMessage('The document context could not be retrieved.');
		return;
	}

	try {
		const text = document.getText();

		// Re-lex the document to obtain a full token array including comments.
		// The shared lexer may carry another caller's blank node ID generator —
		// restore the default before tokenizing.
		const lexer = ParserFactory.getLexer(RdfSyntax.Turtle);
		lexer.blankNodeIdGenerator = undefined;

		const lexResult = lexer.tokenize(text);
		const tokens = lexResult.tokens;

		// Parse tokens into a CST.
		const cst = ParserFactory.getParser(RdfSyntax.Turtle).parse(tokens);

		// Extract QuadContexts with associated comments.
		const reader = new TurtleReader();
		const quadContexts = reader.readQuadContexts(cst, lexResult.tokens);

		// Serialize using the QuadContextSerializer with the chosen sorting strategy.
		const serializer = new QuadContextSerializer(new TurtleSerializer());
		const output = serializer.serialize(quadContexts, {
			prefixes: context.namespaces,
			baseIri: context.baseIri,
			sortingStrategy: strategy,
			inlineSingleUseBlankNodes: true
		});

		// Replace the entire document content with the sorted output.
		const fullRange = new vscode.Range(
			document.positionAt(0),
			document.positionAt(text.length)
		);

		const edit = new vscode.WorkspaceEdit();
		edit.replace(document.uri, fullRange, output);
		
		await vscode.workspace.applyEdit(edit);
	} catch (error) {
		vscode.window.showErrorMessage(`Error sorting document: ${error}`);
	}
}
