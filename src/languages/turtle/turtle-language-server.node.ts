import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { TurtleLexer, TurtleParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

const connection = createConnection(ProposedFeatures.all);

class TurtleLanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'turtle', 'Turtle', new TurtleLexer(), new TurtleParser(), true);
	}
}

new TurtleLanguageServer().start();
