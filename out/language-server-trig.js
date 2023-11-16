"use strict";
var import_language_server = require("./language-server");
var import_millan = require("millan");
class TrigLanguageServer extends import_language_server.LanguageServerBase {
  get parser() {
    return new import_millan.TrigParser();
  }
  constructor() {
    super("trig", "TriG");
  }
  parse(content) {
    const { cst, errors } = this.parser.parse(content, "standard");
    const tokens = this.parser.input;
    return { tokens, errors };
  }
  onCompletion(_textDocumentPosition) {
    return [];
  }
}
new TrigLanguageServer().start();
//# sourceMappingURL=language-server-trig.js.map
