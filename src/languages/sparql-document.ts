import * as vscode from 'vscode';
import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { DocumentContext } from './document-context';

export class SparqlDocument extends DocumentContext {
	public async load(document: vscode.TextDocument): Promise<void> {
		await this.parseTokens(document);
	}

	protected async parseData(document: vscode.TextDocument): Promise<TokenizerResult> {
		return await Tokenizer.parseData(document.getText(), RdfSyntax.Sparql);
	}
}