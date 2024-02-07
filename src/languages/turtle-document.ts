import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { DocumentContext } from './document-context';

export class TurtleDocument extends DocumentContext {
	public async load(document: vscode.TextDocument): Promise<void> {
		// Parse the tokens *before* parsing the graph because the graph parsing 
		// might fail but we need to update the tokens.
		await this.parseTokens(document);

		try {
			await this.parseGraph(document);
		}
		catch (e) {
			console.error(e);
		}
	}

	protected async parseData(document: vscode.TextDocument): Promise<TokenizerResult> {
		return await Tokenizer.parseData(document.getText(), RdfSyntax.Turtle);
	}

	protected async parseGraph(document: vscode.TextDocument): Promise<void> {
		const uri = document.uri.toString();

		// Initilaize the graphs *before* trying to load the document so 
		// that they are initialized even when loading the document fails.
		this.graphs.length = 0;
		this.graphs.push(...mentor.store.getContextGraphs(uri, true));

		// The loadFromStream function only updates the existing graphs 
		// when the document was parsed successfully.
		await mentor.store.loadFromStream(document.getText(), uri);
	}
}