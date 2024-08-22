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

		// Make definitions using blank nodes resolvable.
		this.mapBlankNodes();
	}

	protected mapBlankNodes() {
		const blankNodes = new Set<string>();

		for (let q of mentor.store.match(this.graphs, null, null, null, false)) {
			if (q.subject.termType === 'BlankNode') {
				if(!blankNodes.has(q.subject.value))
					console.log(q.subject.value +  " " + q.predicate.value + " " + q.object.value);

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

					console.log(s, t.image);

					this.blankNodes[s] = t;
					this.typeDefinitions[s] = [t];

					continue;
				}
				case '(': {
					tokenStack.push(t);

					let s = blankIds[n];

					console.log(s, t.image);

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

				console.log(s, t.image);

				this.blankNodes[s] = t;
				this.typeDefinitions[s] = [t];
			}
		}

		if (n != blankIds.length) {
			console.debug('Not all blank node tokens could be mapped to blank ids from the document graph.');
		}
	}
}