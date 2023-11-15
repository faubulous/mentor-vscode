"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var client_exports = {};
__export(client_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(client_exports);
var path = __toESM(require("path"));
var vscode = __toESM(require("vscode"));
var import_utilities = require("../utilities");
var import_language_client = require("../language-client");
const clients = /* @__PURE__ */ new Map();
class TurtleLanguageClient extends import_language_client.LanguageClientBase {
  get serverPath() {
    return path.join("out", "turtle-server.js");
  }
  get languageName() {
    return "Turtle";
  }
  get languageId() {
    return "turtle";
  }
}
function activate(context) {
  function didOpenTextDocument(document) {
    if (document.languageId !== "turtle") {
      return;
    }
    let folder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!folder) {
      return;
    }
    folder = (0, import_utilities.getOuterMostWorkspaceFolder)(folder);
    if (clients.has(folder.uri.toString())) {
      return;
    }
    let client = new TurtleLanguageClient(folder);
    client.activate(context);
    clients.set(folder.uri.toString(), client);
  }
  vscode.workspace.onDidOpenTextDocument(didOpenTextDocument);
  vscode.workspace.textDocuments.forEach(didOpenTextDocument);
  vscode.workspace.onDidChangeWorkspaceFolders((event) => {
    for (const folder of event.removed.map((f) => f.uri.toString())) {
      const client = clients.get(folder);
      if (client) {
        clients.delete(folder);
        client.deactivate();
      }
    }
  });
}
function deactivate() {
  const promises = [];
  for (const client of clients.values()) {
    promises.push(client.deactivate());
  }
  return Promise.all(promises).then(() => void 0);
}
//# sourceMappingURL=turtle-client.js.map
