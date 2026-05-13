import * as vscode from 'vscode';
import { Range } from 'vscode-languageserver-types';
import { Quad_Subject } from '@rdfjs/types';
import { PredicateUsageStats } from '@faubulous/mentor-rdf';
import { Label } from './document-context';
import { IToken } from '@faubulous/mentor-rdf-parsers';

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
	 * Indicates whether the document is fully loaded.
	 */
	readonly isLoaded: boolean;

	/**
	 * Indicates whether tokens have been set for this document.
	 */
	readonly hasTokens: boolean;

	/**
	 * Indicates whether the document is temporary and not persisted.
	 */
	readonly isTemporary: boolean;

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
export interface ITokenDocumentContext extends IDocumentContext {
	/**
	 * The tokens of the document, if the document has been tokenized.
	 */
	tokens: IToken[];
}