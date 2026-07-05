import * as vscode from 'vscode';
import { Range } from 'vscode-languageserver-types';
import { container } from 'tsyringe';
import { Quad_Subject } from "@rdfjs/types";
import { Store, VocabularyRepository, _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, SH } from '@faubulous/mentor-rdf';
import { Uri, NamedNode, BlankNode, Literal } from '@faubulous/mentor-rdf';
import { PredicateUsageStats, LanguageTagUsageStats } from '@faubulous/mentor-rdf';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { TreeLabelStyle } from '@src/services/core/settings-service';
import { getConfig } from '@src/utilities/vscode/config';
import { IDocumentContext } from './document-context.interface';

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
 * A class that provides access to RDF document specific data such as namespaces, graphs and token maps.
 */
export abstract class DocumentContext implements IDocumentContext {

	readonly uri: vscode.Uri;

	readonly graphs: string[] = [];

	slug: string | undefined;

	get graphIri(): vscode.Uri {
		return WorkspaceUri.toWorkspaceUri(this.uri, this.slug) || this.uri;
	}

	baseIri: string | undefined;

	namespaces: { [key: string]: string } = {};

	namespaceDefinitions: { [key: string]: Range[] } = {};

	subjects: { [key: string]: Range[] } = {};

	references: { [key: string]: Range[] } = {};

	// TODO: Remove all type definitions from this map and query the combination of typeAssertion and typeDefinitions instead.
	typeAssertions: { [key: string]: Range[] } = {};

	typeDefinitions: { [key: string]: Range[] } = {};

	predicateStats: PredicateUsageStats = {};

	private _primaryLanguage: string | undefined | null = null;

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
				if (lang && frequency > maxFrequency) {
					maxFrequency = frequency;

					this._primaryLanguage = lang;
				}
			}
		}

		return this._primaryLanguage ?? undefined;
	}

	private _activeLanguageTag: string | undefined;

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


	get activeLanguage(): string | undefined {
		return this._activeLanguage;
	}

	readonly predicates = {
		label: [] as string[],
		description: [] as string[]
	};

	constructor(documentUri: vscode.Uri) {
		const config = getConfig();

		this.uri = documentUri;
		this.predicates.label = config.get('predicates.label') ?? [];
		this.predicates.description = config.get('predicates.description') ?? [];
	}

	abstract get isLoaded(): boolean;

	abstract get isParsed(): boolean;

	abstract get providesTokens(): boolean;

	get isTemporary(): boolean {
		return this.uri.scheme == 'git' || this.uri.scheme == 'untitled';
	}

	abstract parse(text: string): IToken[];

	abstract loadTriples(data: string): Promise<void>;

	abstract infer(): Promise<void>;

	abstract getIriAtPosition(position: vscode.Position): string | undefined;

	abstract getLiteralAtPosition(position: vscode.Position): string | undefined;

	async onDidChangeDocument(e: vscode.TextDocumentChangeEvent): Promise<void> { };

	getTextDocument(): vscode.TextDocument | undefined {
		return vscode.workspace.textDocuments.find(d => d.uri.toString() === this.uri.toString());
	}

	getPrefixForNamespaceIri(namespaceIri: string): string | undefined {
		for (let [prefix, iri] of Object.entries(this.namespaces)) {
			if (iri === namespaceIri) {
				return prefix;
			}
		}
	}

	updateNamespacePrefix(oldPrefix: string, newPrefix: string) {
		const uri = this.namespaces[oldPrefix];

		if (!uri) return;

		delete this.namespaces[oldPrefix];

		this.namespaces[newPrefix] = uri;
	}

	getResourceLabel(subjectUri: string): Label {
		// TODO: Fix #10 in mentor-rdf; Refactor node identifiers to be node instances instead of strings.
		const subject = subjectUri.includes(':') ? new NamedNode(subjectUri) : new BlankNode(subjectUri);
		const settings = container.resolve<ISettingsService>(ServiceToken.SettingsService);
		const treeLabelStyle = settings.get<TreeLabelStyle>('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);

		switch (treeLabelStyle) {
			case TreeLabelStyle.AnnotatedLabels: {
				const predicates = this.predicates.label.map(p => new NamedNode(p));

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
	private _getResourceAnnotationFromPredicates(graphUris: string[] | string | undefined, subject: NamedNode | BlankNode, predicates: NamedNode[]): Label | undefined {
		let languageLabel: Literal | undefined = undefined;
		let primaryLabel: Literal | undefined = undefined;
		let fallbackLabel: Literal | undefined = undefined;

		const store = container.resolve<Store>(ServiceToken.Store);

		for (let p of predicates) {
			for (let q of store.matchAll(graphUris, subject, p, null, false)) {
				if (q.object.termType === 'Literal') {
					const literal = q.object as Literal;

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
				} else if (p.value === SH.path) {
					return {
						value: this.getPropertyPathLabel(q.object as Quad_Subject),
						language: undefined
					};
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

	getPropertyPathLabel(node: Quad_Subject): string {
		let result = [];
		const vocabulary = container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);

		for (let c of vocabulary.getPropertyPathTokens(this.graphs, node)) {
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

	getResourceDescription(subjectUri: string): Label | undefined {
		// TODO: Fix #10 in mentor-rdf; This is a hack: we need to return nodes from the Mentor RDF API instead of strings.
		const subject = subjectUri.includes(':') ? new NamedNode(subjectUri) : new BlankNode(subjectUri);
		const predicates = this.predicates.description.map(p => new NamedNode(p));

		// First, try to find a description in the current graph.
		let result = this._getResourceAnnotationFromPredicates(this.graphs, subject, predicates);

		if (result) {
			return result;
		}

		return this._getResourceAnnotationFromPredicates(undefined, subject, predicates);
	}

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