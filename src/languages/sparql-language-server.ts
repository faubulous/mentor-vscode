import { SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';

class SparqlLanguageServer extends LanguageServerBase {
	constructor() {
		super('sparql', 'SPARQL', new SparqlSyntaxParser());
	}
}

new SparqlLanguageServer().start();