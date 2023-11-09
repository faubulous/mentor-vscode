/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	Range
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { IToken, ISemanticError, TurtleParser } from 'millan';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);

	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);

	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};

	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}

	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}

	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

interface ParserSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ParserSettings = { maxNumberOfProblems: 1000 };

let globalSettings: ParserSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ParserSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ParserSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ParserSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}

	let result = documentSettings.get(resource);

	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'mentor.config.languageServer'
		});

		documentSettings.set(resource, result);
	}

	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

function getLexDiagnostics(document: TextDocument, tokens: IToken[]) {
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

function getParseDiagnostics(document: TextDocument, errors: ISemanticError[]) {
	const content = document.getText();

	return errors.map(
		(error): Diagnostic => {
			const { message, context, token } = error;

			const ruleStack = context ? context.ruleStack : null;
			const source =
				ruleStack && ruleStack.length > 0
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

async function validateTextDocument(document: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(document.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const { uri } = document;
	const content = document.getText();

	if (!content.length) {
		connection.sendDiagnostics({ uri, diagnostics: [] });
		return;
	}

	const parser = new TurtleParser();

	const { cst, errors } = parser.parse(content, 'standard');
	const tokens = parser.input;

	const lexDiagnostics = getLexDiagnostics(document, tokens);
	const parseDiagnostics = getParseDiagnostics(document, errors);

	return connection.sendDiagnostics({ uri, diagnostics: [...lexDiagnostics, ...parseDiagnostics] });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
