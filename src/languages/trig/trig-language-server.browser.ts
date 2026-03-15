import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { TrigLexer, TrigParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

const connection = createConnection(new BrowserMessageReader(self), new BrowserMessageWriter(self));

class TrigLanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'trig', 'TriG', new TrigLexer(), new TrigParser(), true);
	}
}

new TrigLanguageServer().start();