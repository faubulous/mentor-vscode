import * as n3 from 'n3';
import * as rdfjs from "@rdfjs/types";
import * as vscode from 'vscode';
import { _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, sh } from '@faubulous/mentor-rdf';
import { PredicateUsageStats, LanguageTagUsageStats } from '@faubulous/mentor-rdf';
import { Uri } from '@faubulous/mentor-rdf';
import { mentor } from '@/mentor';
import { WorkspaceUri } from '@/workspace/workspace-uri';
import { TreeLabelStyle } from '@/settings';
import { Range } from 'vscode-languageserver-types';

/**
 * A literal value with optional language tag.
 */
export interface Label {
	/**
	 * The value of the literal.
	 */
	value: string;

	/**
	 * The language tag of the literal, if any.
	 */
	language: string | undefined;
}

/**
 * A map of token type names specific for the document language.
 */
export interface TokenTypes {
	/**
	 * The token type name of the 'base' keyword in the document language.
	 */
	BASE: string;

	/**
	 * The token type name of the 'prefix' keyword in the document language.
	 */
	PREFIX: string;

	/**
	 * The token type name of IRIs in the document language.
	 */
	IRIREF: string;

	/**
	 * The token type name of a namespace prefix in the document language.
	 */
	PNAME_NS: string;
}

/**
 * A class that provides access to RDF document specific data such as namespaces, graphs and token maps.
 */
export abstract class DocumentContext {
	/**
	 * The URI of the document.
	 */
	readonly uri: vscode.Uri;

	/**
	 * The graphs in the triple store associated with the document.
	 */
	readonly graphs: string[] = [];

	/**
	 * Get the URI of the document graph in the triple store.
	 * @note This is a workspace-relative URI so that queries which are persisted in a repository are portable.
	 */
	get graphIri(): vscode.Uri {
		return WorkspaceUri.toWorkspaceUri(this.uri) || this.uri;
	}

	/**
	 * Get the base IRI of the document that can be used for resolving local names into IRIs.
	 */
	baseIri: string | undefined;

	/**
	 * Maps prefixes to namespace IRIs.
	 */
	namespaces: { [key: string]: string } = {};

	/**
	 * Maps prefixes to the location of their definition in the document.
	 */
	namespaceDefinitions: { [key: string]: Range[] } = {};

	/**
	 * Maps IRIs that appear as subjects to the locations where they appear in the document.
	 */
	subjects: { [key: string]: Range[] } = {};

	/**
	 * Maps IRIs of all resources to the locations where they appear in the document.
	 */
	references: { [key: string]: Range[] } = {};

	// TODO: Remove all type definitions from this map and query the combination of typeAssertion and typeDefinitions instead.
	/**
	 * Maps IRIs of subjects that have an asserted rdf:type to the location of the type assertion. This includes
	 * named individuals, classes and properties.
	 */
	typeAssertions: { [key: string]: Range[] } = {};

	/**
	 * Maps IRIs of subjects that are class or property definitions to the location of the definition. This includes
	 * only class defintions.
	 */
	typeDefinitions: { [key: string]: Range[] } = {};

	/**
	 * Maps blank node ids to indexed tokens.
	 */
	blankNodes: { [key: string]: Range } = {};

	/**
	 * Information about the language tags used in the document.
	 */
	predicateStats: PredicateUsageStats = {};

	private _primaryLanguage: string | undefined | null = null;

	/**
	 * The most often used language tag in the document.
	 */
	get primaryLanguage(): string | undefined {
		if (this._primaryLanguage === null && this.predicateStats) {
			let languageStats: LanguageTagUsageStats = {};

			for (let [_, value] of Object.entries(this.predicateStats)) {
				for (let [lang, count] of Object.entries(value.languageTags)) {
					if (!languageStats[lang]) {
						languageStats[lang] = count;
					} else {
						languageStats[lang] += count;
					}
				}
			}

			let maxFrequency = -1;

			this._primaryLanguage = undefined;

			for (let [lang, frequency] of Object.entries(languageStats)) {
				if (frequency > maxFrequency) {
					maxFrequency = frequency;

					this._primaryLanguage = lang;
				}
			}
		}

		return this._primaryLanguage ?? undefined;
	}

	private _activeLanguageTag: string | undefined;

	/**
	 * The ISO 639-3 language tag of the user-selected display document language. This value
	 * can be used to restore the user's selection when switching between documents.
	 */
	get activeLanguageTag(): string | undefined {
		return this._activeLanguageTag;
	}

	set activeLanguageTag(value: string | undefined) {
		this._activeLanguageTag = value;

		if (value) {
			this._activeLanguage = value.split('-')[0];
		} else {
			this._activeLanguage = undefined;
		}
	}

	private _activeLanguage: string | undefined;

	/**
	 * The language portion of the active ISO 639-3 language tag without the regional part.
	 * e.g. 'en' for the language tags 'en' or 'en-gb'.
	 */
	get activeLanguage(): string | undefined {
		return this._activeLanguage;
	}

	/**
	 * The predicates to be used for retrieving labels and descriptions for resources.
	 */
	readonly predicates = {
		label: [] as string[],
		description: [] as string[]
	};

	constructor(documentUri: vscode.Uri) {
		this.uri = documentUri;
		this.predicates.label = mentor.configuration.get('predicates.label') ?? [];
		this.predicates.description = mentor.configuration.get('predicates.description') ?? [];
	}

	/**
	 * Indicates whether the document is fully loaded.
	 */
	abstract get isLoaded(): boolean;

	/**
	 * Indicates whether the document is temporary and not persisted.
	 */
	get isTemporary(): boolean {
		return this.uri.scheme == 'git';
	}

	/**
	 * Loads the document from the given URI and data.
	 * @param data The file content.
	 */
	abstract parse(data: string): Promise<void>;

	/**
	 * Infers new triples from the document, if not already done.
	 */
	abstract infer(): Promise<void>;

	/**
	 * Gets the token type names specific for the document language.
	 */
	abstract getTokenTypes(): TokenTypes;

	/**
	 * Get a namespace prefix definition in the serialization of the document language.
	 * @param prefix The prefix to declare.
	 * @param uri The URI to associate with the prefix.
	 * @param upperCase Indicates whether the prefix keyword should be in uppercase.
	 */
	abstract getPrefixDefinition(prefix: string, uri: string, upperCase: boolean): string;

	/**
	 * Get the full IRI of a resource at the given position in the document.
	 * @param position The position in the document.
	 * @returns The full IRI of the resource or `undefined` if not found.
	 */
	abstract getIriAtPosition(position: vscode.Position): string | undefined;

	/**
	 * Get a literal value at the given position in the document.
	 * @param position The position in the document.
	 * @returns The literal value at the position or `undefined` if there is no literal value at that position.
	 */
	abstract getLiteralAtPosition(position: vscode.Position): string | undefined;

	/**
	 * Event handler for when the document is changed.
	 * @param e The document change event.
	 **/
	async onDidChangeDocument(e: vscode.TextDocumentChangeEvent): Promise<void> { };

	/**
	 * Get the text document with the given URI.
	 * @param uri The URI of the text document.
	 * @returns The text document if it is loaded, null otherwise.
	 */
	getTextDocument(): vscode.TextDocument | undefined {
		return vscode.workspace.textDocuments.find(d => d.uri.toString() === this.uri.toString());
	}

	/**
	 * Get the prefix for a namespace IRI.
	 * @param namespaceIri The namespace IRI.
	 * @returns The prefix for the namespace IRI or `undefined`.
	 */
	getPrefixForNamespaceIri(namespaceIri: string): string | undefined {
		for (let [prefix, iri] of Object.entries(this.namespaces)) {
			if (iri === namespaceIri) {
				return prefix;
			}
		}
	}

	/**
	 * Updates a namespace prefix definition in the document.
	 * @param oldPrefix The prefix to be replaced.
	 * @param newPrefix The prefix to replace the old prefix.
	 */
	updateNamespacePrefix(oldPrefix: string, newPrefix: string) {
		const uri = this.namespaces[oldPrefix];

		if (!uri) return;

		delete this.namespaces[oldPrefix];

		this.namespaces[newPrefix] = uri;
	}

	/**
	 * Get the label of a resource according to the current user preferences for the display of labels.
	 * @param subjectUri URI of the resource.
	 * @returns A label for the resource as a string literal.
	 */
	getResourceLabel(subjectUri: string): Label {
		// TODO: Fix #10 in mentor-rdf; Refactor node identifiers to be node instances instead of strings.
		const subject = subjectUri.includes(':') ? new n3.NamedNode(subjectUri) : new n3.BlankNode(subjectUri);

		// TODO: Add config option to enable/disable SHACL path labels.
		// If the node has a SHACL path, use it as the label.
		for (let q of mentor.store.matchAll(this.graphs, subject, sh.path, null, false)) {
			return {
				value: this.getPropertyPathLabel(q.object as n3.Quad_Subject),
				language: undefined
			};
		}

		const treeLabelStyle = mentor.settings.get<TreeLabelStyle>('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);

		switch (treeLabelStyle) {
			case TreeLabelStyle.AnnotatedLabels: {
				const predicates = this.predicates.label.map(p => new n3.NamedNode(p));

				// First, try to find a description in the current graph.
				let result = this._getResourceAnnotationFromPredicates(this.graphs, subject, predicates);

				if (result) {
					return result;
				}

				// If none is found, try to find a description in the default graph.
				result = this._getResourceAnnotationFromPredicates(undefined, subject, predicates);

				if (result) {
					return result;
				}

				// Fallback to URI labels without prefixes.
				break;
			}
			case TreeLabelStyle.UriLabelsWithPrefix: {
				const namespace = Uri.getNamespaceIri(subjectUri);
				let prefix = "?";

				for (let [p] of Object.entries(this.namespaces).filter(([_, ns]) => ns == namespace)) {
					prefix = p;
					break;
				}

				return {
					value: `${prefix}:${Uri.getLocalPart(subjectUri) || subjectUri}`,
					language: undefined
				};
			}
		}

		return {
			value: decodeURIComponent(Uri.getLocalPart(subjectUri) || subjectUri),
			language: undefined
		};
	}

	/**
	 * Get an annotation to a resource from a list of predicates. Either in the active document language or in the primary language.
	 * @param graphUris URIs of the graphs to query.
	 * @param subject A subject node.
	 * @param predicates A list of predicates to reqtrieve the label from.
	 * @returns The label of the resource as a string literal.
	 */
	private _getResourceAnnotationFromPredicates(graphUris: string[] | string | undefined, subject: n3.NamedNode | n3.BlankNode, predicates: n3.NamedNode[]): Label | undefined {
		let languageLabel: rdfjs.Literal | undefined = undefined;
		let primaryLabel: rdfjs.Literal | undefined = undefined;
		let fallbackLabel: rdfjs.Literal | undefined = undefined;

		for (let p of predicates) {
			for (let q of mentor.store.matchAll(graphUris, subject, p, null, false)) {
				if (q.object.termType === 'Literal') {
					const literal = q.object as n3.Literal;

					// Prefer to return non-empty values.
					if (literal.value.length == 0) {
						continue;
					}

					// Check if the literal language matches the active language
					if (literal.language === this.activeLanguageTag) {
						return literal;
					}

					// Store the literal if it matches the active language without the regional part.
					if (this.activeLanguage && literal.language.startsWith(this.activeLanguage)) {
						languageLabel = literal;
					}

					// Store the literal if it matches the primary language
					if (this.primaryLanguage === literal.language) {
						primaryLabel = literal;
					}

					// Store the first literal as a fallback value.
					if (!fallbackLabel) {
						fallbackLabel = literal;
					}
				} else {
					return {
						value: Uri.getLocalPart(q.object.value) || '',
						language: undefined
					};
				}
			}

			// If we have found a label given the current predicates, we can stop 
			// searching as the predicates are ordered in priority.
			if (languageLabel || primaryLabel || fallbackLabel) {
				break;
			}
		}

		if (languageLabel) return languageLabel;
		if (primaryLabel) return primaryLabel;

		return fallbackLabel;
	}

	/**
	 * Get a rendered version of a SHACL path as a string according to the current user preferences for label display.
	 * @param node The object of a SHACL path triple.
	 * @returns A rendered version of the SHACL path as a string.
	 */
	getPropertyPathLabel(node: n3.Quad_Subject): string {
		let result = [];

		for (let c of mentor.vocabulary.getPropertyPathTokens(this.graphs, node)) {
			if (typeof (c) === 'string') {
				if (c === '|' || c === '/') {
					result.push(` ${c} `);
				} else {
					result.push(c);
				}
			} else {
				result.push(this.getResourceLabel(c.value).value);
			}
		}

		return result.join('');
	}

	/**
	 * Get the description of a resource.
	 * @param subjectUri URI of the resource.
	 * @returns A description for the resource as a string literal.
	 */
	getResourceDescription(subjectUri: string): Label | undefined {
		// TODO: Fix #10 in mentor-rdf; This is a hack: we need to return nodes from the Mentor RDF API instead of strings.
		const subject = subjectUri.includes(':') ? new n3.NamedNode(subjectUri) : new n3.BlankNode(subjectUri);
		const predicates = this.predicates.description.map(p => new n3.NamedNode(p));

		// First, try to find a description in the current graph.
		let result = this._getResourceAnnotationFromPredicates(this.graphs, subject, predicates);

		if (result) {
			return result;
		}

		return this._getResourceAnnotationFromPredicates(undefined, subject, predicates);
	}

	/**
	 * Get the IRI of a resource. Resolves relative file IRIs with regards to the directory of the current document.
	 * @param subjectIri IRI of the resource.
	 * @returns A IRI for the resource as a string literal.
	 */
	getResourceIri(subjectIri: string): string {
		// TODO: Add support for virtual file systems provided by vscode such as vscode-vfs.
		if (subjectIri.startsWith('file')) {
			const u = vscode.Uri.parse(subjectIri);

			// Resolve relative file IRIs with regards to the directory of the current document.
			if (u.authority === '..') {
				// For a file URI the namespace is the directory of the current document.
				const directory = Uri.getNamespaceIri(this.uri.toString());
				const filePath = subjectIri.split('//')[1];
				const fileUrl = vscode.Uri.joinPath(vscode.Uri.parse(directory), filePath);

				// Allow navigating to the relative file.
				return '[' + filePath + '](' + fileUrl + ')';
			}
		}

		return subjectIri;
	}

	/**
	 * Get the tooltip for a resource.
	 * @param subjectUri URI of the resource.
	 * @returns A markdown string containing the label, description and URI of the resource.
	 */
	getResourceTooltip(subjectUri: string): vscode.MarkdownString {
		const iri = this.getResourceIri(subjectUri);
		const label = this.getResourceLabel(subjectUri);
		const description = this.getResourceDescription(subjectUri);

		let lines = [
			`**${label.value}**`,
			description?.value,
			iri
		];

		return new vscode.MarkdownString(lines.filter(line => line).join('\n\n'), true);
	}
}