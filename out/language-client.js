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
var language_client_exports = {};
__export(language_client_exports, {
  LanguageClientBase: () => LanguageClientBase
});
module.exports = __toCommonJS(language_client_exports);
var vscode = __toESM(require("vscode"));
var import_node = require("vscode-languageclient/node");
class LanguageClientBase {
  constructor(langaugeId, languageName) {
    this.languageName = languageName;
    this.languageId = langaugeId;
    this.channelName = `Mentor Language (${languageName})`;
    this.channelId = `mentor.language.${langaugeId}`;
    this.channel = vscode.window.createOutputChannel(this.channelName, this.channelId);
  }
  start(context) {
    console.log(`Starting ${this.languageName} Language Client..`);
    const module2 = context.asAbsolutePath(this.serverPath);
    const serverOptions = {
      run: { module: module2, transport: import_node.TransportKind.ipc },
      debug: { module: module2, transport: import_node.TransportKind.ipc }
    };
    const clientOptions = {
      diagnosticCollectionName: this.channelId,
      documentSelector: [{ language: this.languageId }],
      outputChannel: this.channel
    };
    this.client = new import_node.LanguageClient(this.channelId, `${this.languageName} Language Client`, serverOptions, clientOptions);
    this.client.start();
  }
  async stop() {
    if (this.client) {
      await this.client.stop();
    }
  }
}
//# sourceMappingURL=language-client.js.map
