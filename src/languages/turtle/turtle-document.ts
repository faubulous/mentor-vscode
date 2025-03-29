import * as vscode from 'vscode';
import { IToken } from 'millan';
import { _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, rdf } from '@faubulous/mentor-rdf';
import { RdfSyntax, TrigSyntaxParser, TurtleSyntaxParser } from '@faubulous/mentor-rdf';
import { mentor } from '@/mentor';
import { DocumentContext, TokenTypes } from '@/document-context';
import { DefinitionProvider } from '@/languages/definition-provider';
import { TurtleDefinitionProvider } from '@/languages/turtle/providers';
import {
	getIriFromToken,
	getIriFromIriReference,
	getIriFromPrefixedName,
	getNamespaceDefinition,
	getNamespaceIri
} from '@/utilities';
import { TurtlePrefixDefinitionService } from '@/services';

/**
 * A document context for Turtle and TriG documents.
 */
export class TurtleDocument extends DocumentContext {
	readonly syntax: RdfSyntax;

	private _inferenceExecuted = false;

	private _tokens: IToken[] = [];

	private readonly _definitionProvider: DefinitionProvider = new TurtleDefinitionProvider();

	constructor(uri: vscode.Uri, syntax: RdfSyntax) {
		super(uri);

		this.syntax = syntax;
	}

	get isLoaded(): boolean {
		return this._tokens.length > 0 && this.graphs.length > 0;
	}

	/**
	 * All tokens in the document.
	 */
	get tokens(): IToken[] {
		return this._tokens;
	}

	public override getDefinitionProvider(): DefinitionProvider {
		return this._definitionProvider;
	}

	public override async infer(): Promise<void> {
		const reasoner = mentor.store.reasoner;

		if (reasoner && !this._inferenceExecuted) {
			this._inferenceExecuted = true;

			mentor.store.executeInference(this.uri.toString());
		}
	}

	public override async parse(uri: vscode.Uri, data: string): Promise<void> {
		// Parse the tokens *before* parsing the graph because the graph parsing 
		// might fail but we need to update the tokens.
		let tokens;

		if (this.syntax === RdfSyntax.TriG) {
			tokens = new TrigSyntaxParser().tokenize(data);
		} else {
			tokens = new TurtleSyntaxParser().tokenize(data)
		}

		this.setTokens(tokens);

		try {
			const u = uri.toString();

			// Initialize the graphs *before* trying to load the document so 
			// that they are initialized even when loading the document fails.
			this.graphs.length = 0;
			this.graphs.push(u);

			// The loadFromStream function only updates the existing graphs 
			// when the document was parsed successfully.
			await mentor.store.loadFromTurtleStream(data, u, false);

			// Make definitions using blank nodes resolvable.
			this.mapBlankNodes();
		} catch (e) {
			// This is not a critical error because the graph might be invalid.
		}
	}

	public override getTokenTypes(): TokenTypes {
		return {
			PREFIX: 'TTL_PREFIX',
			BASE: 'TTL_BASE',
			IRIREF: 'IRIREF',
			PNAME_NS: 'PNAME_NS',
		}
	}

	override async onDidChangeDocument(e: vscode.TextDocumentChangeEvent): Promise<void> {
		// Automatically declare prefixes when a colon is typed.
		const change = e.contentChanges[0];

		if (change?.text.endsWith(':') && mentor.configuration.get('prefixes.autoDefinePrefixes')) {
			// Determine the token type at the change position.
			const token = this.getTokensAtPosition(change.range.start)[0];

			// Do not auto-implement prefixes when manually typing a prefix.
			const n = this.tokens.findIndex(t => t === token);
			const t = this.tokens[n - 1]?.image.toLowerCase();

			// Note: we check the token image instead of the type name to also account for Turtle style prefix
			// definitions in SPARQL queries. These are not supported by SPARQL and detected as language tags.
			// Although this kind of prefix declaration is not valid in SPARQL, implementing the prefix should be avoided.
			if (t === 'prefix' || t === '@prefix') return;

			if (token && token.image && token.tokenType?.tokenName === 'PNAME_NS') {
				const prefix = token.image.substring(0, token.image.length - 1);

				// Do not implmenet prefixes that are already defined.
				if (this.namespaces[prefix]) return;

				const service = new TurtlePrefixDefinitionService();
				const edit = await service.implementPrefixes(e.document, [{ prefix: prefix, namespaceIri: undefined }]);

				if (edit.size > 0) {
					vscode.workspace.applyEdit(edit);
				}
			}
		}
	}

	/**
	 * Get the first token of a given type.
	 * @param tokens A list of tokens.
	 * @param type The type name of the token.
	 * @returns The last token of the given type, if it exists, undefined otherwise.
	 */
	getFirstTokenOfType(type: string): IToken | undefined {
		const n = this.tokens.findIndex(t => t.tokenType?.tokenName === type);

		if (n > -1) {
			return this.tokens[n];
		}
	}

	/**
	 * Get the last token of a given type.
	 * @param tokens A list of tokens.
	 * @param type The type name of the token.
	 * @returns The last token of the given type, if it exists, undefined otherwise.
	 */
	getLastTokenOfType(type: string): IToken | undefined {
		const result = this.tokens.filter(t => t.tokenType?.tokenName === type);

		if (result.length > 0) {
			return result[result.length - 1];
		}
	}

	/**
	 * Gets all tokens at a given position.
	 * @param tokens A list of tokens.
	 * @param position A position in the document.
	 * @returns An non-empty array of tokens on success, an empty array otherwise.
	 */
	getTokensAtPosition(position: vscode.Position): IToken[] {
		// The tokens are 0-based, but the position is 1-based.
		const l = position.line + 1;
		const n = position.character + 1;

		return this.tokens.filter(t =>
			t.startLine &&
			t.startLine <= l &&
			t.endLine &&
			t.endLine >= l &&
			t.startColumn &&
			t.startColumn <= n &&
			t.endColumn &&
			t.endColumn >= (n - 1)
		);
	}

	/**
	 * Set the tokens of the document and update the namespaces, references, type assertions and type definitions.
	 * @param tokens An array of tokens.
	 */
	setTokens(tokens: IToken[]): void {
		this.namespaces = {};
		this.namespaceDefinitions = {};
		this.references = {};
		this.typeAssertions = {};
		this.typeDefinitions = {};
		this.blankNodes = {};

		this._tokens = tokens;

		tokens.forEach((t: IToken, i: number) => {
			switch (t.tokenType?.tokenName) {
				case 'PREFIX':
				case 'TTL_PREFIX': {
					const ns = getNamespaceDefinition(this.tokens, t);

					// Only set the namespace if it is preceeded by a prefix keyword.
					if (ns) {
						this.namespaces[ns.prefix] = ns.uri;
						this.namespaceDefinitions[ns.uri] = t;
					}
					break;
				}
				case 'PNAME_LN': {
					const uri = getIriFromPrefixedName(this.namespaces, t.image);

					if (!uri) break;

					this._handleTypeAssertion(tokens, t, uri, i);
					this._handleTypeDefinition(tokens, t, uri, i);
					this._handleUriReference(tokens, t, uri);
					break;
				}
				case 'IRIREF': {
					const uri = getIriFromIriReference(t.image);

					this._handleTypeAssertion(tokens, t, uri, i);
					this._handleTypeDefinition(tokens, t, uri, i);
					this._handleUriReference(tokens, t, uri);
					break;
				}
				case 'A': {
					this._handleTypeAssertion(tokens, t, rdf.type.id, i);
					this._handleTypeDefinition(tokens, t, rdf.type.id, i);
					break;
				}
			}
		});
	}

	private _handleUriReference(tokens: IToken[], token: IToken, uri: string) {
		if (!this.references[uri]) {
			this.references[uri] = [];
		}

		this.references[uri].push(token);
	}

	private _handleTypeAssertion(tokens: IToken[], token: IToken, uri: string, index: number) {
		if (uri != rdf.type.id) return;

		const subjectToken = tokens[index - 1];

		if (!subjectToken) return;

		const subjectUri = getIriFromToken(this.namespaces, subjectToken);

		if (!subjectUri) return;

		this.typeAssertions[subjectUri] = [subjectToken];
	}

	private _handleTypeDefinition(tokens: IToken[], token: IToken, uri: string, index: number) {
		if (uri != rdf.type.id) return;

		const subjectToken = tokens[index - 1];

		if (!subjectToken) return;

		const subjectUri = getIriFromToken(this.namespaces, subjectToken);

		if (!subjectUri) return;

		const objectToken = tokens[index + 1];

		if (!objectToken) return;

		const objectUri = getIriFromToken(this.namespaces, objectToken);

		if (!objectUri) return;

		const namespaceUri = getNamespaceIri(objectUri);

		// TODO: Make this more explicit to reduce false positives.
		switch (namespaceUri) {
			case _RDF:
			case _RDFS:
			case _OWL:
			case _SKOS:
			case _SKOS_XL:
			case _SH:
				this.typeDefinitions[subjectUri] = [subjectToken];
		}
	}

	public override getPrefixDefinition(prefix: string, uri: string, upperCase: boolean): string {
		// Note: All prefixes keywords are always in lowercase in Turtle.
		return `@prefix ${prefix}: <${uri}> .`;
	}

	override mapBlankNodes() {
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