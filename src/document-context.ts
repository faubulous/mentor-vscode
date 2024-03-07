import * as n3 from 'n3';
import * as vscode from 'vscode';
import * as mentor from './mentor';
import { TokenizerResult, rdf } from '@faubulous/mentor-rdf';
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

	/**
	 * All namespaces defined in the document.
	 */
	readonly namespaces: { [key: string]: string } = {};

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	readonly namespaceDefinitions: { [key: string]: IToken } = {};

	/**
	 * All tokens in the document.
	 */
	readonly tokens: IToken[] = [];

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	readonly references: { [key: string]: IToken[] } = {};

	/**
	 * Maps resource URIs to tokens of subjects that have an asserted rdf:type.
	 */
	readonly typeAssertions: { [key: string]: IToken[] } = {};

	/**
	 * Maps resource URIs to tokens of subjects that are class or property definitions.
	 */
	readonly typeDefinitions: { [key: string]: IToken[] } = {};

	readonly predicates: {
		label: string[];
		description: string[];
	} = {
			label: [],
			description: []
		};

	constructor(documentUri: vscode.Uri) {
		this.uri = documentUri;
		this.predicates.label = mentor.configuration.get('predicates.label') ?? [];
		this.predicates.description = mentor.configuration.get('predicates.description') ?? [];
	}

	/**
	 * Loads the document from the given URI and data.
	 * @param uri The file URI.
	 * @param data The file content.
	 * @param executeInference Indicates whether inference should be executed.
	 */
	async load(uri: vscode.Uri, data: string, executeInference: boolean): Promise<void> {
		this.parseTokens(data);
	}

	/**
	 * Infers new triples from the document, if not already done.
	 */
	async infer(): Promise<void> {
		// Do nothing.
	}

	protected abstract parseData(data: string): Promise<TokenizerResult>;

	protected async parseTokens(data: string): Promise<void> {
		const result = await this.parseData(data);

		this.tokens.length = 0;

		// Note: Using this.tokens.push(...result.tokens) throws an error for very large files.
		for (let t of result.tokens) {
			this.tokens.push(t);
		}

		result.tokens.forEach((t: IToken, i: number) => {
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

					this._handleTypeAssertion(result, t, uri, i);
					this._handleUriReference(result, t, uri);
					break;
				}
				case 'IRIREF': {
					const uri = getUriFromIriReference(t.image);

					this._handleTypeAssertion(result, t, uri, i);
					this._handleUriReference(result, t, uri);
					break;
				}
				case 'A': {
					this._handleTypeAssertion(result, t, rdf.type.id, i);
					this._handleTypeDefinition(result, t, rdf.type.id, i);
					break;
				}
			}
		});
	}

	private _handleUriReference(result: TokenizerResult, token: IToken, uri: string) {
		if (!this.references[uri]) {
			this.references[uri] = [];
		}

		this.references[uri].push(token);
	}

	private _handleTypeAssertion(result: TokenizerResult, token: IToken, uri: string, index: number) {
		if (uri != rdf.type.id) return;

		const subjectToken = result.tokens[index - 1];

		if (!subjectToken) return;

		const subjectUri = getUriFromToken(this.namespaces, subjectToken);

		if (!subjectUri) return;

		this.typeAssertions[subjectUri] = [subjectToken];
	}

	private _handleTypeDefinition(result: TokenizerResult, token: IToken, uri: string, index: number) {
		if (uri != rdf.type.id) return;

		const subjectToken = result.tokens[index - 1];

		if (!subjectToken) return;

		const subjectUri = getUriFromToken(this.namespaces, subjectToken);

		if (!subjectUri) return;

		const objectToken = result.tokens[index + 1];

		if (!objectToken) return;

		const objectUri = getUriFromToken(this.namespaces, objectToken);

		if (!objectUri) return;

		const namespaceUri = getNamespaceUri(objectUri);

		// Todo: Make this more explicit to reduce false positives.
		switch (namespaceUri) {
			case "http://www.w3.org/1999/02/22-rdf-syntax-ns#":
			case "http://www.w3.org/2000/01/rdf-schema#":
			case "http://www.w3.org/2002/07/owl#":
			case "http://www.w3.org/ns/shacl#":
				this.typeDefinitions[subjectUri] = [subjectToken];
		}
	}

	public updateNamespacePrefix(oldPrefix: string, newPrefix: string) {
		const uri = this.namespaces[oldPrefix];

		if (!uri) return;

		delete this.namespaces[oldPrefix];

		this.namespaces[newPrefix] = uri;
	}

	public getResourceLabel(subjectUri: string): string {
		const treeLabelStyle = mentor.settings.get<TreeLabelStyle>('view.treeLabelStyle', TreeLabelStyle.AnnotatedLabels);

		switch (treeLabelStyle) {
			case TreeLabelStyle.AnnotatedLabels: {
				const subject = new n3.NamedNode(subjectUri);
				const predicates = this.predicates.label.map(p => new n3.NamedNode(p));

				// First, try to find a description in the current graph.
				for (let p of predicates) {
					for (let q of mentor.store.match(this.graphs, subject, p)) {
						return q.object.value;
					}
				}

				// If none is found, try to find a description in the default graph.
				for (let p of predicates) {
					for (let q of mentor.store.match(undefined, subject, p)) {
						return q.object.value;
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

	public getResourceDescription(subjectUri: string): string | undefined {
		const subject = new n3.NamedNode(subjectUri);
		const predicates = this.predicates.description.map(p => new n3.NamedNode(p));

		// First, try to find a description in the current graph.
		for (let p of predicates) {
			for (let q of mentor.store.match(this.graphs, subject, p)) {
				return q.object.value;
			}
		}

		// If none is found, try to find a description in the default graph.
		for (let p of predicates) {
			for (let q of mentor.store.match(undefined, subject, p)) {
				return q.object.value;
			}
		}
	}

	public getResourceTooltip(subjectUri: string): vscode.MarkdownString {
		let lines = [
			this.getResourceLabel(subjectUri),
			this.getResourceDescription(subjectUri),
			subjectUri
		];

		return new vscode.MarkdownString(lines.filter(line => line).join('\n\n'), true);
	}
}