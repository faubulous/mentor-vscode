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
	TextDocumentPositionParams,
	CompletionItem,
	Location,
	Definition,
	DefinitionParams
} from 'vscode-languageserver/node';
import { TokenizerResult } from '@faubulous/mentor-rdf';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ISemanticError, IToken } from 'millan';

interface ParserSettings {
	maxNumberOfProblems: number;
}

const defaultSettings: ParserSettings = { maxNumberOfProblems: 1000 };

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
		this.connection.onCompletion(this.onCompletion.bind(this));
		this.connection.onCompletionResolve(this.onCompletionResolve.bind(this));
		this.connection.onDefinition(this.onDefinition.bind(this));

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
				textDocumentSync: TextDocumentSyncKind.Incremental,
				// This server supports 'go to definition' commands.
				definitionProvider: true,
				// This server supports code completion.
				completionProvider: {
					resolveProvider: true
				}
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

	protected onDefinition(definitionParams: DefinitionParams): Definition {
		return Location.create(definitionParams.textDocument.uri, {
			start: { line: 0, character: 0 },
			end: { line: 0, character: 1 }
		});
	};

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

	/**
	 * Event handler that provides the initial list of the completion items.
	 * @param _textDocumentPosition 
	 */
	protected abstract onCompletion(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[];

	/**
	 * Event handler that resolvesd additional information for the item selected 
	 * in the completion list.
	 */
	protected onCompletionResolve(item: CompletionItem): CompletionItem {
		return item;
	}

	protected abstract parse(content: string): Promise<TokenizerResult>;

	async validateTextDocument(document: TextDocument): Promise<void> {
		// The conncetion may not yet be initialized.
		if (!this.connection) return;

		this.log(`Validating document: ${document.uri}`);

		// In this simple example we get the settings for every validate run.
		// const settings = await this._getDocumentSettings(document.uri);

		let diagnostics: Diagnostic[] = [];

		const content = document.getText();

		if (content.length) {
			const { tokens, syntaxErrors, semanticErrors } = await this.parse(content);

			diagnostics = [
				...this.getLexDiagnostics(document, tokens),
				...this.getParseDiagnostics(document, syntaxErrors.concat(semanticErrors))
			];
		}

		return this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
	}

	protected getLexDiagnostics(document: TextDocument, tokens: IToken[]) {
		return tokens
			.filter((res) => res?.tokenType?.tokenName === 'Unknown')
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
				const { message, context, token } = error;

				const ruleStack = context ? context.ruleStack : null;
				const source = ruleStack && ruleStack.length > 0
					? ruleStack[ruleStack.length - 1]
					: undefined;

				const constructedDiagnostic: Partial<Diagnostic> = {
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
}