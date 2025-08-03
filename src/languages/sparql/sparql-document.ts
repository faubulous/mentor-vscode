import * as vscode from 'vscode';
import { RdfSyntax, SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { TokenTypes } from '@/document-context';
import { TurtleDocument } from '@/languages/turtle/turtle-document';

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
		// Parse the tokens *before* parsing the graph because the graph parsing 
		// might fail but we need to update the tokens.
		const tokens = new SparqlSyntaxParser().tokenize(data);

		this.setTokens(tokens);
	}

	public override getTokenTypes(): TokenTypes {
		return {
			BASE: 'BASE',
			PREFIX: 'PREFIX',
			IRIREF: 'IRIREF',
			PNAME_NS: 'PNAME_NS',
		}
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