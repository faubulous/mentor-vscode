import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';

export class TurtleDocument extends DocumentContext {
	readonly syntax: RdfSyntax;

	constructor(document: vscode.TextDocument, syntax: RdfSyntax) {
		super(document);

		this.syntax = syntax;
	}

	public async load(document: vscode.TextDocument): Promise<void> {
		// Parse the tokens *before* parsing the graph because the graph parsing 
		// might fail but we need to update the tokens.
		await this.parseTokens(document);

		try {
			await this.parseGraph(document);
		} catch (e) {
			// This is not a critical error because the graph might be invalid.
		}
	}

	protected async parseData(document: vscode.TextDocument): Promise<TokenizerResult> {
		return await Tokenizer.parseData(document.getText(), this.syntax);
	}

	protected async parseGraph(document: vscode.TextDocument): Promise<void> {
		const uri = document.uri.toString();

		// Initilaize the graphs *before* trying to load the document so 
		// that they are initialized even when loading the document fails.
		this.graphs.length = 0;
		this.graphs.push(...mentor.store.getContextGraphs(uri, true));

		// The loadFromStream function only updates the existing graphs 
		// when the document was parsed successfully.
		const text = document.getText();

		await mentor.store.loadFromStream(text, uri);
	}
}