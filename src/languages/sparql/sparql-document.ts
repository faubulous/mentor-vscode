import * as vscode from 'vscode';
import { RdfSyntax, SparqlLexer } from '@faubulous/mentor-rdf-parsers';
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

	public override async parse(data: string): Promise<void> {
		// Parse the tokens *before* parsing the graph because the graph 
		// parsing might fail but we need to update the tokens.
		const lexResult = new SparqlLexer().tokenize(data);

		this.setTokens(lexResult.tokens);
	}
}