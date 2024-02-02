import * as n3 from 'n3';
import * as vscode from 'vscode';
import * as mentor from './mentor';
import { RdfSyntax, Tokenizer, TokenizerResult, rdf } from '@faubulous/mentor-rdf';
import { IToken } from 'millan';
import { getNamespaceUri } from './utilities';
import { integer } from 'vscode-languageclient';

interface TokenPosition {
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}

export class DocumentContext {
	/**
	 * The graphs in the triple store associated with the document.
	 */
	readonly graphs: string[] = [];

	/**
	 * The document.
	 */
	readonly document: vscode.TextDocument;

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

	public static canLoad(document: vscode.TextDocument): boolean {
		return document && (this._isSupportedGraphLanguage(document.languageId) || this._isSupportedQueryLanguage(document.languageId));
	}

	private static _isSupportedGraphLanguage(languageId: string): boolean {
		switch (languageId) {
			case 'ntriples':
			case 'nquads':
			case 'turtle':
			case 'trig':
				return true;
			default:
				return false;
		}
	}

	private static _isSupportedQueryLanguage(languageId: string): boolean {
		switch (languageId) {
			case 'sparql':
				return true;
			default:
				return false;
		}
	}

	public async load(document: vscode.TextDocument): Promise<void> {
		if (!DocumentContext.canLoad(document)) {
			return;
		}

		// Parse the tokens *before* parsing the graph because the graph parsing might fail but we need to update the tokens.
		await this._parseTokens(document);

		try {
			await this._parseGraph(document);
		}
		catch (e) {
			console.error(e);
		}
	}

	private async _parseGraph(document: vscode.TextDocument): Promise<void> {
		if (DocumentContext._isSupportedGraphLanguage(document.languageId)) {
			const uri = document.uri.toString();

			// Initilaize the graphs *before* trying to load the document so 
			// that they are initialized even when loading the document fails.
			this.graphs.length = 0;
			this.graphs.push(...mentor.store.getContextGraphs(uri, true));

			// The loadFromStream function only updates the existing graphs 
			// when the document was parsed successfully.
			await mentor.store.loadFromStream(document.getText(), uri);
		}
	}

	private async _parseTokens(document: vscode.TextDocument): Promise<void> {
		const data = document.getText();
		let result: TokenizerResult;

		if (DocumentContext._isSupportedQueryLanguage(document.languageId)) {
			result = await Tokenizer.parseData(data, RdfSyntax.Sparql);
		} else {
			result = await Tokenizer.parseData(data, RdfSyntax.TriG);
		}

		this.tokens.length = 0;
		this.tokens.push(...result.tokens);

		result.tokens.forEach((t: IToken, i: integer) => {
			switch (t.tokenType?.tokenName) {
				case 'PNAME_NS': {
					const prefix = t.image.substring(0, t.image.length - 1);
					const uri = this.getUriFromToken(result.tokens[i + 1]);

					if (!uri) {
						break;
					}

					const previousType = this.getPreviousToken(t)?.tokenType?.tokenName;

					// Only set the namespace if it is preceeded by a prefix keyword.
					if (previousType == "PREFIX" || previousType == "TTL_PREFIX") {
						this.namespaces[prefix] = uri;
						this.namespaceDefinitions[uri] = t;
					}
					break;
				}
				case 'PNAME_LN': {
					const uri = this.getUriFromPrefixedName(t.image);

					if (!uri) break;

					this._handleTypeAssertion(result, t, uri, i);
					this._handleUriReference(result, t, uri);
					break;
				}
				case 'IRIREF': {
					const uri = this.getUriFromIriReference(t.image);

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

		const u = this.getUriFromToken(s);

		if (!u) return;

		this.typeAssertions[u] = [s];
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

		const n = subjectUri.lastIndexOf('#');

		if (n > -1) {
			return subjectUri.substring(n + 1);
		} else {
			return subjectUri.substring(subjectUri.lastIndexOf('/') + 1);
		}
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

	/**
	 * Get the location of a token in a document.
	 * @param token A token.
	 */
	public getLocationFromToken(token: IToken) {
		const startLine = token.startLine ? token.startLine - 1 : 0;
		const startCharacter = token.startColumn ? token.startColumn - 1 : 0;
		const endLine = token.endLine ? token.endLine - 1 : 0;
		const endCharacter = token.endColumn ?? 0;

		const range = new vscode.Range(startLine, startCharacter, endLine, endCharacter);

		return new vscode.Location(this.document.uri, range);
	}

	/**
	 * Gets all tokens at a given position.
	 * @param position A position in the document.
	 * @returns An non-empty array of tokens on success, an empty array otherwise.
	 */
	public getTokensAtPosition(position: vscode.Position): IToken[] {
		// The tokens are 0-based, but the position is 1-based.
		const l = position.line + 1;
		const n = position.character + 1;

		return this.tokens.filter(t =>
			t.startLine &&
			t.startLine <= l &&
			t.endLine &&
			t.endLine >= l &&
			t.startColumn &&
			t.startColumn <= n &&
			t.endColumn &&
			t.endColumn >= (n - 1)
		);
	}

	/**
	 * Gets the position of a token in a document.
	 * @param token A token.
	 * @returns The position of the token.
	 */
	public getTokenPosition(token: IToken): TokenPosition {
		return {
			startLine: token.startLine ? token.startLine - 1 : 0,
			startColumn: token.startColumn ? token.startColumn - 1 : 0,
			endLine: token.endLine ? token.endLine - 1 : 0,
			endColumn: token.endColumn ? token.endColumn : 0
		};
	}

	/**
	 * Indicates whether the token is a variable.
	 * @param token A token.
	 * @returns true if the token is a variable, false otherwise.
	 */
	public isVariable(token: IToken) {
		const tokenType = token.tokenType?.tokenName;

		return tokenType === "VAR1";
	}

	/**
	 * Indicates whether the cursor position is on a namespace prefix
	 * @param token A token.
	 * @param position The position of the cursor.
	 * @returns true if the cursor is on the prefix of the token, false otherwise.
	 */
	public isCursorOnPrefix(token: IToken, position: vscode.Position) {
		const tokenType = token.tokenType?.tokenName;
		const p = this.getTokenPosition(token);

		switch (tokenType) {
			case "PNAME_NS":
			case "PNAME_LN": {
				const i = token.image.indexOf(":");
				const n = position.character - p.startColumn;

				return n <= i;
			}
			default: {
				return false;
			}
		}
	}

	/**
	 * Gets the range of a token that contains an editable prefix.
	 * @param token A token.
	 * @returns The range of the prefix.
	 */
	public getPrefixEditRange(token: IToken) {
		const tokenType = token.tokenType?.tokenName;
		const p = this.getTokenPosition(token);

		switch (tokenType) {
			case "PNAME_NS":
			case "PNAME_LN": {
				const i = token.image.indexOf(":");

				return new vscode.Range(
					new vscode.Position(p.startLine, p.startColumn),
					new vscode.Position(p.startLine, p.startColumn + i)
				);
			}
			default: {
				return null;
			}
		}
	}

	/**
	 * Get the prefix name from a prefixed name token.
	 */
	public getPrefixFromToken(token: IToken): string {
		if (token.tokenType?.tokenName === 'PNAME_LN') {
			return token.image.split(':')[0];
		} else {
			throw new Error("Cannot get prefix from token type: " + token.tokenType?.tokenName);
		}
	}

	/**
	 * Get the URI from IRI or prefixed name tokens.
	 * @param token A token.
	 * @returns A URI or undefined.
	 */
	public getUriFromToken(token: IToken): string | undefined {
		if (token.tokenType?.tokenName === 'IRIREF') {
			return this.getUriFromIriReference(token.image);
		} else if (token.tokenType?.tokenName === 'PNAME_LN') {
			return this.getUriFromPrefixedName(token.image);
		}
	}

	/**
	 * Get the URI from an IRI reference.
	 * @param value A URI reference.
	 * @returns A URI string wihout angle brackets.
	 */
	public getUriFromIriReference(value: string): string {
		const v = value.trim();

		if (v.length > 2 && v.startsWith('<') && v.endsWith('>')) {
			return v.substring(1, v.length - 1);
		} else {
			return v;
		}
	}

	/*
	 * Get the URI from a prefixed name.
	 * @param name A prefixed name.
	 * @returns A URI string.
	 */
	public getUriFromPrefixedName(name: string): string | undefined {
		const parts = name.split(':');

		if (parts.length == 2) {
			const prefix = parts[0];
			const label = parts[1];

			if (this.namespaces[prefix]) {
				return this.namespaces[prefix] + label;
			}
		}
	}

	/*
	 * Get the URI from a prefixed name.
	 * @param name A prefixed name.
	 * @returns A URI string.
	 */
	public getNamespaceUriFromPrefixedName(name: string): string | undefined {
		const parts = name.split(':');

		if (parts.length == 2) {
			const prefix = parts[0];

			return this.namespaces[prefix];
		}
	}

	/**
	 * Get the previous token.
	 * @param token A token.
	 * @returns The previous token or undefined.
	 */
	public getPreviousToken(token: IToken): IToken | undefined {
		const index = this.tokens.indexOf(token);

		if (index > 0) {
			return this.tokens[index - 1];
		}
	}

	public getCurrentTripleComponent(token: IToken): "subject" | "predicate" | "object" | undefined {
		const p = this.getPreviousToken(token);

		if (!p) {
			// If there is no previous token, we are at the beginning of the document.
			// It must either be followed by a prefix declaration or a subject.
			return "subject";
		}

		switch (p.tokenType?.tokenName) {
			case "Period":
			case "Dot": {
				// A dot is always followed by a subject.
				return "subject";
			}
			case "Semicolon": {
				// A semicolon is always followed by a predicate.
				return "predicate";
			}
			case "A": {
				// A type assertion is always followed by an object.
				return "object";
			}
			case "PNAME_LN":
			case "IRIREF": {
				// This could either be a predicate or an object.
				const q = this.getPreviousToken(p);

				switch (q?.tokenType?.tokenName) {
					case "Semicolon":
					case "LBracket":
					case "PNAME_LN":
					case "IRIREF": {
						return "object";
					}
					case "Period":
					case "Dot": {
						return "predicate";
					}
				}
			}
		}
	}

	/**
	 * Gets the range of a token that contains an editable resource label.
	 * @param token A token.
	 * @returns The range of the label.
	 */
	public getLabelEditRange(token: IToken) {
		const tokenType = token.tokenType?.tokenName;
		const p = this.getTokenPosition(token);

		switch (tokenType) {
			case "PNAME_LN": {
				const i = token.image.indexOf(":");

				return new vscode.Range(
					new vscode.Position(p.startLine, p.startColumn + i + 1),
					new vscode.Position(p.endLine, p.endColumn)
				);
			}
			case "IRIREF": {
				let uri = token.image.trim();
				uri = uri.substring(1, uri.length - 1)

				const namespace = getNamespaceUri(uri);
				const label = uri.substring(namespace.length);

				const i = token.image.indexOf(label);

				return new vscode.Range(
					new vscode.Position(p.startLine, p.startColumn + i),
					new vscode.Position(p.endLine, p.startColumn + i + label.length)
				);
			}
			case "VAR1": {
				return new vscode.Range(
					new vscode.Position(p.startLine, p.startColumn + 1),
					new vscode.Position(p.endLine, p.endColumn)
				);
			}
			default: {
				return null;
			}
		}
	}

	public updateNamespacePrefix(oldPrefix: string, newPrefix: string) {
		const uri = this.namespaces[oldPrefix];

		if (!uri) return;

		delete this.namespaces[oldPrefix];

		this.namespaces[newPrefix] = uri;
	}
}