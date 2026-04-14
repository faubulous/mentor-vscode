import * as vscode from 'vscode';
import { Position } from 'vscode-languageserver-types';
import { Quad_Subject, Quad_Object, Quad_Predicate } from '@rdfjs/types';
import { Store, Uri, _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, RDF } from '@faubulous/mentor-rdf';
import { IToken, RdfSyntax, TurtleReader, TurtleParser, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { DocumentContext } from '@src/services/document/document-context';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import {
	countLeadingWhitespace,
	countTrailingWhitespace,
	getIriFromIriReference,
	getIriFromPrefixedName,
	getIriFromToken,
	getNamespaceDefinition,
	getTokenPosition
} from '@src/utilities';

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
	 * Indicates whether tokens have been set for this document.
	 */
	get hasTokens(): boolean {
		return this._tokens.length > 0;
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
			case RdfToken.STRING_LITERAL_SINGLE_QUOTE.name:
			case RdfToken.STRING_LITERAL_QUOTE.name: {
				return token.image.slice(1, -1);
			}
			case RdfToken.STRING_LITERAL_LONG_QUOTE.name:
			case RdfToken.STRING_LITERAL_LONG_SINGLE_QUOTE.name: {
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
			case RdfToken.PNAME_NS.name:
			case RdfToken.PNAME_LN.name: {
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
		const store = container.resolve<Store>(ServiceToken.Store);
		const reasoner = store.reasoner;

		if (reasoner && !this._inferenceExecuted) {
			this._inferenceExecuted = true;

			store.executeInference(WorkspaceUri.toCanonicalString(this.graphIri));
		}
	}

	/**
	 * Loads triples into the triple store using existing tokens.
	 * This method assumes tokens have already been set via setTokens().
	 * @param data The file content (not used, parsing uses existing tokens).
	 */
	public override async loadTriples(data: string): Promise<void> {
		try {
			const store = container.resolve<Store>(ServiceToken.Store);
			// Initialize the graphs *before* trying to load the document so 
			// that they are initialized even when loading the document fails.
			const graphUri = WorkspaceUri.toCanonicalString(this.graphIri);
			const g = store.dataFactory.namedNode(graphUri);

			this.graphs.length = 0;
			this.graphs.push(graphUri);

			// Only updates the existing graphs if the document was parsed successfully.
			// Uses existing tokens that were set by the language server.
			const cst = new TurtleParser().parse(this._tokens);

			for (const q of new TurtleReader().visit(cst)) {
				const s = q.subject as Quad_Subject;
				const p = q.predicate as Quad_Predicate;
				const o = q.object as Quad_Object;

				const quad = store.dataFactory.quad(s, p, o, g);

				store.add(quad);
			}
		} catch (e) {
			// This is not a critical error because the graph might be invalid.
		}
	}

	override async onDidChangeDocument(e: vscode.TextDocumentChangeEvent): Promise<void> {
		// Auto-prefix definition is handled by TurtleAutoDefinePrefixProvider
		// which waits for fresh tokens from the language server before processing.
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
	 * @note The registration is executed on a token level so that document types are supported that do not produce triples.
	 */
	setTokens(tokens: IToken[]): void {
		this.namespaces = {};
		this.namespaceDefinitions = {};
		this.subjects = {};
		this.references = {};
		this.typeAssertions = {};
		this.typeDefinitions = {};

		this._tokens = tokens;

		let previousToken: IToken | undefined;

		tokens.forEach((t: IToken, i: number) => {
			switch (t.tokenType.name) {
				case RdfToken.PREFIX.name:
				case RdfToken.TTL_PREFIX.name: {
					const ns = getNamespaceDefinition(this.tokens, t);

					// Only set the namespace if it is preceeded by a prefix keyword.
					if (ns) {
						const r = this.getRangeFromToken(t);

						this.namespaces[ns.prefix] = ns.uri;
						this.namespaceDefinitions[ns.uri] = [r];
					}
					break;
				}
				case RdfToken.PNAME_NS.name:
				case RdfToken.PNAME_LN.name: {
					// Skip processing prefixes and iris in prefix definitions..
					switch (previousToken?.tokenType.name) {
						case RdfToken.PREFIX.name:
						case RdfToken.TTL_PREFIX.name:
						case RdfToken.PNAME_NS.name:
							break;
					}

					let iri = getIriFromPrefixedName(this.namespaces, t.image);

					if (!iri) break;

					// Remove any trailing slahes or hashes so that the IRIs are comparable
					// with the vscode.Uri.toString() output.
					iri = Uri.getNormalizedUri(iri);

					if (previousToken) {
						this._registerSubject(t, iri, previousToken);
					}

					this._handleTypeAssertion(tokens, t, iri, i);
					this._handleTypeDefinition(tokens, t, iri, i);
					this._handleResourceReference(tokens, t, iri);
					break;
				}
				case RdfToken.IRIREF.name: {
					const iri = getIriFromIriReference(t.image);

					if (t.startColumn === 1 && previousToken) {
						this._registerSubject(t, iri, previousToken);
					}

					this._handleTypeAssertion(tokens, t, iri, i);
					this._handleTypeDefinition(tokens, t, iri, i);
					this._handleResourceReference(tokens, t, iri);
					break;
				}
				case RdfToken.A.name: {
					this._handleTypeAssertion(tokens, t, RDF.type, i);
					this._handleTypeDefinition(tokens, t, RDF.type, i);
					break;
				}
				case RdfToken.LBRACKET.name: {
					// Store the position of anonymous blank nodes so they can be revealed in the editor.
					const id = t.payload?.blankNodeId;

					if (!id) break;

					this._handleResourceReference(tokens, t, id);
					break;
				}
				case RdfToken.BLANK_NODE_LABEL.name: {
					const id = t.image;

					if (t.startColumn === 1 && previousToken) {
						this._registerSubject(t, id, previousToken);
					}

					this._handleResourceReference(tokens, t, id);
					break;
				}
			}

			if (t.tokenType.name !== RdfToken.COMMENT.name) {
				// Skip comments for previous token tracking to avoid skipping important 
				// registrations when comments are present between tokens.
				previousToken = t;
			}
		});
	}

	private _registerSubject(token: IToken, iriOrBlankId: string, previousToken: IToken) {
		const previousType = previousToken.tokenType.name;

		if (previousType === RdfToken.PERIOD.name) {
			const range = this.getRangeFromToken(token);

			if (!this.subjects[iriOrBlankId]) {
				this.subjects[iriOrBlankId] = [];
			}

			this.subjects[iriOrBlankId].push(range);
		}
	}

	private _handleResourceReference(tokens: IToken[], token: IToken, iriOrBlankId: string) {
		if (!this.references[iriOrBlankId]) {
			this.references[iriOrBlankId] = [];
		}

		const range = this.getRangeFromToken(token);

		this.references[iriOrBlankId].push(range);
	}

	private _handleTypeAssertion(tokens: IToken[], token: IToken, uri: string, index: number) {
		if (uri === RDF.type) {
			const subjectToken = tokens[index - 1];

			if (!subjectToken) return;

			const subjectUri = getIriFromToken(this.namespaces, subjectToken);

			if (!subjectUri) return;

			const range = this.getRangeFromToken(subjectToken);

			this.typeAssertions[subjectUri] = [range];
		}
	}

	private _handleTypeDefinition(tokens: IToken[], token: IToken, uri: string, index: number) {
		if (uri == RDF.type) {
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