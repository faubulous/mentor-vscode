import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { TrigLexer, TrigParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

const connection = createConnection(ProposedFeatures.all);

class TrigLanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'trig', 'TriG', new TrigLexer(), new TrigParser(), true);
	}
}

new TrigLanguageServer().start();
