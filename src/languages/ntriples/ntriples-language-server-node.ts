import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { NTriplesLexer, NTriplesParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

const connection = createConnection(ProposedFeatures.all);

class NTriplesLanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'ntriples', 'N-Triples', new NTriplesLexer(), new NTriplesParser(), true);
	}
}

new NTriplesLanguageServer().start();
