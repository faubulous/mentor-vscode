"use strict";
var import_language_server = require("./language-server");
var import_millan = require("millan");
class SparqlLanguageServer extends import_language_server.LanguageServerBase {
  constructor() {
    super("sparql", "SPARQL");
  }
  get parser() {
    return new import_millan.W3SpecSparqlParser();
  }
  parse(content) {
    const { cst, errors } = this.parser.parse(content);
    const tokens = this.parser.input;
    return { tokens, errors };
  }
  onCompletion(_textDocumentPosition) {
    return [];
  }
}
new SparqlLanguageServer().start();
//# sourceMappingURL=language-server-sparql.js.map
