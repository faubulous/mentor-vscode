import * as n3 from 'n3';
import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { TokenizerResult, rdf } from '@faubulous/mentor-rdf';
import { IToken } from 'millan';
import { getUriLabel, getUriFromIriReference, getUriFromPrefixedName, getUriFromToken, getNamespaceDefinition } from '../utilities';

export abstract class DocumentContext {
	/**
	 * The document.
	 */
	readonly document: vscode.TextDocument;

	/**
	 * The graphs in the triple store associated with the document.
	 */
	readonly graphs: string[] = [];

	/**
	 * All namespaces defined in the document.
	 */
	readonly namespaces: { [key: string]: string } = {};

	/**
	 * All tokens in the document.
	 */
	readonly tokens: IToken[] = [];

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	readonly typeAssertions: { [key: string]: IToken[] } = {};

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	readonly namespaceDefinitions: { [key: string]: IToken } = {};

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	readonly references: { [key: string]: IToken[] } = {};

	readonly predicates: {
		label: string[];
		description: string[];
	} = {
			label: [],
			description: []
		};

	constructor(document: vscode.TextDocument) {
		this.document = document;
		this.predicates.label = vscode.workspace.getConfiguration('mentor').get('predicates.label') ?? [];
		this.predicates.description = vscode.workspace.getConfiguration('mentor').get('predicates.description') ?? [];
	}

	abstract load(document: vscode.TextDocument): Promise<void>;

	protected abstract parseData(document: vscode.TextDocument): Promise<TokenizerResult>;

	protected async parseTokens(document: vscode.TextDocument): Promise<void> {
		const result = await this.parseData(document);

		this.tokens.length = 0;
		this.tokens.push(...result.tokens);

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

		const s = result.tokens[index - 1];

		if (!s) return;

		const u = getUriFromToken(this.namespaces, s);

		if (!u) return;

		this.typeAssertions[u] = [s];
	}

	public updateNamespacePrefix(oldPrefix: string, newPrefix: string) {
		const uri = this.namespaces[oldPrefix];

		if (!uri) return;

		delete this.namespaces[oldPrefix];

		this.namespaces[newPrefix] = uri;
	}

	public getResourceLabel(subjectUri: string): string {
		if (mentor.showAnnotatedLabels) {
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
		let result = this.getResourceDescription(subjectUri) ?? '';

		if (result) {
			result += '\n\n';
		}

		result += subjectUri;

		return new vscode.MarkdownString(result, true);
	}
}