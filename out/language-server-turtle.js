"use strict";
var import_language_server = require("./language-server");
var import_millan = require("millan");
class TurtleLanguageServer extends import_language_server.LanguageServerBase {
  get parser() {
    return new import_millan.TurtleParser();
  }
  constructor() {
    super("turtle", "Turtle");
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
new TurtleLanguageServer().start();
//# sourceMappingURL=language-server-turtle.js.map
