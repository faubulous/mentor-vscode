import * as vscode from 'vscode';
import { Quad_Subject, Quad_Object, Quad_Predicate } from '@rdfjs/types';
import { Store, Uri, _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, RDF } from '@faubulous/mentor-rdf';
import { BlankNodeIdGenerator, createFileBlankNodeIdGenerator, IToken, RdfSyntax, TurtleReader, RdfToken, tokenizeWithTriplate } from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { DocumentContext } from '@src/services/document/document-context';
import { ITokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import {
	getIriFromIriReference,
	getIriFromPrefixedName,
	getIriFromToken,
	getNamespaceDefinition,
	getTokenAtPosition,
	isPrefixTokenAtPosition
} from '@src/utilities';
import { getRangeFromToken } from '@src/utilities/vscode/tokens';

/**
 * A document context for Turtle and TriG documents.
 */
export class TurtleDocument extends DocumentContext implements ITokenizedDocumentContext {
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

	get isParsed(): boolean {
		return this._tokens.length > 0;
	}

	get providesTokens(): boolean {
		return true;
	}

	/**
	 * All tokens in the document.
	 */
	get tokens(): IToken[] {
		return this._tokens;
	}

	tokenize(text: string, blankNodeIdGenerator?: BlankNodeIdGenerator): IToken[] {
		const lexer = ParserFactory.getLexer(this.syntax);

		// The lexer instance is shared, so the generator must be set on every call —
		// `undefined` restores the default generator — to prevent a file-scoped
		// generator from leaking between documents.
		lexer.blankNodeIdGenerator = blankNodeIdGenerator;

		return tokenizeWithTriplate(lexer, text).tokens;
	}

	parse(text: string): IToken[] {
		// Use a file-scoped blank node ID generator so that blank node identities
		// are stable across reloads of the same document.
		const tokens = this.tokenize(text, createFileBlankNodeIdGenerator(this.uri.toString()));

		this.setTokens(tokens);

		return tokens;
	}

	public override getIriAtPosition(position: vscode.Position): string | undefined {
		const token = getTokenAtPosition(this.tokens, position);

		if (token) {
			let iri;

			if (isPrefixTokenAtPosition(token, position)) {
				const prefix = token.image.split(":")[0];

				iri = this.namespaces[prefix];
			} else {
				iri = getIriFromToken(this.namespaces, token);
			}

			return iri;
		}
	}

	public override getLiteralAtPosition(position: vscode.Position): string | undefined {
		const token = getTokenAtPosition(this.tokens, position);

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
			const graphUri = WorkspaceUri.toCanonicalString(this.graphIri);
			const g = store.dataFactory.namedNode(graphUri);

			// Capture old graph URIs before resetting (needed to clean up slug changes).
			const oldGraphs = [...this.graphs];

			// Initialize the graphs *before* trying to load the document so 
			// that they are initialized even when loading the document fails.
			this.graphs.length = 0;
			this.graphs.push(graphUri);

			// Delete old graphs (handles slug changes and stale triples removed from the
			// document). Done after resetting this.graphs so the invariant holds on error.
			store.deleteGraphs([...oldGraphs, graphUri]);

			// Reset inference flag so that infer() re-runs after each reload.
			// This is essential when a slug update triggers a reload: the old inference
			// graph (based on the opaque cell ID) has already been deleted above, and
			// a fresh inference pass is needed to populate the slug-based graph.
			this._inferenceExecuted = false;

			// Only updates the existing graphs if the document was parsed successfully.
			// Uses the existing tokens that were set on the context. The parser is a
			// shared instance because chevrotain parser construction is expensive.
			const cst = ParserFactory.getParser(RdfSyntax.Turtle).parse(this._tokens);

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
						const r = getRangeFromToken(t);

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
						this._registerSubject(tokens, i, t, iri, previousToken);
					}

					this._handleTypeAssertion(tokens, t, iri, i);
					this._handleTypeDefinition(tokens, t, iri, i);
					this._handleResourceReference(tokens, t, iri);
					break;
				}
				case RdfToken.IRIREF.name: {
					const iri = getIriFromIriReference(t.image);

					if (t.startColumn === 1 && previousToken) {
						this._registerSubject(tokens, i, t, iri, previousToken);
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
						this._registerSubject(tokens, i, t, id, previousToken);
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

	private _registerSubject(tokens: IToken[], tokenIndex: number, token: IToken, iriOrBlankId: string, previousToken: IToken) {
		const previousType = previousToken.tokenType.name;

		let isSubject = false;

		if (previousType === RdfToken.PERIOD.name) {
			isSubject = true;
		} else if (previousType === RdfToken.IRIREF.name) {
			// SPARQL-style PREFIX declarations end with an IRIREF (no period).
			// If the token two places back is a PNAME_NS, the IRIREF was a namespace URI,
			// meaning the current token opens the first triple after those PREFIX declarations.
			const tokenBeforePrevious = tokens[tokenIndex - 2];
			
			if (tokenBeforePrevious?.tokenType.name === RdfToken.PNAME_NS.name) {
				isSubject = true;
			}
		}

		if (isSubject) {
			const range = getRangeFromToken(token);

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

		const range = getRangeFromToken(token);

		this.references[iriOrBlankId].push(range);
	}

	private _handleTypeAssertion(tokens: IToken[], token: IToken, uri: string, index: number) {
		if (uri === RDF.type) {
			const subjectToken = tokens[index - 1];

			if (!subjectToken) return;

			const subjectUri = getIriFromToken(this.namespaces, subjectToken);

			if (!subjectUri) return;

			const range = getRangeFromToken(subjectToken);

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
					const range = getRangeFromToken(subjectToken);

					this.typeDefinitions[subjectUri] = [range];
				}
			}
		}
	}
}