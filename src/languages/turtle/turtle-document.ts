import * as vscode from 'vscode';
import type { CstNode } from 'chevrotain';
import { Quad, Quad_Subject, Quad_Object, Quad_Predicate } from '@rdfjs/types';
import { Store, Uri, VocabularyRepository, _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, RDF } from '@faubulous/mentor-rdf';
import { BlankNodeIdGenerator, createFileBlankNodeIdGenerator, IToken, QuadContext, QuadReaderError, RdfSyntax, RdfToken, tokenizeWithTriplate, TriplateLexingResult, TurtleParser, TurtleQuadReader, TurtleReader } from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';
import { ISettingsService } from '@src/services/core';
import { DocumentContext } from '@src/services/document/document-context';
import { DocumentParseResult, ITokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { RangeIndex } from '@src/services/document/range-index';
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

	/**
	 * The output of the last {@link parse} pass, reused by the diagnostics
	 * service and {@link loadTriples} when it is still fresh for their text.
	 */
	private _lastParse: DocumentParseResult | undefined;

	constructor(uri: vscode.Uri, syntax: RdfSyntax, store: Store, vocabulary: VocabularyRepository, settings: ISettingsService) {
		super(uri, store, vocabulary, settings);

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
		// are stable across reloads of the same document. The lexer instance is
		// shared, so the generator must be set on every call.
		const lexer = ParserFactory.getLexer(this.syntax);
		lexer.blankNodeIdGenerator = createFileBlankNodeIdGenerator(this.uri.toString());

		const lexingResult = tokenizeWithTriplate(lexer, text);

		// Analyze the tokens here, once, so that the diagnostics service and
		// loadTriples can reuse the result instead of re-tokenizing and
		// re-reading the same text.
		this._lastParse = this._analyze(text, lexingResult);

		this.setTokens(lexingResult.tokens);

		return lexingResult.tokens;
	}

	/**
	 * Derives the quads, or the syntax tree and the errors, of a text from its
	 * tokens.
	 *
	 * A Turtle document is read by the quad reader first: it needs no syntax
	 * tree, which is what makes indexing and editing large files cheap, and it
	 * stops at the first error. Only a document it rejects goes through the
	 * grammar parser with error recovery, so that the diagnostics can list
	 * every error. A Triplate template, whose tree is built from placeholder
	 * tokens, and a TriG document take the grammar parser directly.
	 * @param text The text the tokens were produced from.
	 * @param lexingResult The tokens of the text.
	 * @returns The parse result, or `undefined` when the analysis failed outright.
	 */
	private _analyze(text: string, lexingResult: TriplateLexingResult): DocumentParseResult | undefined {
		if (this.syntax === RdfSyntax.Turtle && !lexingResult.template) {
			try {
				const quads = new TurtleQuadReader().read(lexingResult.tokens);

				return { text, tokens: lexingResult.tokens, template: false, lexErrors: lexingResult.errors, parserErrors: [], semanticErrors: [], quads };
			} catch (error) {
				// Anything but a syntax error is the reader giving up, such as
				// the stack being exhausted by a pathologically nested document.
				if (!(error instanceof QuadReaderError)) {
					return undefined;
				}
			}
		}

		return this._parseSyntaxTree(text, lexingResult);
	}

	/**
	 * Runs the grammar parser with error recovery over the tokens and captures
	 * the syntax tree together with the errors.
	 *
	 * The parse can fail outright rather than just collecting errors — a
	 * recursive-descent parser exhausts the stack on a pathologically large
	 * document (e.g. a 24k-line SPARQL query). That must not fail the whole
	 * parse: the tokens drive most language features and are already
	 * available. Returning no result makes every consumer fall back to its own
	 * parse, where such a failure is reported as a diagnostic (diagnostics
	 * service) or leaves the graph unloaded (loadTriples).
	 * @param text The text the tokens were produced from.
	 * @param lexingResult The tokens of the text.
	 * @returns The parse result, or `undefined` when the parse failed outright.
	 */
	private _parseSyntaxTree(text: string, lexingResult: TriplateLexingResult): DocumentParseResult | undefined {
		const { tokens, parseTokens, errors: lexErrors, template } = lexingResult;

		try {
			const parser = ParserFactory.getParser(this.syntax);
			const cst = parser.parse(parseTokens, false);

			return {
				text,
				tokens,
				parseTokens,
				template,
				cst,
				lexErrors,
				// The shared parser resets its error state on the next parse; copy it.
				parserErrors: [...parser.errors],
				semanticErrors: [...parser.semanticErrors]
			};
		} catch {
			return undefined;
		}
	}

	getParseResult(text: string): DocumentParseResult | undefined {
		return this._lastParse?.text === text ? this._lastParse : undefined;
	}

	releaseParseResult(): void {
		this._lastParse = undefined;
	}

	/**
	 * Drops the quads, the syntax tree and the parser token stream from the
	 * cached parse result once the triples have been read from it. The tokens
	 * and errors stay, so the diagnostics pass that follows still reuses the
	 * parse.
	 */
	protected _releaseParsedContent(): void {
		const cached = this._lastParse;

		if (!cached || (cached.quads === undefined && cached.cst === undefined && cached.parseTokens === undefined)) {
			return;
		}

		this._lastParse = {
			text: cached.text,
			tokens: cached.tokens,
			template: cached.template,
			lexErrors: cached.lexErrors,
			parserErrors: cached.parserErrors,
			semanticErrors: cached.semanticErrors
		};
	}

	/**
	 * Returns the syntax tree captured by {@link parse} when it was produced
	 * from exactly the given text, parsed cleanly and is still held. Templates
	 * are excluded: their tree is built from placeholder tokens.
	 * @param text The text about to be loaded.
	 */
	private _getReusableSyntaxTree(text: string): CstNode | undefined {
		const cached = this.getParseResult(text);

		if (!cached || cached.template || cached.lexErrors.length > 0 || cached.parserErrors.length > 0 || cached.semanticErrors.length > 0) {
			return undefined;
		}

		return cached.cst;
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
		const store = this._store;
		const reasoner = store.reasoner;

		if (reasoner && !this._inferenceExecuted) {
			this._inferenceExecuted = true;

			store.executeInference(WorkspaceUri.toCanonicalString(this.graphIri));
		}
	}

	/**
	 * Reads the quads of a parsed document from its CST. Subclasses can
	 * override this to configure a syntax-specific reader before reading.
	 * @param cst The CST produced by the parser matching the document syntax.
	 * @returns The quads of the document.
	 */
	protected readQuads(cst: CstNode): Quad[] {
		return ParserFactory.createReader(this.syntax).visit(cst) as Quad[];
	}

	/**
	 * Loads triples into the triple store using existing tokens.
	 * This method assumes tokens have already been set via setTokens().
	 * @param data The file content (not used, parsing uses existing tokens).
	 */
	public override async loadTriples(data: string): Promise<void> {
		try {
			const store = this._store;
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

			// Reuse the quads or the CST captured by parse() when they were
			// produced from exactly this content. An errored, stale or already
			// released result reads the tokens again, which throws on errors,
			// so invalid documents keep loading no triples.
			const quads = this.getParseResult(data)?.quads ?? this._readQuads(data);

			for (const q of quads) {
				const s = q.subject as Quad_Subject;
				const p = q.predicate as Quad_Predicate;
				const o = q.object as Quad_Object;

				const quad = store.dataFactory.quad(s, p, o, g);

				store.add(quad);
			}
		} catch (e) {
			// This is not a critical error because the graph might be invalid.
		} finally {
			// Nothing reads the quads or the syntax tree after the triples are
			// loaded, and a tree dwarfs everything else the context holds:
			// releasing them here is what keeps an indexed workspace from
			// retaining a tree per file.
			this._releaseParsedContent();
		}
	}

	/**
	 * Reads the quads of the current tokens when {@link parse} did not capture
	 * them: from the syntax tree it captured when that is reusable, otherwise
	 * by reading the tokens again. Throws when the document has errors, so
	 * that no triples are loaded from it.
	 *
	 * The parser and reader must match the document syntax: TriG graph blocks
	 * are invisible to the Turtle grammar. The grammar parser is a shared
	 * instance because chevrotain parser construction is expensive.
	 * @param text The text being loaded.
	 * @returns The quads of the document.
	 */
	private _readQuads(text: string): Quad[] {
		const cached = this.getParseResult(text);

		// The grammar parser has already rejected this text: reading it again
		// would only reproduce the errors it reported.
		if (cached && (cached.parserErrors.length > 0 || cached.semanticErrors.length > 0)) {
			throw new Error('The document has syntax errors.');
		}

		const cst = this._getReusableSyntaxTree(text);

		if (cst) {
			return this.readQuads(cst);
		}

		if (this.syntax === RdfSyntax.Turtle) {
			try {
				return new TurtleQuadReader().read(this._tokens);
			} catch (error) {
				if (!(error instanceof QuadReaderError)) {
					throw error;
				}
			}
		}

		return this.readQuads(ParserFactory.getParser(this.syntax).parse(this._tokens));
	}

	/**
	 * Parse the current tokens and return quad contexts with source token positions.
	 * Computed on-demand; callers should not store the result long-term.
	 * @return An array of quad contexts, which include the RDF quads and their associated token positions for subjects, predicates, objects and graph names.
	 */
	getQuadContexts(): QuadContext[] {
		if (!this._tokens.length) {
			return [];
		} else {
			try {
				const cst = new TurtleParser().parse(this._tokens);

				return new TurtleReader().readQuadContexts(cst, this._tokens);
			} catch {
				return [];
			}
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
		this.namespaceDefinitions = new RangeIndex();
		this.subjects = new RangeIndex();
		this.references = new RangeIndex();
		this.typeAssertions = new RangeIndex();
		this.typeDefinitions = new RangeIndex();

		this._tokens = tokens;

		let previousToken: IToken | undefined;

		tokens.forEach((t: IToken, i: number) => {
			switch (t.tokenType.name) {
				case RdfToken.PREFIX.name:
				case RdfToken.TTL_PREFIX.name: {
					const ns = getNamespaceDefinition(this.tokens, t);

					// Only set the namespace if it is preceeded by a prefix keyword.
					if (ns) {
						this.namespaces[ns.prefix] = ns.uri;
						this.namespaceDefinitions.set(ns.uri, getRangeFromToken(t));
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
			this.subjects.add(iriOrBlankId, getRangeFromToken(token));
		}
	}

	private _handleResourceReference(tokens: IToken[], token: IToken, iriOrBlankId: string) {
		this.references.add(iriOrBlankId, getRangeFromToken(token));
	}

	private _handleTypeAssertion(tokens: IToken[], token: IToken, uri: string, index: number) {
		if (uri === RDF.type) {
			const subjectToken = tokens[index - 1];

			if (!subjectToken) return;

			const subjectUri = getIriFromToken(this.namespaces, subjectToken);

			if (!subjectUri) return;

			this.typeAssertions.set(subjectUri, getRangeFromToken(subjectToken));
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
					this.typeDefinitions.set(subjectUri, getRangeFromToken(subjectToken));
				}
			}
		}
	}
}