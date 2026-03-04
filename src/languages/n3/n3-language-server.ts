import { N3Lexer, N3Parser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

class N3LanguageServer extends LanguageServerBase {
	constructor() {
		super('n3', 'N3', new N3Lexer(), new N3Parser(), true);
	}
}

new N3LanguageServer().start();
