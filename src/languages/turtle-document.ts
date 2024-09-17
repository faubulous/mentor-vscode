import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { IToken } from 'millan';
import { RdfSyntax, TrigSyntaxParser } from '@faubulous/mentor-rdf';
import { TurtleSyntaxParser } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';

export class TurtleDocument extends DocumentContext {
	readonly syntax: RdfSyntax;

	private _inferenceExecuted = false;

	constructor(uri: vscode.Uri, syntax: RdfSyntax) {
		super(uri);

		this.syntax = syntax;
	}

	protected tokenize(data: string): IToken[] {
		if (this.syntax === RdfSyntax.TriG) {
			return new TrigSyntaxParser().tokenize(data);
		} else {
			return new TurtleSyntaxParser().tokenize(data)
		}
	}

	public override async infer(): Promise<void> {
		const reasoner = mentor.store.reasoner;

		if (!reasoner) {
			return;
		}

		if (!this._inferenceExecuted) {
			this._inferenceExecuted = true;

			mentor.store.executeInference(this.uri.toString());
		}
	}

	public override async load(uri: vscode.Uri, data: string, executeInference: boolean): Promise<void> {
		// Parse the tokens *before* parsing the graph because the graph parsing 
		// might fail but we need to update the tokens.
		const tokens = this.tokenize(data);

		this.setTokens(tokens);

		try {
			await this.parseGraph(uri, data, executeInference);
		} catch (e) {
			// This is not a critical error because the graph might be invalid.
		}
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

		// Make definitions using blank nodes resolvable.
		this.mapBlankNodes();
	}

	protected mapBlankNodes() {
		const blankNodes = new Set<string>();

		for (let q of mentor.store.match(this.graphs, null, null, null, false)) {
			if (q.subject.termType === 'BlankNode') {
				blankNodes.add(q.subject.value);
			}
		}

		const blankIds = Array.from(blankNodes).sort((a, b) => {
			const numA = parseInt(a.split('-')[1], 10);
			const numB = parseInt(b.split('-')[1], 10);
			return numA - numB;
		});

		let tokenStack = [];
		let n = 0;

		for (let t of this.tokens) {
			switch (t.image) {
				case '[': {
					if (tokenStack.length > 0 && tokenStack[tokenStack.length - 1].image === '(') {
						// Account for the blank node list element.
						n++;
					}

					tokenStack.push(t);

					let s = blankIds[n++];

					this.blankNodes[s] = t;
					this.typeDefinitions[s] = [t];

					continue;
				}
				case '(': {
					tokenStack.push(t);

					let s = blankIds[n];

					this.blankNodes[s] = t;
					this.typeDefinitions[s] = [t];

					continue;
				}
				case ']': {
					tokenStack.pop();
					continue;;
				}
				case ')': {
					tokenStack.pop();
					continue;;
				}
			}

			if (tokenStack.length > 0 && tokenStack[tokenStack.length - 1].image === '(') {
				let s = blankIds[n++];

				this.blankNodes[s] = t;
				this.typeDefinitions[s] = [t];
			}
		}

		// if (n != blankIds.length) {
		// 	console.debug('Not all blank node tokens could be mapped to blank ids from the document graph.');
		// }
	}
}