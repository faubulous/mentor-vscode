import { IParser, ILexer, IToken, IRecognitionException, createFileBlankNodeIdGenerator } from '@faubulous/mentor-rdf-parsers';
import {
	Connection,
	Diagnostic,
	DiagnosticSeverity,
	DidChangeConfigurationNotification,
	DidChangeConfigurationParams,
	DidChangeWatchedFilesParams,
	InitializeParams,
	InitializeResult,
	PublishDiagnosticsParams,
	Range,
	TextDocumentChangeEvent,
	TextDocuments,
	TextDocumentSyncKind
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LintDiagnosticsContext } from './linter-context';
import { Linter } from './linter';
import {
	DeprecatedWorkspaceUriLinter,
	InlineSingleUseBlankNodesLinter,
	NamespacePrefixLinter,
	XsdAnyUriLiteralLinter,
	XsdDatatypeValidationLinter,
} from './linters';
import {
	getNamespaceDefinition,
	PrefixMap,
} from '@src/utilities';

/**
 * The result of tokenizing a text document.
 */
export interface TokenizationResults {
	errors: IRecognitionException[];
	tokens: IToken[];
}

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

export class LanguageServerBase {
	readonly languageName: string;

	readonly languageId: string;

	readonly connection: Connection;

	readonly documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

	readonly documentSettings: Map<string, Thenable<ParserSettings>> = new Map();

	hasConfigurationCapability = false;

	hasWorkspaceFolderCapability = false;

	hasDiagnosticRelatedInformationCapability = false;

	globalSettings: ParserSettings = defaultSettings;

	/**
	 * Indicates whether the language server should provide tokens for the document to the client via 'mentor.message.updateContext'.
	 */
	isRdfTokenProvider = false;

	/**
	 * The lexer used to tokenize the document. This is used to provide lexing diagnostics, but not for validating the document for errors, since that requires fully parsing it.
	 */
	lexer?: ILexer;

	/**
	 * The parser used to tokenize and validate the document.
	 */
	parser?: IParser;

	/**
	 * Pluggable lint rules that produce additional diagnostics from parsed tokens.
	 */
	readonly linters: Linter[] = [
		new DeprecatedWorkspaceUriLinter(),
		new InlineSingleUseBlankNodesLinter(),
		new NamespacePrefixLinter(),
		new XsdAnyUriLiteralLinter(),
		new XsdDatatypeValidationLinter(),
	];

	constructor(connection: Connection, langaugeId: string, languageName: string, lexer?: ILexer, parser?: IParser, isRdfTokenProvider = false) {
		this.languageName = languageName;
		this.languageId = langaugeId;
		this.lexer = lexer;
		this.parser = parser;
		this.isRdfTokenProvider = isRdfTokenProvider;

		this.connection = connection;
		this.connection.onInitialize(this.onInitializeConnection.bind(this));
		this.connection.onInitialized(this.onConnectionInitialized.bind(this));
		this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this));

		this.documents.onDidClose(this.onDidClose.bind(this));
		this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
	}

	protected log(message: string) {
		const msg = `[Server] ${message}`;

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
		this.documents.all().forEach(doc => this.validateTextDocument(doc));
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

	/**
	 * Parses the content of a document and returns any recognition exceptions that 
	 * were thrown during parsing, which include both lexing and parsing errors. Note 
	 * that this requires fully parsing the document, including building the CST, 
	 * which can be a potentially expensive operation for large documents. Therefore, 
	 * we only do this in the language server and send the result to the client to not block the UI.
	 * @param content 
	 * @returns 
	 */
	protected async parse(content: string, uri?: string): Promise<TokenizationResults> {
		if (!this.lexer || !this.parser) {
			throw new Error('Lexer and parser are required for tokenization.');
		}

		if (uri) {
			this.lexer.blankNodeIdGenerator = createFileBlankNodeIdGenerator(uri);
		}

		const lexResult = this.lexer.tokenize(content);

		this.parser.parse(lexResult.tokens, false);

		return {
			tokens: lexResult.tokens,
			errors: [
				...this.parser.errors,
				...this.parser.semanticErrors
			],
		};
	}

	async validateTextDocument(document: TextDocument): Promise<void> {
		// The connection may not yet be initialized.
		if (!this?.connection) {
			return;
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
				const result = await this.parse(content, document.uri);

				tokens = result.tokens;

				diagnostics = [
					...this.getLexDiagnostics(document, result.tokens),
					...this.getParseDiagnostics(document, result.errors),
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

		// Always send token notification to unblock the client, even for empty files or parsing errors.
		// The client needs this to resolve pending token requests and avoid timeout errors.
		if (this.isRdfTokenProvider) {
			// This sends the tokens to the client so that they can be used to build a reference index.
			this.connection.sendNotification('mentor.message.updateContext', {
				uri: document.uri,
				languageId: this.languageId,
				// Important: We need to clone the tokens so that they can be processed by strucutredClone() of the underlying message channel.
				tokens: tokens.map(t => ({
					image: t.image,
					startOffset: t.startOffset,
					endOffset: t.endOffset,
					startLine: t.startLine,
					endLine: t.endLine,
					startColumn: t.startColumn,
					endColumn: t.endColumn,
					tokenTypeIdx: t.tokenTypeIdx,
					tokenType: {
						name: t.tokenType?.name ?? '',
						tokenName: t.tokenType?.name,
						GROUP: t.tokenType?.GROUP,
					},
					// TODO: Define the interface / or clone method in mentor-rdf and use this token interface instead of the Chevrotain IToken to avoid having to clone the tokens here. --- IGNORE ---
					payload: {
						...t.payload
					}
				}))
			});
		}
	}

	protected getLexDiagnostics(document: TextDocument, tokens: IToken[]) {
		return tokens
			.filter((t) => t?.tokenType?.name === 'Unknown')
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

	protected getParseDiagnostics(document: TextDocument, errors: IRecognitionException[]) {
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

				if (token.tokenType?.name !== 'EOF') {
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
		const prefixes: PrefixMap = {};
		const context: LintDiagnosticsContext = { document, content, tokens, prefixes };
		const result: Diagnostic[] = [];

		for (const linter of this.linters) {
			linter.reset?.();
		}

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			const type = token.tokenType?.name;

			// Keep the shared prefix map current so IRI-resolving providers see up-to-date prefixes.
			if (type === 'PREFIX' || type === 'TTL_PREFIX') {
				const ns = getNamespaceDefinition(tokens, token);

				if (ns) {
					prefixes[ns.prefix] = ns.uri;
				}
			}

			for (const linter of this.linters) {
				result.push(...linter.visitToken(context, token, i));
			}
		}

		for (const linter of this.linters) {
			result.push(...(linter.finalize?.(context) ?? []));
		}

		return result;
	}
}
