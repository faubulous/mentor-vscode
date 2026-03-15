import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { NQuadsLexer, NQuadsParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

const connection = createConnection(new BrowserMessageReader(self), new BrowserMessageWriter(self));

class NQuadsLanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'nquads', 'N-Quads', new NQuadsLexer(), new NQuadsParser(), true);
	}
}

new NQuadsLanguageServer().start();
