import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';

export class TurtleDocument extends DocumentContext {
	readonly syntax: RdfSyntax;

	private _inferenceExecuted = false;

	constructor(uri: vscode.Uri, syntax: RdfSyntax) {
		super(uri);

		this.syntax = syntax;
	}

	public override async infer(): Promise<void> {
		const reasoner = mentor.store.reasoner;

		if (!reasoner) {
			return;
		}

		if (!this._inferenceExecuted) {
			this._inferenceExecuted = true;

			await mentor.store.executeInference(this.uri.toString());
		}
	}

	public override async load(uri: vscode.Uri, data: string, executeInference: boolean): Promise<void> {
		// Parse the tokens *before* parsing the graph because the graph parsing 
		// might fail but we need to update the tokens.
		await this.parseTokens(data);

		try {
			await this.parseGraph(uri, data, executeInference);
		} catch (e) {
			// This is not a critical error because the graph might be invalid.
		}
	}

	protected async parseData(data: string): Promise<TokenizerResult> {
		return await Tokenizer.parseData(data, this.syntax);
	}

	protected async parseGraph(uri: vscode.Uri, data: string, executeInference: boolean): Promise<void> {
		const u = uri.toString();

		// Initilaize the graphs *before* trying to load the document so 
		// that they are initialized even when loading the document fails.
		this.graphs.length = 0;
		this.graphs.push(u);

		// The loadFromStream function only updates the existing graphs 
		// when the document was parsed successfully.
		await mentor.store.loadFromStream(data, u, executeInference);

		// Flag the document as inferred if the inference was enabled.
		this._inferenceExecuted = executeInference;
	}
}