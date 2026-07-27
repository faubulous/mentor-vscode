import * as vscode from 'vscode';
import type { CstNode, ILexingError } from 'chevrotain';
import { Range } from 'vscode-languageserver-types';
import { Quad_Subject } from '@rdfjs/types';
import { PredicateUsageStats } from '@faubulous/mentor-rdf';
import { Label } from './document-context';
import { BlankNodeIdGenerator, IRecognitionException, IToken, RdfSyntax } from '@faubulous/mentor-rdf-parsers';

/**
 * The output of one parse pass over a document text: the token streams, the
 * concrete syntax tree and the collected errors. Captured by
 * {@link ITokenizedDocumentContext.parse} so that the diagnostics service and
 * the triple loader can share a single tokenization and grammar parse per edit
 * instead of re-deriving them from the same text.
 */
export interface DocumentParseResult {
	/**
	 * The exact text the result was produced from; used as the freshness check.
	 */
	readonly text: string;

	/**
	 * The faithful token stream that IDE features and linters consume.
	 */
	readonly tokens: IToken[];

	/**
	 * The tokens consumed by the grammar parser — placeholder tokens for
	 * Triplate templates, identical to {@link tokens} otherwise.
	 */
	readonly parseTokens: IToken[];

	/**
	 * Whether the text is a Triplate template.
	 */
	readonly template: boolean;

	/**
	 * The concrete syntax tree produced by the shared parser with error
	 * recovery enabled.
	 */
	readonly cst: CstNode;

	/**
	 * The characters the lexer could not match.
	 */
	readonly lexErrors: ILexingError[];

	/**
	 * A copy of the shared parser's recognition errors, which reset on every parse.
	 */
	readonly parserErrors: IRecognitionException[];

	/**
	 * A copy of the shared parser's semantic errors, which reset on every parse.
	 */
	readonly semanticErrors: IRecognitionException[];
}

/**
 * Interface for document context that provides access to RDF document specific data.
 */
export interface IDocumentContext {
	/**
	 * The URI of the document.
	 */
	readonly uri: vscode.Uri;

	/**
	 * The graphs in the triple store associated with the document.
	 */
	readonly graphs: string[];

	/**
	 * Get the URI of the document graph in the triple store.
	 */
	readonly graphIri: vscode.Uri;

	/**
	 * Get the base IRI of the document that can be used for resolving local names into IRIs.
	 */
	baseIri: string | undefined;

	/**
	 * Maps prefixes to namespace IRIs.
	 */
	namespaces: { [key: string]: string };

	/**
	 * Maps prefixes to the location of their definition in the document.
	 */
	namespaceDefinitions: { [key: string]: Range[] };

	/**
	 * Maps IRIs that appear as subjects to the locations where they appear in the document.
	 */
	subjects: { [key: string]: Range[] };

	/**
	 * Maps IRIs of all resources to the locations where they appear in the document.
	 */
	references: { [key: string]: Range[] };

	/**
	 * A human-readable slug used as the URI fragment for the document's graph IRI.
	 * For notebook cells this replaces the opaque VS Code-assigned fragment.
	 * When undefined the raw URI fragment is used as-is.
	 */
	slug: string | undefined;

	/**
	 * Indicates if the document type is parsed using a tokenizing parser.
	 * @note XML documents are not tokenized.
	 */
	providesTokens: boolean;

	/**
	 * Maps IRIs of subjects that have an asserted rdf:type to the location of the type assertion.
	 */
	typeAssertions: { [key: string]: Range[] };

	/**
	 * Maps IRIs of subjects that are class or property definitions to the location of the definition.
	 */
	typeDefinitions: { [key: string]: Range[] };

	/**
	 * Information about the language tags used in the document.
	 */
	predicateStats: PredicateUsageStats;

	/**
	 * The most often used language tag in the document.
	 */
	readonly primaryLanguage: string | undefined;

	/**
	 * The ISO 639-3 language tag of the user-selected display document language.
	 */
	activeLanguageTag: string | undefined;

	/**
	 * The language portion of the active ISO 639-3 language tag without the regional part.
	 * e.g. 'en' for the language tags 'en' or 'en-gb'.
	 */
	readonly activeLanguage: string | undefined;

	/**
	 * The predicates to be used for retrieving labels and descriptions for resources.
	 */
	readonly predicates: {
		label: string[];
		description: string[];
	};

	/**
	 * Indicates whether parser output has been delivered by the language server,
	 * so that triples can be (re)loaded. See {@link isLoaded} for store state.
	 */
	readonly isParsed: boolean;

	/**
	 * Indicates whether the document is fully loaded.
	 */
	readonly isLoaded: boolean;

	/**
	 * Indicates whether the document is temporary and not persisted.
	 */
	readonly isTemporary: boolean;

	/**
	 * Parses the given document text and updates the context's derived state
	 * (tokens or parse data, namespaces, references, type assertions). This is
	 * the authoritative update path: token-based contexts use a file-scoped
	 * blank node ID generator so blank node identities are stable across reloads.
	 * @param text The current document text.
	 * @returns The tokens of the document, or an empty array for contexts that are not token-based.
	 */
	parse(text: string): IToken[];

	/**
	 * Loads triples into the triple store using existing tokens.
	 * @param data The file content.
	 */
	loadTriples(data: string): Promise<void>;

	/**
	 * Infers new triples from the document, if not already done.
	 */
	infer(): Promise<void>;

	/**
	 * Get the full IRI of a resource at the given position in the document.
	 * @param position The position in the document.
	 * @returns The full IRI of the resource or `undefined` if not found.
	 */
	getIriAtPosition(position: vscode.Position): string | undefined;

	/**
	 * Get a literal value at the given position in the document.
	 * @param position The position in the document.
	 * @returns The literal value at the position or `undefined` if there is no literal value at that position.
	 */
	getLiteralAtPosition(position: vscode.Position): string | undefined;

	/**
	 * Event handler for when the document is changed.
	 * @param e The document change event.
	 */
	onDidChangeDocument(e: vscode.TextDocumentChangeEvent): Promise<void>;

	/**
	 * Get the text document with the given URI.
	 * @returns The text document if it is loaded, undefined otherwise.
	 */
	getTextDocument(): vscode.TextDocument | undefined;

	/**
	 * Get the prefix for a namespace IRI.
	 * @param namespaceIri The namespace IRI.
	 * @returns The prefix for the namespace IRI or `undefined`.
	 */
	getPrefixForNamespaceIri(namespaceIri: string): string | undefined;

	/**
	 * Updates a namespace prefix definition in the document.
	 * @param oldPrefix The prefix to be replaced.
	 * @param newPrefix The prefix to replace the old prefix.
	 */
	updateNamespacePrefix(oldPrefix: string, newPrefix: string): void;

	/**
	 * Get the label of a resource according to the current user preferences for the display of labels.
	 * @param subjectUri URI of the resource.
	 * @returns A label for the resource as a string literal.
	 */
	getResourceLabel(subjectUri: string): Label;

	/**
	 * Get a rendered version of a SHACL path as a string.
	 * @param node The object of a SHACL path triple.
	 * @returns A rendered version of the SHACL path as a string.
	 */
	getPropertyPathLabel(node: Quad_Subject): string;

	/**
	 * Get the description of a resource.
	 * @param subjectUri URI of the resource.
	 * @returns A description for the resource as a string literal.
	 */
	getResourceDescription(subjectUri: string): Label | undefined;

	/**
	 * Get the IRI of a resource.
	 * @param subjectIri IRI of the resource.
	 * @returns A IRI for the resource as a string literal.
	 */
	getResourceIri(subjectIri: string): string;

	/**
	 * Get the tooltip for a resource.
	 * @param subjectUri URI of the resource.
	 * @returns A markdown string containing the label, description and URI of the resource.
	 */
	getResourceTooltip(subjectUri: string): vscode.MarkdownString;
}

/**
 * Interface for document contexts that have been tokenized and thus provide access to the tokens of the document.
 */
export interface ITokenizedDocumentContext extends IDocumentContext {
	/**
	 * The RDF syntax of the document, which determines its lexer and parser.
	 */
	readonly syntax: RdfSyntax;

	/**
	 * The tokens of the document, if the document has been tokenized.
	 */
	tokens: IToken[];

	/**
	 * Tokenizes the given text synchronously using the document's own syntax,
	 * without requiring the language server.
	 * @param text The text to tokenize.
	 * @param blankNodeIdGenerator Optional blank node ID generator. Use a file-scoped
	 * generator when the tokens are meant for triple loading so that blank node
	 * identities are stable across reloads; without one, the default generator is
	 * used, which is only suitable for positional lookups.
	 * @returns The tokens of the text.
	 */
	tokenize(text: string, blankNodeIdGenerator?: BlankNodeIdGenerator): IToken[];

	/**
	 * Sets the tokens of the document and updates the derived indexes
	 * (namespaces, references, type assertions and definitions).
	 * @param tokens An array of tokens.
	 */
	setTokens(tokens: IToken[]): void;

	/**
	 * Returns the result of the last {@link IDocumentContext.parse} pass when
	 * it was produced from exactly the given text, or `undefined` when it is
	 * stale or no parse has run yet. Callers fall back to deriving the data
	 * themselves in that case.
	 * @param text The current document text.
	 */
	getParseResult(text: string): DocumentParseResult | undefined;
}

/**
 * Indicates whether a document context is tokenized and thus provides access to its tokens.
 * @param context A document context.
 * @returns `true` if the context exposes a token stream, narrowing it to {@link ITokenizedDocumentContext}.
 */
export function isTokenizedDocumentContext(context: IDocumentContext): context is ITokenizedDocumentContext {
	return context.providesTokens;
}