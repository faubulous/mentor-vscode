import * as vscode from 'vscode';
import type { CstNode } from 'chevrotain';
import { Quad, Quad_Graph, Quad_Subject, Quad_Object, Quad_Predicate } from '@rdfjs/types';
import { LanguageTagUsageStats, Store, Uri, VocabularyRepository, _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, RDF } from '@faubulous/mentor-rdf';
import { BlankNodeIdGenerator, createFileBlankNodeIdGenerator, IToken, QuadContext, QuadReaderError, RdfSyntax, RdfToken, tokenizeWithTriplate, TriplateLexingResult, TurtleQuadReader, TurtleReader } from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';
import { ISettingsService } from '@src/services/core';
import { DocumentContext } from '@src/services/document/document-context';
import { DocumentParseResult, ITokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { RangeIndex } from '@src/utilities/range-index';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import {
	getIriFromIriReference,
	getIriFromToken,
	getNamespaceDefinition,
	getTokenAtPosition,
	getTokenRange,
	isPrefixTokenAtPosition
} from '@src/utilities';
import { PrefixedNameResolver } from '@src/languages/prefixed-name-resolver';
import { addLanguageTagUsage, replaceGraphQuads } from '@src/utilities/rdf';

/**
 * A document context for Turtle and TriG documents.
 */
export class TurtleDocument extends DocumentContext implements ITokenizedDocumentContext {
	readonly syntax: RdfSyntax;

	private _inferenceExecuted = false;

	private _tokens: IToken[] = [];

	/**
	 * Whether {@link setTokens} has built the index maps. Stays `true` when the
	 * tokens are released, so the document still counts as loaded.
	 */
	private _indexed = false;

	/**
	 * The output of the last {@link parse} pass, reused by the diagnostics
	 * service and {@link loadTriples} when it is still fresh for their text.
	 */
	private _lastParse: DocumentParseResult | undefined;

	/**
	 * The quad contexts read from the current tokens, kept until the tokens are replaced: reading
	 * them parses the whole document, which takes a noticeable time for a large one.
	 */
	private _quadContexts: { tokens: IToken[]; quadContexts: QuadContext[] } | undefined;

	/**
	 * The tokens of the last {@link tokenizeDocument} call and the document version they
	 * were produced from, shared by the providers that run on the same keystroke.
	 */
	private _tokenizeResult: { version: number; tokens: IToken[] } | undefined;

	constructor(uri: vscode.Uri, syntax: RdfSyntax, store: Store, vocabulary: VocabularyRepository, settings: ISettingsService) {
		super(uri, store, vocabulary, settings);

		this.syntax = syntax;
	}

	get isLoaded(): boolean {
		return this._indexed && this.graphs.length > 0;
	}

	/**
	 * Whether the tokens of the document are available. `false` for an indexed
	 * document whose tokens were released; see {@link releaseTokens}.
	 */
	get isParsed(): boolean {
		return this._tokens.length > 0;
	}

	/**
	 * Whether the document has been parsed at least once and its index maps exist.
	 */
	protected get isIndexed(): boolean {
		return this._indexed;
	}

	isTokenized(): this is ITokenizedDocumentContext {
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

	tokenizeDocument(document: vscode.TextDocument): IToken[] {
		if (this._tokenizeResult?.version !== document.version) {
			this._tokenizeResult = { version: document.version, tokens: this.tokenize(document.getText()) };
		}

		return this._tokenizeResult.tokens;
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

	releaseTokens(): void {
		this._tokens = [];
		this._lastParse = undefined;
		this._tokenizeResult = undefined;
		this._quadContexts = undefined;
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
		// Counted while the quads are read, instead of in a separate scan of the graph.
		const languageTagStats: LanguageTagUsageStats = {};

		const store = this._store;
		const graphUri = WorkspaceUri.toCanonicalString(this.graphIri);

		try {
			const g = store.dataFactory.namedNode(graphUri);

			// The graphs of a previous graph IRI, e.g. before a notebook cell got its slug.
			const previousGraphs = this.graphs.filter(uri => uri !== graphUri);

			// Initialize the graphs *before* trying to load the document so
			// that they are initialized even when loading the document fails.
			this.graphs.length = 0;
			this.graphs.push(graphUri);

			if (previousGraphs.length > 0) {
				store.deleteGraphs(previousGraphs, true);
			}

			const quads = this._readGraphQuads(data, g, languageTagStats);

			// Only the triples that changed are applied, so an edit does not replace all
			// triples of a large document, and the inference re-runs only after a change.
			if (replaceGraphQuads(store, g, quads)) {
				this._inferenceExecuted = false;
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

		this.languageTagStats = languageTagStats;
	}

	/**
	 * Reads the quads of the document into a graph and counts the language tags of their objects.
	 * @param data The text being loaded.
	 * @param graph The graph of the document.
	 * @param languageTagStats The statistics to count the language tags in.
	 * @returns The quads, or no quads when the document has errors, so that an invalid
	 * document loads no triples.
	 */
	private _readGraphQuads(data: string, graph: Quad_Graph, languageTagStats: LanguageTagUsageStats): Quad[] {
		let quads: Quad[];

		try {
			// Reuse the quads or the CST captured by parse() when they were produced
			// from exactly this content. An errored, stale or already released result
			// reads the tokens again, which throws on errors.
			quads = this.getParseResult(data)?.quads ?? this._readQuads(data);
		} catch {
			return [];
		}

		return quads.map(q => {
			addLanguageTagUsage(languageTagStats, q.object);

			return this._store.dataFactory.quad(q.subject as Quad_Subject, q.predicate as Quad_Predicate, q.object as Quad_Object, graph);
		});
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
	 * Computed on demand and kept until the tokens are replaced; callers should not store the
	 * result long-term.
	 * @return An array of quad contexts, which include the RDF quads and their associated token positions for subjects, predicates, objects and graph names.
	 */
	getQuadContexts(): QuadContext[] {
		if (this._quadContexts?.tokens !== this._tokens) {
			this._quadContexts = { tokens: this._tokens, quadContexts: this._readQuadContexts(this._tokens) };
		}

		// A copy, so a caller rearranging the list cannot change what the next caller reads.
		return [...this._quadContexts.quadContexts];
	}

	/**
	 * Parses the given text and returns its quad contexts without touching the
	 * document's tokens. Used for indexed files whose tokens were released; the
	 * file-scoped blank node identifiers match those of the indexed graph.
	 * @param text The document text.
	 */
	getQuadContextsForText(text: string): QuadContext[] {
		return this._readQuadContexts(this.tokenize(text, createFileBlankNodeIdGenerator(this.uri.toString())));
	}

	/**
	 * Parses tokens and reads their quad contexts.
	 * @param tokens The tokens to read.
	 */
	private _readQuadContexts(tokens: IToken[]): QuadContext[] {
		if (!tokens.length) {
			return [];
		}

		// The parser and reader must match the document syntax: TriG graph blocks are
		// invisible to the Turtle grammar. The parser is the shared instance, because
		// constructing a chevrotain parser is expensive.
		const reader = ParserFactory.createReader(this.syntax);

		if (!('readQuadContexts' in reader)) {
			return [];
		}

		try {
			const cst = ParserFactory.getParser(this.syntax).parse(tokens);

			// Only the Turtle reader associates comments with statements, which requires
			// the token stream including the comment tokens.
			return reader instanceof TurtleReader ? reader.readQuadContexts(cst, tokens) : reader.readQuadContexts(cst);
		} catch {
			return [];
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
		this._indexed = tokens.length > 0;

		let previousToken: IToken | undefined;

		const prefixedNames = new PrefixedNameResolver(this.namespaces);

		tokens.forEach((t: IToken, i: number) => {
			switch (t.tokenType.name) {
				case RdfToken.PREFIX.name:
				case RdfToken.TTL_PREFIX.name: {
					const ns = getNamespaceDefinition(this.tokens, t);

					// Only set the namespace if it is preceeded by a prefix keyword.
					if (ns) {
						this.namespaces[ns.prefix] = ns.uri;
						this.namespaceDefinitions.set(ns.uri, getTokenRange(t));

						prefixedNames.clear();
					}
					break;
				}
				case RdfToken.PNAME_NS.name:
				case RdfToken.PNAME_LN.name: {
					// The name in a prefix declaration declares the prefix and denotes no resource;
					// indexing it as a reference made e.g. namespace renames rewrite the declaration.
					if (this._isPrefixKeyword(previousToken)) {
						break;
					}

					// Without a trailing slash or hash, so that the IRIs are comparable
					// with the vscode.Uri.toString() output.
					const iri = prefixedNames.getNormalizedIri(t.image);

					if (!iri) break;

					if (previousToken) {
						this._registerSubject(tokens, i, t, iri, previousToken);
					}

					this._handleTypeAssertion(tokens, iri, i, prefixedNames);
					this._handleTypeDefinition(tokens, iri, i, prefixedNames);
					this._handleResourceReference(tokens, t, iri);
					break;
				}
				case RdfToken.IRIREF.name: {
					const iri = getIriFromIriReference(t.image);

					if (t.startColumn === 1 && previousToken) {
						this._registerSubject(tokens, i, t, iri, previousToken);
					}

					this._handleTypeAssertion(tokens, iri, i, prefixedNames);
					this._handleTypeDefinition(tokens, iri, i, prefixedNames);
					this._handleResourceReference(tokens, t, iri);
					break;
				}
				case RdfToken.A.name: {
					this._handleTypeAssertion(tokens, RDF.type, i, prefixedNames);
					this._handleTypeDefinition(tokens, RDF.type, i, prefixedNames);
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

	/**
	 * Returns the IRI of an IRI, prefixed name or blank node token, as `getIriFromToken` does.
	 * @param token A token.
	 * @param prefixedNames The resolver of the prefixed names of the document.
	 * @returns The IRI or blank node ID, or `undefined` if the token denotes no resource.
	 */
	private _getTokenIri(token: IToken, prefixedNames: PrefixedNameResolver): string | undefined {
		switch (token.tokenType.name) {
			case RdfToken.IRIREF.name: {
				return getIriFromIriReference(token.image);
			}
			case RdfToken.PNAME_LN.name:
			case RdfToken.PNAME_NS.name: {
				return prefixedNames.getIri(token.image);
			}
			default: {
				return token.payload?.blankNodeId;
			}
		}
	}

	/**
	 * Indicates whether a token is the keyword of a prefix declaration, `@prefix` or `PREFIX`.
	 * @param token A token.
	 */
	private _isPrefixKeyword(token: IToken | undefined): boolean {
		const tokenType = token?.tokenType.name;

		return tokenType === RdfToken.PREFIX.name || tokenType === RdfToken.TTL_PREFIX.name;
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
			this.subjects.add(iriOrBlankId, getTokenRange(token));
		}
	}

	private _handleResourceReference(tokens: IToken[], token: IToken, iriOrBlankId: string) {
		this.references.add(iriOrBlankId, getTokenRange(token));
	}

	private _handleTypeAssertion(tokens: IToken[], uri: string, index: number, prefixedNames: PrefixedNameResolver) {
		if (uri === RDF.type) {
			const subjectToken = tokens[index - 1];

			if (!subjectToken) return;

			const subjectUri = this._getTokenIri(subjectToken, prefixedNames);

			if (!subjectUri) return;

			this.typeAssertions.set(subjectUri, getTokenRange(subjectToken));
		}
	}

	private _handleTypeDefinition(tokens: IToken[], uri: string, index: number, prefixedNames: PrefixedNameResolver) {
		if (uri == RDF.type) {
			const subjectToken = tokens[index - 1];

			if (!subjectToken) return;

			const subjectUri = this._getTokenIri(subjectToken, prefixedNames);

			if (!subjectUri) return;

			const objectToken = tokens[index + 1];

			if (!objectToken) return;

			const objectUri = this._getTokenIri(objectToken, prefixedNames);

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
					this.typeDefinitions.set(subjectUri, getTokenRange(subjectToken));
				}
			}
		}
	}
}