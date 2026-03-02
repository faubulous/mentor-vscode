import * as vscode from 'vscode';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';

/**
 * A document context for SPARQL documents.
 */
export class SparqlDocument extends TurtleDocument {
	constructor(uri: vscode.Uri) {
		super(uri, RdfSyntax.Sparql);
	}

	public override async infer(): Promise<void> {
		// Inference is not supported for SPARQL documents.
	}

	public override async loadTriples(data: string): Promise<void> {
		// SPARQL documents don't load triples into the store.
		// Tokens are already set by the language server.
	}
}