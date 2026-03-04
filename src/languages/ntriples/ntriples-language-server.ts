import { NTriplesLexer, NTriplesParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

class NTriplesLanguageServer extends LanguageServerBase {
	constructor() {
		super('ntriples', 'N-Triples', new NTriplesLexer(), new NTriplesParser(), true);
	}
}

new NTriplesLanguageServer().start();
