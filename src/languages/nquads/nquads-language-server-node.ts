import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { NQuadsLexer, NQuadsParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

const connection = createConnection(ProposedFeatures.all);

class NQuadsLanguageServer extends LanguageServerBase {
	constructor() {
		super(connection, 'nquads', 'N-Quads', new NQuadsLexer(), new NQuadsParser(), true);
	}
}

new NQuadsLanguageServer().start();
