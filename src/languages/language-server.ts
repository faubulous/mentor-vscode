import {
	Connection,
	Diagnostic,
	DidChangeConfigurationNotification,
	ProposedFeatures,
	InitializeParams,
	InitializeResult,
	TextDocuments,
	TextDocumentSyncKind,
	TextDocumentChangeEvent,
	createConnection,
	DiagnosticSeverity,
	Range,
	DidChangeWatchedFilesParams,
	DidChangeConfigurationParams,
	PublishDiagnosticsParams
} from 'vscode-languageserver/node';
import { TokenizerResult, XSD } from '@faubulous/mentor-rdf';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ISemanticError, IToken } from 'millan';
import { NamespaceMap, getUnquotedLiteralValue, getNamespaceDefinition, getUriFromToken } from '../utilities';

/**
 * Validation results for a text document.
 */
export interface ValidationResults extends PublishDiagnosticsParams {
	/**
	 * Tokens produced by the parser.
	 */
	tokens?: IToken[];
}

/**
 * Parser settings for a text document.
 */
interface ParserSettings {
	/**
	 * The maximum number of problems to report.
	 */
	maxNumberOfProblems: number;
}

/**
 * Default parser settings.
 */
const defaultSettings: ParserSettings = {
	maxNumberOfProblems: 1000
};

export abstract class LanguageServerBase {
	readonly languageName: string;

	readonly languageId: string;

	readonly connection: Connection;

	readonly documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

	hasConfigurationCapability = false;

	hasWorkspaceFolderCapability = false;

	hasDiagnosticRelatedInformationCapability = false;

	globalSettings: ParserSettings = defaultSettings;

	readonly documentSettings: Map<string, Thenable<ParserSettings>> = new Map();

	constructor(langaugeId: string, languageName: string) {
		this.languageName = languageName;
		this.languageId = langaugeId;

		this.connection = createConnection(ProposedFeatures.all);
		this.connection.onInitialize(this.onInitializeConnection.bind(this));
		this.connection.onInitialized(this.onConnectionInitialized.bind(this));
		this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this));

		this.documents.onDidClose(this.onDidClose.bind(this));
		this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
	}

	protected log(message: string) {
		const msg = `[Server(${process.pid})] ${message}`;

		if (this.connection.console) {
			this.connection.console.log(msg);
		} else {
			console.log(msg);
		}
	}

	start() {
		this.documents.listen(this.connection);

		this.connection.listen();

		this.log(`Started ${this.languageName} Language Server.`);
	}

	protected onInitializeConnection(params: InitializeParams) {
		const capabilities = params.capabilities;

		// Does the client support the `workspace/configuration` request?
		// If not, we fall back using global settings.
		this.hasConfigurationCapability = !!(
			capabilities.workspace && !!capabilities.workspace.configuration
		);

		this.hasWorkspaceFolderCapability = !!(
			capabilities.workspace && !!capabilities.workspace.workspaceFolders
		);

		this.hasDiagnosticRelatedInformationCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.publishDiagnostics &&
			capabilities.textDocument.publishDiagnostics.relatedInformation
		);

		const result: InitializeResult = {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental
			}
		};

		if (this.hasWorkspaceFolderCapability) {
			result.capabilities.workspace = {
				workspaceFolders: {
					supported: true
				}
			};
		}

		return result;
	}

	protected onConnectionInitialized() {
		if (this.hasConfigurationCapability) {
			// Register for all configuration changes.
			this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
		}

		if (this.hasWorkspaceFolderCapability) {
			this.connection.workspace.onDidChangeWorkspaceFolders(_event => {
				this.log('Workspace folder change event received.');
			});
		}
	}

	protected onDidChangeConfiguration(change: DidChangeConfigurationParams) {
		this.log(`Configuration changed.`);

		if (this.hasConfigurationCapability) {
			// Reset all cached document settings.
			this.documentSettings.clear();
		} else {
			this.globalSettings = <ParserSettings>((change.settings.languageServerExample || defaultSettings));
		}

		// Revalidate all open text documents.
		this.documents.all().forEach(this.validateTextDocument);
	}

	protected onDidChangeWatchedFiles(change: DidChangeWatchedFilesParams) {
		this.log(`Watched files changed.`);
	}

	protected onDidClose(e: TextDocumentChangeEvent<TextDocument>) {
		// Only keep settings for open documents.
		this.documentSettings.delete(e.document.uri);
	}

	protected onDidChangeContent(change: TextDocumentChangeEvent<TextDocument>) {
		// The content of a text document has changed. This event is emitted
		// when the text document first opened or when its content has changed.
		this.validateTextDocument(change.document);
	}

	protected abstract parse(content: string): Promise<TokenizerResult>;

	async validateTextDocument(document: TextDocument): Promise<ValidationResults> {
		// The conncetion may not yet be initialized.
		if (!this?.connection) {
			return {
				uri: document.uri,
				diagnostics: [],
				tokens: []
			};
		}

		this.log(`Validating document: ${document.uri}`);

		// In this simple example we get the settings for every validate run.
		// const settings = await this._getDocumentSettings(document.uri);
		let diagnostics: Diagnostic[] = [];
		let tokens: IToken[] = [];

		const content = document.getText();

		if (content.length) {
			try {
				// Validating the document for errors requires fully parsing it, including building the CST.
				// Since this is a potentially expensive operation, we only do it in the language server and
				// send the result to the client to not block the UI..
				const result = await this.parse(content);

				tokens = result.tokens;

				diagnostics = [
					...this.getLexDiagnostics(document, result.tokens),
					...this.getParseDiagnostics(document, result.syntaxErrors.concat(result.semanticErrors)),
					...this.getLintDiagnostics(document, content, result.tokens)
				];
			}
			catch (e) {
				diagnostics = [
					{
						severity: DiagnosticSeverity.Error,
						message: e ? e.toString() : "An error occurred while parsing the document.",
						range: Range.create(0, 0, 0, 0)
					}
				];
			}
		}

		// Send the computed diagnostics to the client.
		this.connection.sendDiagnostics({ uri: document.uri, diagnostics });

		// This function returns the result to the derived class, which can then perform additional actions.
		return {
			uri: document.uri,
			diagnostics: diagnostics,
			tokens: tokens
		};
	}

	protected getLexDiagnostics(document: TextDocument, tokens: IToken[]) {
		return tokens
			.filter((t) => t?.tokenType?.tokenName === 'Unknown')
			.map(
				(unknownToken): Diagnostic => ({
					severity: DiagnosticSeverity.Error,
					message: `Unknown token`,
					range: {
						start: document.positionAt(unknownToken.startOffset),
						end: document.positionAt((unknownToken.endOffset ?? unknownToken.startOffset) + 1),
					},
				})
			);
	}

	protected getParseDiagnostics(document: TextDocument, errors: ISemanticError[]) {
		const content = document.getText();

		return errors.map(
			(error): Diagnostic => {
				const { message, name, context, token } = error;

				const ruleStack = context ? context.ruleStack : null;
				const source = ruleStack && ruleStack.length > 0
					? ruleStack[ruleStack.length - 1]
					: undefined;

				const constructedDiagnostic: Partial<Diagnostic> = {
					code: name,
					message,
					source,
					severity: DiagnosticSeverity.Error,
				};

				if (token.tokenType?.tokenName !== 'EOF') {
					constructedDiagnostic.range = Range.create(
						document.positionAt(token.startOffset),
						document.positionAt((token.endOffset ?? token.startOffset) + 1)
					);
				} else {
					const { previousToken = {} } = error as any; // chevrotain doesn't have this typed fully, but it exists for early exit exceptions

					let rangeStart;
					let rangeEnd;

					if (typeof previousToken.endOffset !== 'undefined') {
						rangeStart = Math.min(previousToken.endOffset + 1, content.length);
						rangeEnd = Math.min(previousToken.endOffset + 2, content.length);
					} else {
						rangeStart = rangeEnd = content.length;
					}

					constructedDiagnostic.range = Range.create(
						document.positionAt(rangeStart),
						document.positionAt(rangeEnd)
					);
				}

				return constructedDiagnostic as Diagnostic;
			}
		);
	}

	protected getLintDiagnostics(document: TextDocument, content: string, tokens: IToken[]): Diagnostic[] {
		let result: Diagnostic[] = [];
		let namespaces: NamespaceMap = {};

		for (let i = 0; i < tokens.length; i++) {
			const t = tokens[i];
			const type = t.tokenType?.tokenName;

			if (!type || type === 'Unknown') {
				continue;
			}

			switch (type) {
				case 'PREFIX':
				case 'TTL_PREFIX': {
					const ns = getNamespaceDefinition(tokens, t);

					if (ns) {
						namespaces[ns.prefix] = ns.uri;

						const u = tokens[i + 2];

						if (ns.uri == '') {
							result.push({
								severity: DiagnosticSeverity.Error,
								message: `Invalid namespace URI.`,
								range: {
									start: document.positionAt(u.startOffset),
									end: document.positionAt(u.endOffset ?? 0)
								}
							});
						}
						else if (!ns.uri.endsWith('/') && !ns.uri.endsWith('#')) {
							result.push({
								severity: DiagnosticSeverity.Warning,
								message: `An RDF namespace URI should end with a '/', '#', '=' or ':' character.`,
								range: {
									start: document.positionAt(u.startOffset),
									end: document.positionAt(u.endOffset ?? 0)
								}
							});
						}
					}

					break;
				}
				case 'DoubleCaret':
					if (i > (tokens.length - 2)) {
						// We do not flag a linter error because this is a 
						// syntax error which should be covered by the parser.
						continue;
					}

					let value = tokens[i - 1];
					let datatype = getUriFromToken(namespaces, tokens[i + 1]);

					switch (datatype) {
						case XSD.anyURI: {
							// See: https://www.w3.org/TR/xmlschema-2/#anyURI
							const regex = /(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

							if (!regex.test(getUnquotedLiteralValue(value))) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the valid lexical space: [scheme:]scheme-specific-part[#fragment]",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.base64Binary: {
							// See: https://www.w3.org/TR/xmlschema-2/#hexBinary
							const regex = /[0-9a-fA-F]+/;

							if (!regex.test(getUnquotedLiteralValue(value))) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the valid lexical space: [0-9a-fA-F]+",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.boolean: {
							// See: https://www.w3.org/TR/xmlschema-2/#boolean
							const v = getUnquotedLiteralValue(value);

							if (v !== 'true' && v !== 'false') {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid boolean: true or false.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.byte: {
							// See: https://www.w3.org/TR/xmlschema-2/#byte
							const regex = /-?0*[0-9]+/;

							if (!regex.test(getUnquotedLiteralValue(value))) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the valid lexical space: [-]0*[0-9]+",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.date: {
							// See: https://www.w3.org/TR/xmlschema-2/#date
							const regex = /(-)?\d{4}-\d{2}-\d{2}(Z|[+-]\d{2}:\d{2})?$/;

							if (!regex.test(getUnquotedLiteralValue(value))) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the valid lexical space: [-]YYYY-MM-DD[Z|(+|-)hh:mm]",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.dateTime: {
							// See: https://www.w3.org/TR/xmlschema-2/#dateTime
							const regex = /-?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

							if (!regex.test(getUnquotedLiteralValue(value))) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the valid the lexical space: [-]YYYY-MM-DDThh:mm:ss[Z|(+|-)hh:mm]",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.decimal: {
							// See: https://www.w3.org/TR/xmlschema-2/#decimal
							const n = parseFloat(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid decimal.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.double: {
							// See: https://www.w3.org/TR/xmlschema-2/#double
							const n = parseFloat(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid double.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.duration: {
							// See: https://www.w3.org/TR/xmlschema-2/#duration
							const regex = /(-)?P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

							if (!regex.test(getUnquotedLiteralValue(value))) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the valid lexical space: PnYnMnDTnHnMnS",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.float: {
							// See: https://www.w3.org/TR/xmlschema-2/#float
							const n = parseFloat(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid float.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.int: {
							// See: https://www.w3.org/TR/xmlschema-2/#int
							const n = parseInt(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid integer.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}

							if (n < -2147483648 || n > 2147483647) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the allowed value space: [-2147483648, 2147483647]",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.integer: {
							// See: https://www.w3.org/TR/xmlschema-2/#integer
							const n = parseInt(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid integer.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.long: {
							// See: https://www.w3.org/TR/xmlschema-2/#long
							const n = parseInt(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid long.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}

							if (n < -9223372036854775808 || n > 9223372036854775807) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the allowed value space: [-9223372036854775808, 9223372036854775807]",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.negativeInteger: {
							// See: https://www.w3.org/TR/xmlschema-2/#negativeInteger
							const n = parseInt(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid negative integer.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}

							if (n >= 0) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the allowed value space: < 0",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.nonNegativeInteger: {
							// See: https://www.w3.org/TR/xmlschema-2/#nonNegativeInteger
							const n = parseInt(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid non-negative integer.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}

							if (n < 0) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the allowed value space: >= 0",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.nonPositiveInteger: {
							// See: https://www.w3.org/TR/xmlschema-2/#nonPositiveInteger
							const n = parseInt(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid non-positive integer.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}

							if (n > 0) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the allowed value space: <= 0",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.positiveInteger: {
							// See: https://www.w3.org/TR/xmlschema-2/#positiveInteger
							const n = parseInt(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid positive integer.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}

							if (n <= 0) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the allowed value space: > 0",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.short: {
							// See: https://www.w3.org/TR/xmlschema-2/#short
							const n = parseInt(getUnquotedLiteralValue(value));

							if (isNaN(n)) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is not a valid short.",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}

							if (n < -32768 || n > 32767) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside the allowed value space: [-32768, 32767]",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
						case XSD.time: {
							// See: https://www.w3.org/TR/xmlschema-2/#time
							const regex = /\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})/;

							if (!regex.test(getUnquotedLiteralValue(value))) {
								result.push({
									severity: DiagnosticSeverity.Warning,
									message: "The value is outside valid the lexical space: hh:mm:ss[Z|(+|-)hh:mm].",
									range: {
										start: document.positionAt(value.startOffset),
										end: document.positionAt((value.endOffset ?? 0) + 1)
									}
								});
							}
							break;
						}
					}

					break;
			}
		}

		return result;
	}
}
