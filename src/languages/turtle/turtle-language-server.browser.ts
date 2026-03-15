import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { TurtleLexer, TurtleParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

const connection = createConnection(new BrowserMessageReader(self), new BrowserMessageWriter(self));

class TurtleLanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'turtle', 'Turtle', new TurtleLexer(), new TurtleParser(), true);
	}
}

new TurtleLanguageServer().start();