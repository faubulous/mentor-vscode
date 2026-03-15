import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { NTriplesLexer, NTriplesParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

const connection = createConnection(new BrowserMessageReader(self), new BrowserMessageWriter(self));

class NTriplesLanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'ntriples', 'N-Triples', new NTriplesLexer(), new NTriplesParser(), true);
	}
}

new NTriplesLanguageServer().start();
