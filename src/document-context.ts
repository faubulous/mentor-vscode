import * as n3 from 'n3';
import * as vscode from 'vscode';
import * as mentor from './mentor';
import * as url from 'url';
import { _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, rdf, sh } from '@faubulous/mentor-rdf';
import { IToken } from 'millan';
import { getUriLabel, getUriFromIriReference, getUriFromPrefixedName, getUriFromToken, getNamespaceDefinition, getNamespaceUri } from './utilities';
import { TreeLabelStyle } from './settings';

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

	private _tokens: IToken[] = [];

	private _namespaces: { [key: string]: string } = {};

	private _namespaceDefinitions: { [key: string]: IToken } = {};

	private _references: { [key: string]: IToken[] } = {};

	private _typeAssertions: { [key: string]: IToken[] } = {};

	private _typeDefinitions: { [key: string]: IToken[] } = {};

	private _blankNodes: { [key: string]: IToken } = {};

	/**
	 * The predicates to be used for retrieving labels and descriptions for resources.
	 */
	readonly predicates = {
		label: [],
		description: []
	};

	constructor(documentUri: vscode.Uri) {
		this.uri = documentUri;
		this.predicates.label = mentor.configuration.get('predicates.label') ?? [];
		this.predicates.description = mentor.configuration.get('predicates.description') ?? [];
	}

	/**
	 * Indicates whether the document is temporary and not persisted.
	 */
	get isTemporary(): boolean {
		return this.uri.scheme == 'git';
	}

	/**
	 * All tokens in the document.
	 */
	get tokens(): IToken[] {
		return this._tokens;
	}

	/**
	* All namespaces defined in the document.
	*/
	get namespaces(): { [key: string]: string } {
		return this._namespaces;
	}

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	get namespaceDefinitions(): { [key: string]: IToken } {
		return this._namespaceDefinitions;
	}

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	get references(): { [key: string]: IToken[] } {
		return this._references;
	}

	/**
	 * Maps resource URIs to tokens of subjects that have an asserted rdf:type.
	 */
	get typeAssertions(): { [key: string]: IToken[] } {
		return this._typeAssertions;
	}

	/**
	 * Maps resource URIs to tokens of subjects that are class or property definitions.
	 */
	get typeDefinitions(): { [key: string]: IToken[] } {
		return this._typeDefinitions;
	}

	/**
	 * Maps blank node ids to indexed tokens.
	 */
	get blankNodes(): { [key: string]: IToken } {
		return this._blankNodes;
	}

	/**
	 * Loads the document from the given URI and data.
	 * @param uri The file URI.
	 * @param data The file content.
	 */
	abstract parse(uri: vscode.Uri, data: string): Promise<void>;

	/**
	 * Infers new triples from the document, if not already done.
	 */
	abstract infer(): Promise<void>;

	setTokens(tokens: IToken[]): void {
		this._tokens = tokens;
		this._namespaces = {};
		this._namespaceDefinitions = {};
		this._references = {};
		this._typeAssertions = {};
		this._typeDefinitions = {};
		this._blankNodes = {};

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
					const uri = getUriFromPrefixedName(this.namespaces, t.image);

					if (!uri) break;

					this._handleTypeAssertion(tokens, t, uri, i);
					this._handleTypeDefinition(tokens, t, uri, i);
					this._handleUriReference(tokens, t, uri);
					break;
				}
				case 'IRIREF': {
					const uri = getUriFromIriReference(t.image);

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

		const subjectUri = getUriFromToken(this.namespaces, subjectToken);

		if (!subjectUri) return;

		this.typeAssertions[subjectUri] = [subjectToken];
	}

	private _handleTypeDefinition(tokens: IToken[], token: IToken, uri: string, index: number) {
		if (uri != rdf.type.id) return;

		const subjectToken = tokens[index - 1];

		if (!subjectToken) return;

		const subjectUri = getUriFromToken(this.namespaces, subjectToken);

		if (!subjectUri) return;

		const objectToken = tokens[index + 1];

		if (!objectToken) return;

		const objectUri = getUriFromToken(this.namespaces, objectToken);

		if (!objectUri) return;

		const namespaceUri = getNamespaceUri(objectUri);

		// Todo: Make this more explicit to reduce false positives.
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

	/**
	 * Updates a namespace prefix definition in the document.
	 * @param oldPrefix The prefix to be replaced.
	 * @param newPrefix The prefix to replace the old prefix.
	 */
	public updateNamespacePrefix(oldPrefix: string, newPrefix: string) {
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
	public getResourceLabel(subjectUri: string): string {
		// TODO: Fix #10 in mentor-rdf; Refactor node identifiers to be node instances instead of strings.
		const subject = subjectUri.includes(':') ? new n3.NamedNode(subjectUri) : new n3.BlankNode(subjectUri);

		// TODO: Add config option to enable/disable SHACL path labels.
		// If the node has a SHACL path, use it as the label.
		for (let q of mentor.store.match(this.graphs, subject, sh.path, null, false)) {
			return this.getPropertyPathLabel(q.object as n3.Quad_Subject);
		}

		const treeLabelStyle = mentor.settings.get<TreeLabelStyle>('view.treeLabelStyle', TreeLabelStyle.AnnotatedLabels);

		switch (treeLabelStyle) {
			case TreeLabelStyle.AnnotatedLabels: {
				const predicates = this.predicates.label.map(p => new n3.NamedNode(p));

				// First, try to find a description in the current graph.
				for (let p of predicates) {
					for (let q of mentor.store.match(this.graphs, subject, p, null, false)) {
						if (q.object.termType === 'Literal') {
							return q.object.value;
						} else {
							return getUriLabel(q.object.value);
						}
					}
				}

				// If none is found, try to find a description in the default graph.
				for (let p of predicates) {
					for (let q of mentor.store.match(undefined, subject, p, null, false)) {
						if (q.object.termType === 'Literal') {
							return q.object.value;
						} else {
							return getUriLabel(q.object.value);
						}
					}
				}

				// Fallback to URI labels without prefixes.
				break;
			}
			case TreeLabelStyle.UriLabelsWithPrefix: {
				const namespace = getNamespaceUri(subjectUri);
				let prefix = "?";

				for (let [p] of Object.entries(this.namespaces).filter(([_, ns]) => ns == namespace)) {
					prefix = p;
					break;
				}

				return `${prefix}:${getUriLabel(subjectUri)}`;
			}
		}

		return getUriLabel(subjectUri);
	}

	/**
	 * Get a rendered version of a SHACL path as a string according to the current user preferences for label display.
	 * @param node The object of a SHACL path triple.
	 * @returns A rendered version of the SHACL path as a string.
	 */
	public getPropertyPathLabel(node: n3.Quad_Subject): string {
		let result = [];

		for (let c of mentor.vocabulary.getPropertyPathTokens(this.graphs, node)) {
			if (typeof (c) === 'string') {
				if (c === '|' || c === '/') {
					result.push(` ${c} `);
				} else {
					result.push(c);
				}
			} else {
				result.push(this.getResourceLabel(c.value));
			}
		}

		return result.join('');
	}

	/**
	 * Get the description of a resource.
	 * @param subjectUri URI of the resource.
	 * @returns A description for the resource as a string literal.
	 */
	public getResourceDescription(subjectUri: string): string | undefined {
		// Todo: Fix #10 in mentor-rdf; This is a hack: we need to return nodes from the Mentor RDF API instead of strings.
		const subject = subjectUri.includes(':') ? new n3.NamedNode(subjectUri) : new n3.BlankNode(subjectUri);
		const predicates = this.predicates.description.map(p => new n3.NamedNode(p));

		// First, try to find a description in the current graph.
		for (let p of predicates) {
			for (let q of mentor.store.match(this.graphs, subject, p, null, false)) {
				return q.object.value;
			}
		}

		// If none is found, try to find a description in the default graph.
		for (let p of predicates) {
			for (let q of mentor.store.match(undefined, subject, p, null, false)) {
				return q.object.value;
			}
		}
	}

	/**
	 * Get the URI of a resource. Resolves relative file URIs with regards to the directory of the current document.
	 * @param subjectUri URI of the resource.
	 * @returns A URI for the resource as a string literal.
	 */
	public getResourceUri(subjectUri: string): string {
		if (subjectUri.startsWith('file')) {
			const u = new URL(subjectUri);

			// Resolve relative file URIs with regards to the directory of the current document.
			if (u.hostname == '..') {
				// For a file URI the namespace is the directory of the current document.
				const directory = getNamespaceUri(this.uri.toString());
				const filePath = subjectUri.split('//')[1];
				const fileUrl = url.resolve(directory, filePath);

				// Allow navigating to the relative file.
				return '[' + filePath + '](' + fileUrl + ')';
			}
		}

		return subjectUri;
	}

	/**
	 * Get the tooltip for a resource.
	 * @param subjectUri URI of the resource.
	 * @returns A markdown string containing the label, description and URI of the resource.
	 */
	public getResourceTooltip(subjectUri: string): vscode.MarkdownString {
		let lines = [
			`**${this.getResourceLabel(subjectUri)}**`,
			this.getResourceDescription(subjectUri),
			this.getResourceUri(subjectUri)
		];

		return new vscode.MarkdownString(lines.filter(line => line).join('\n\n'), true);
	}
}