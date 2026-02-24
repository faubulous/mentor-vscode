import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { DataFactory, Quad_Object, Quad_Predicate } from 'n3';
import { Position } from 'vscode-languageserver-types';
import { Uri } from '@faubulous/mentor-rdf';
import { _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, rdf } from '@faubulous/mentor-rdf';
import { RdfSyntax, TurtleLexer, TurtleReader, TurtleParser, TrigLexer, TOKENS } from '@faubulous/mentor-rdf-parsers';
import { mentor } from '@src/mentor';
import { DocumentContext } from '@src/workspace/document-context';
import { TurtlePrefixDefinitionService } from '@src/services';
import {
	countLeadingWhitespace,
	countTrailingWhitespace,
	getIriFromIriReference,
	getIriFromPrefixedName,
	getIriFromToken,
	getNamespaceDefinition,
	getTokenPosition
} from '@src/utilities';
import { Quad_Subject } from '@rdfjs/types';

/**
 * A document context for Turtle and TriG documents.
 */
export class TurtleDocument extends DocumentContext {
	readonly syntax: RdfSyntax;

	private _inferenceExecuted = false;

	private _tokens: IToken[] = [];

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

	public override getIriAtPosition(position: vscode.Position): string | undefined {
		const token = this.getTokenAtPosition(position);

		if (token) {
			let iri;

			if (this.isPrefixTokenAtPosition(token, position)) {
				const prefix = token.image.split(":")[0];

				iri = this.namespaces[prefix];
			} else {
				iri = getIriFromToken(this.namespaces, token);
			}

			return iri;
		}
	}

	public override getLiteralAtPosition(position: vscode.Position): string | undefined {
		const token = this.getTokenAtPosition(position);

		if (!token || !token.tokenType) {
			return undefined;
		}

		switch (token.tokenType.name) {
			// Display the literal strings without the quotes for improved readability for long strings.
			case TOKENS.STRING_LITERAL_SINGLE_QUOTE.name:
			case TOKENS.STRING_LITERAL_QUOTE.name: {
				return token.image.slice(1, -1);
			}
			case TOKENS.STRING_LITERAL_LONG_QUOTE.name:
			case TOKENS.STRING_LITERAL_LONG_SINGLE_QUOTE.name: {
				return token.image.slice(3, -3);
			}
			default: {
				return undefined;
			}
		}
	}

	/**
	 * Indicates whether the token at the given position is a namespace prefix.
	 * @param token A token.
	 * @param position The position in the document.
	 * @returns `true` if the cursor is on the prefix of the token, `false` otherwise.
	 */
	isPrefixTokenAtPosition(token: IToken, position: vscode.Position) {
		const { start } = getTokenPosition(token);

		switch (token.tokenType.name) {
			case TOKENS.PNAME_NS.name:
			case TOKENS.PNAME_LN.name: {
				const i = token.image.indexOf(":");
				const n = position.character - start.character;

				return n <= i;
			}
			default: {
				return false;
			}
		}
	}

	public override async infer(): Promise<void> {
		const reasoner = mentor.store.reasoner;

		if (reasoner && !this._inferenceExecuted) {
			this._inferenceExecuted = true;

			mentor.store.executeInference(this.graphIri.toString());
		}
	}

	public override async parse(data: string): Promise<void> {
		try {
			// Parse the tokens *before* parsing the graph because the graph parsing 
			// might fail but we need to update the tokens.
			let lexResult;

			if (this.syntax === RdfSyntax.TriG) {
				lexResult = new TrigLexer().tokenize(data);
			} else {
				lexResult = new TurtleLexer().tokenize(data);
			}

			this.setTokens(lexResult.tokens);

			// Initialize the graphs *before* trying to load the document so 
			// that they are initialized even when loading the document fails.
			const graphUri = this.graphIri.toString();
			const g = DataFactory.namedNode(graphUri);

			this.graphs.length = 0;
			this.graphs.push(graphUri);

			// Only updates the existing graphs if the document was parsed successfully.
			const cst = new TurtleParser().parse(lexResult.tokens);

			for (const quadInfo of new TurtleReader().turtleDocInfo(cst)) {
				const s = quadInfo.subject.term as Quad_Subject;
				const p = quadInfo.predicate.term as Quad_Predicate;
				const o = quadInfo.object.term as Quad_Object;

				mentor.store.add(DataFactory.quad(s, p, o, g));
			}
		} catch (e) {
			// This is not a critical error because the graph might be invalid.
		}
	}

	override async onDidChangeDocument(e: vscode.TextDocumentChangeEvent): Promise<void> {
		// Automatically declare prefixes when a colon is typed.
		const change = e.contentChanges[0];

		// TODO: This should be handled in the prefix definition service 
		// (listen to doc changes and react) instead of the document itself.
		if (change?.text.endsWith(':') && mentor.configuration.get('prefixes.autoDefinePrefixes')) {
			// Do not auto-implement prefixes when manually typing a prefix.
			const n = this.getTokenIndexAtPosition(change.range.start);

			if (n < 1) return;

			// Determine the token type at the change position.
			const previousToken = this.tokens[n - 1]?.image.toLowerCase();

			// Note: We check the token image instead of the type name to also account 
			// for Turtle style prefix definitions in SPARQL queries. These are not supported 
			// by SPARQL and detected as language tags. Although this kind of prefix declaration 
			// is not valid in SPARQL, implementing the prefix should be avoided.
			if (previousToken === 'prefix' || previousToken === '@prefix') return;

			// Also do not implement prefixes for URI schemes..
			if (previousToken === '<') return;

			const currentToken = this.tokens[n];

			if (currentToken && currentToken.image && currentToken.tokenType.name === TOKENS.PNAME_NS.name) {
				const prefix = currentToken.image.substring(0, currentToken.image.length - 1);

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
	 * Get the location of a token in a document.
	 * @param documentUri The URI of the document.
	 * @param token A token.
	 */
	getRangeFromToken(token: IToken): vscode.Range {
		// The token positions are 1-based, whereas the editor positions / locations are 0-based.
		const startLine = token.startLine ? token.startLine - 1 : 0;
		const startCharacter = token.startColumn ? token.startColumn - 1 : 0;
		const startWhitespace = countLeadingWhitespace(token.image);

		const endLine = token.endLine ? token.endLine - 1 : 0;
		const endCharacter = token.endColumn ? token.endColumn - 1 : 0;
		const endWhitespace = countTrailingWhitespace(token.image);

		// Note: The millan parser incorrectly parses some tokens with leading and trailing whitespace.
		// We account for this by adjusting the start and end positions.
		const start = new vscode.Position(startLine, startCharacter + startWhitespace);
		const end = new vscode.Position(endLine, endCharacter - endWhitespace).translate(0, 1);

		return new vscode.Range(start, end);
	}

	/**
	 * Gets the index of the token at a given position.
	 * @param position A position in the document.
	 * @returns The index of the token at the given position, or -1 if no token is found.
	 */
	getTokenIndexAtPosition(position: Position): number {
		// The tokens are 1-based, but the position is 0-based.
		const l = position.line + 1;
		const n = position.character;

		for (let i = 0; i < this.tokens.length; i++) {
			const token = this.tokens[i];

			if (!token.startLine || !token.endLine || !token.startColumn || !token.endColumn) {
				continue;
			}

			if (token.startLine > l) {
				break;
			}

			// If the token starts and ends on the same line and column, then the position must be inside the token.
			if (token.startLine == l && token.endLine == l && token.startColumn <= n && n <= token.endColumn) {
				return i;
			}

			// If we have a multi-line token and the position is between start and end, then we have a match.
			if (token.startLine < l && token.endLine > l) {
				return i;
			}

			// If the token ends on the same line and the position is before the end column, then we have a match.
			if (token.endLine == l && token.endColumn >= n) {
				return i;
			}
		}

		return -1;
	}

	/**
	 * Gets the first token at a given position.
	 * @param position A position in the document.
	 * @returns The token at the given position, if it exists, undefined otherwise.
	 */
	getTokenAtPosition(position: Position): IToken | undefined {
		const index = this.getTokenIndexAtPosition(position);

		return index >= 0 ? this.tokens[index] : undefined;
	}

	/**
	 * Gets the token that precedes the given position.
	 * @param position A position in the document.
	 * @returns The token before the given position, if it exists, undefined otherwise.
	 */
	getTokenBeforePosition(position: Position): IToken | undefined {
		const index = this.getTokenIndexAtPosition(position);

		if (index > 0) {
			// Found token at position, return previous one
			return this.tokens[index - 1];
		} else if (index === 0) {
			// At first token, no previous token
			return undefined;
		} else {
			// No token at position (index === -1), find last token before this position
			const l = position.line + 1;
			const n = position.character;

			for (let i = this.tokens.length - 1; i >= 0; i--) {
				const token = this.tokens[i];

				if (!token.endLine || !token.endColumn) continue;

				// If token ends before the cursor position, it's the one we want
				if (token.endLine < l || (token.endLine === l && token.endColumn <= n)) {
					return token;
				}
			}
		}

		return undefined;
	}

	/**
	 * Set the tokens of the document and update the namespaces, references, type assertions and type definitions.
	 * @param tokens An array of tokens.
	 */
	setTokens(tokens: IToken[]): void {
		this.namespaces = {};
		this.namespaceDefinitions = {};
		this.subjects = {};
		this.references = {};
		this.typeAssertions = {};
		this.typeDefinitions = {};
		this.blankNodes = {};

		this._tokens = tokens;

		let previousToken: IToken | undefined;

		tokens.forEach((t: IToken, i: number) => {
			switch (t.tokenType.name) {
				case TOKENS.PREFIX.name:
				case TOKENS.TTL_PREFIX.name: {
					const ns = getNamespaceDefinition(this.tokens, t);

					// Only set the namespace if it is preceeded by a prefix keyword.
					if (ns) {
						const r = this.getRangeFromToken(t);

						this.namespaces[ns.prefix] = ns.uri;
						this.namespaceDefinitions[ns.uri] = [r];
					}
					break;
				}
				case TOKENS.PNAME_NS.name:
				case TOKENS.PNAME_LN.name: {
					// Skip processing prefixes and iris in prefix definitions..
					switch (previousToken?.tokenType.name) {
						case TOKENS.PREFIX.name:
						case TOKENS.TTL_PREFIX.name:
						case TOKENS.PNAME_NS.name:
							break;
					}

					let iri = getIriFromPrefixedName(this.namespaces, t.image);

					if (!iri) break;

					// Remove any trailing slahes or hashes so that the IRIs are comparable
					// with the vscode.Uri.toString() output.
					iri = Uri.getNormalizedUri(iri);

					if (t.startColumn === 1 && previousToken) {
						this._registerSubject(t, iri, previousToken);
					}

					this._handleTypeAssertion(tokens, t, iri, i);
					this._handleTypeDefinition(tokens, t, iri, i);
					this._handleIriReference(tokens, t, iri);
					break;
				}
				case TOKENS.IRIREF.name: {
					const iri = getIriFromIriReference(t.image);

					if (t.startColumn === 1 && previousToken) {
						this._registerSubject(t, iri, previousToken);
					}

					this._handleTypeAssertion(tokens, t, iri, i);
					this._handleTypeDefinition(tokens, t, iri, i);
					this._handleIriReference(tokens, t, iri);
					break;
				}
				case TOKENS.A.name: {
					this._handleTypeAssertion(tokens, t, rdf.type.id, i);
					this._handleTypeDefinition(tokens, t, rdf.type.id, i);
					break;
				}
			}

			previousToken = t;
		});
	}

	private _registerSubject(token: IToken, iri: string, previousToken: IToken) {
		const previousType = previousToken.tokenType.name;

		// TODO: Review. This does not look right.
		if (previousType === TOKENS.PERIOD.name || previousType === TOKENS.PERIOD.name) {
			const range = this.getRangeFromToken(token);

			if (!this.subjects[iri]) {
				this.subjects[iri] = [];
			}

			this.subjects[iri].push(range);
		}
	}

	private _handleIriReference(tokens: IToken[], token: IToken, uri: string) {
		if (!this.references[uri]) {
			this.references[uri] = [];
		}

		const range = this.getRangeFromToken(token);

		this.references[uri].push(range);
	}

	private _handleTypeAssertion(tokens: IToken[], token: IToken, uri: string, index: number) {
		if (uri === rdf.type.id) {
			const subjectToken = tokens[index - 1];

			if (!subjectToken) return;

			const subjectUri = getIriFromToken(this.namespaces, subjectToken);

			if (!subjectUri) return;

			const range = this.getRangeFromToken(subjectToken);

			this.typeAssertions[subjectUri] = [range];
		}
	}

	private _handleTypeDefinition(tokens: IToken[], token: IToken, uri: string, index: number) {
		if (uri == rdf.type.id) {
			const subjectToken = tokens[index - 1];

			if (!subjectToken) return;

			const subjectUri = getIriFromToken(this.namespaces, subjectToken);

			if (!subjectUri) return;

			const objectToken = tokens[index + 1];

			if (!objectToken) return;

			const objectUri = getIriFromToken(this.namespaces, objectToken);

			if (!objectUri) return;

			const namespaceUri = Uri.getNamespaceIri(objectUri);

			// TODO: Make this more explicit to reduce false positives.
			switch (namespaceUri) {
				case _RDF:
				case _RDFS:
				case _OWL:
				case _SKOS:
				case _SKOS_XL:
				case _SH: {
					const range = this.getRangeFromToken(subjectToken);

					this.typeDefinitions[subjectUri] = [range];
				}
			}
		}
	}
}