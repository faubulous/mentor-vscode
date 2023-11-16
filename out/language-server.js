"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var language_server_exports = {};
__export(language_server_exports, {
  LanguageServerBase: () => LanguageServerBase
});
module.exports = __toCommonJS(language_server_exports);
var import_node = require("vscode-languageserver/node");
var import_vscode_languageserver_textdocument = require("vscode-languageserver-textdocument");
const defaultSettings = { maxNumberOfProblems: 1e3 };
class LanguageServerBase {
  constructor(langaugeId, languageName) {
    this.documents = new import_node.TextDocuments(import_vscode_languageserver_textdocument.TextDocument);
    this.hasConfigurationCapability = false;
    this.hasWorkspaceFolderCapability = false;
    this.hasDiagnosticRelatedInformationCapability = false;
    this.globalSettings = defaultSettings;
    this.documentSettings = /* @__PURE__ */ new Map();
    this.languageName = languageName;
    this.languageId = langaugeId;
    this.connection = (0, import_node.createConnection)(import_node.ProposedFeatures.all);
    this.connection.onInitialize(this.onInitializeConnection.bind(this));
    this.connection.onInitialized(this.onConnectionInitialized.bind(this));
    this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this));
    this.connection.onCompletion(this.onCompletion.bind(this));
    this.connection.onCompletionResolve(this.onCompletionResolve.bind(this));
    this.documents.onDidClose(this.onDidClose.bind(this));
    this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
  }
  log(message) {
    this.connection.console.log(`[Server(${process.pid})] ${message}`);
  }
  start() {
    this.documents.listen(this.connection);
    this.connection.listen();
    this.log(`Started ${this.languageName} Language Server.`);
  }
  onInitializeConnection(params) {
    const capabilities = params.capabilities;
    this.hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    this.hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    this.hasDiagnosticRelatedInformationCapability = !!(capabilities.textDocument && capabilities.textDocument.publishDiagnostics && capabilities.textDocument.publishDiagnostics.relatedInformation);
    const result = {
      capabilities: {
        textDocumentSync: import_node.TextDocumentSyncKind.Incremental,
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
  onConnectionInitialized() {
    if (this.hasConfigurationCapability) {
      this.connection.client.register(import_node.DidChangeConfigurationNotification.type, void 0);
    }
    if (this.hasWorkspaceFolderCapability) {
      this.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        this.log("Workspace folder change event received.");
      });
    }
  }
  onDidChangeConfiguration(change) {
    this.log(`Configuration changed.`);
    if (this.hasConfigurationCapability) {
      this.documentSettings.clear();
    } else {
      this.globalSettings = change.settings.languageServerExample || defaultSettings;
    }
    this.documents.all().forEach(this.validateTextDocument);
  }
  onDidChangeWatchedFiles(change) {
    this.log(`Watched files changed.`);
  }
  onDidClose(e) {
    this.documentSettings.delete(e.document.uri);
  }
  onDidChangeContent(change) {
    this.validateTextDocument(change.document);
  }
  /**
   * Event handler that resolvesd additional information for the item selected 
   * in the completion list.
   */
  onCompletionResolve(item) {
    return item;
  }
  _getDocumentSettings(resource) {
    if (!this.hasConfigurationCapability) {
      return Promise.resolve(this.globalSettings);
    }
    let result = this.documentSettings.get(resource);
    if (!result) {
      result = this.connection.workspace.getConfiguration({
        scopeUri: resource,
        section: "mentor.config.languageServer"
      });
      this.documentSettings.set(resource, result);
    }
    return result;
  }
  async validateTextDocument(document) {
    this.log(`Validating document: ${document.uri}`);
    const settings = await this._getDocumentSettings(document.uri);
    let diagnostics = [];
    const content = document.getText();
    if (content.length) {
      const { tokens, errors } = this.parse(content);
      diagnostics = [
        ...this.getLexDiagnostics(document, tokens),
        ...this.getParseDiagnostics(document, errors)
      ];
    }
    return this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
  }
  getLexDiagnostics(document, tokens) {
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
  getParseDiagnostics(document, errors) {
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
}
//# sourceMappingURL=language-server.js.map
