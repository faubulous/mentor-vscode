"use strict";
var import_node = require("vscode-languageserver/node");
var import_vscode_languageserver_textdocument = require("vscode-languageserver-textdocument");
var import_millan = require("millan");
console.log("Starting Turtle Language Server");
const connection = (0, import_node.createConnection)(import_node.ProposedFeatures.all);
const documents = new import_node.TextDocuments(import_vscode_languageserver_textdocument.TextDocument);
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
connection.onInitialize((params) => {
  const capabilities = params.capabilities;
  hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
  hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
  hasDiagnosticRelatedInformationCapability = !!(capabilities.textDocument && capabilities.textDocument.publishDiagnostics && capabilities.textDocument.publishDiagnostics.relatedInformation);
  connection.console.log(`[Server(${process.pid})] Started and initialize received`);
  const result = {
    capabilities: {
      textDocumentSync: import_node.TextDocumentSyncKind.Incremental,
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
    connection.client.register(import_node.DidChangeConfigurationNotification.type, void 0);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});
const defaultSettings = { maxNumberOfProblems: 1e3 };
let globalSettings = defaultSettings;
const documentSettings = /* @__PURE__ */ new Map();
connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = change.settings.languageServerExample || defaultSettings;
  }
  documents.all().forEach(validateTextDocument);
});
function getDocumentSettings(resource) {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "mentor.config.languageServer"
    });
    documentSettings.set(resource, result);
  }
  return result;
}
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});
function getLexDiagnostics(document, tokens) {
  return tokens.filter((res) => res?.tokenType?.tokenName === "Unknown").map(
    (unknownToken) => ({
      severity: import_node.DiagnosticSeverity.Error,
      message: `Unknown token`,
      range: {
        start: document.positionAt(unknownToken.startOffset),
        end: document.positionAt((unknownToken.endOffset ?? unknownToken.startOffset) + 1)
      }
    })
  );
}
function getParseDiagnostics(document, errors) {
  const content = document.getText();
  return errors.map(
    (error) => {
      const { message, context, token } = error;
      const ruleStack = context ? context.ruleStack : null;
      const source = ruleStack && ruleStack.length > 0 ? ruleStack[ruleStack.length - 1] : void 0;
      const constructedDiagnostic = {
        message,
        source,
        severity: import_node.DiagnosticSeverity.Error
      };
      if (token.tokenType?.tokenName !== "EOF") {
        constructedDiagnostic.range = import_node.Range.create(
          document.positionAt(token.startOffset),
          document.positionAt((token.endOffset ?? token.startOffset) + 1)
        );
      } else {
        const { previousToken = {} } = error;
        let rangeStart;
        let rangeEnd;
        if (typeof previousToken.endOffset !== "undefined") {
          rangeStart = Math.min(previousToken.endOffset + 1, content.length);
          rangeEnd = Math.min(previousToken.endOffset + 2, content.length);
        } else {
          rangeStart = rangeEnd = content.length;
        }
        constructedDiagnostic.range = import_node.Range.create(
          document.positionAt(rangeStart),
          document.positionAt(rangeEnd)
        );
      }
      return constructedDiagnostic;
    }
  );
}
async function validateTextDocument(document) {
  connection.console.log(`[Server(${process.pid} ${document.uri.toString()})] Validating document.`);
  const settings = await getDocumentSettings(document.uri);
  const { uri } = document;
  const content = document.getText();
  if (!content.length) {
    connection.sendDiagnostics({ uri, diagnostics: [] });
    return;
  }
  const parser = new import_millan.TurtleParser();
  const { cst, errors } = parser.parse(content, "standard");
  const tokens = parser.input;
  connection.console.log(JSON.stringify(tokens));
  const lexDiagnostics = getLexDiagnostics(document, tokens);
  const parseDiagnostics = getParseDiagnostics(document, errors);
  connection.console.log(JSON.stringify(lexDiagnostics));
  connection.console.log(JSON.stringify(parseDiagnostics));
  return connection.sendDiagnostics({ uri, diagnostics: [...lexDiagnostics, ...parseDiagnostics] });
}
connection.onDidChangeWatchedFiles((_change) => {
  connection.console.log(`[Server(${process.pid})] Watched files changed.`);
});
connection.onCompletion(
  (_textDocumentPosition) => {
    return [
      {
        label: "TypeScript",
        kind: import_node.CompletionItemKind.Text,
        data: 1
      },
      {
        label: "JavaScript",
        kind: import_node.CompletionItemKind.Text,
        data: 2
      }
    ];
  }
);
connection.onCompletionResolve(
  (item) => {
    if (item.data === 1) {
      item.detail = "TypeScript details";
      item.documentation = "TypeScript documentation";
    } else if (item.data === 2) {
      item.detail = "JavaScript details";
      item.documentation = "JavaScript documentation";
    }
    return item;
  }
);
documents.listen(connection);
connection.listen();
//# sourceMappingURL=turtle-server.js.map
