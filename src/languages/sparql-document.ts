import * as vscode from 'vscode';
import { SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';

/**
 * A document context for SPARQL documents.
 */
export class SparqlDocument extends DocumentContext {
	public override async infer(): Promise<void> {
		// Inference is not supported for SPARQL documents.
	}

	public override async parse(uri: vscode.Uri, data: string): Promise<void> {
		// Parse the tokens *before* parsing the graph because the graph parsing 
		// might fail but we need to update the tokens.
		const tokens = new SparqlSyntaxParser().tokenize(data);

		this.setTokens(tokens);
	}

	public override getPrefixTokenType(): string {
		return 'PREFIX';
	}

	public override getPrefixDefinition(prefix: string, uri: string, upperCase: boolean): string {
		if (upperCase) {
			return `PREFIX ${prefix}: <${uri}>`;
		}
		else {
			return `prefix ${prefix}: <${uri}>`;
		}
	}
}