import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { N3Lexer, N3Parser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

const connection = createConnection(new BrowserMessageReader(self), new BrowserMessageWriter(self));

class N3LanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'n3', 'N3', new N3Lexer(), new N3Parser(), true);
	}
}

new N3LanguageServer().start();
