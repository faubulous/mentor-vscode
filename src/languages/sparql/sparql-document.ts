import * as vscode from 'vscode';
import { SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { DocumentContext, TokenTypes } from '@/document-context';
import { DefinitionProvider } from '@/languages/definition-provider';
import { TurtleDefinitionProvider } from '@/languages/turtle/providers';

/**
 * A document context for SPARQL documents.
 */
export class SparqlDocument extends DocumentContext {
	private readonly _definitionProvider: DefinitionProvider = new TurtleDefinitionProvider();

	public override getDefinitionProvider(): DefinitionProvider {
		return this._definitionProvider;
	}

	public override async infer(): Promise<void> {
		// Inference is not supported for SPARQL documents.
	}

	public override async parse(uri: vscode.Uri, data: string): Promise<void> {
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