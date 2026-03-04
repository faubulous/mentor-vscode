import { NQuadsLexer, NQuadsParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

class NQuadsLanguageServer extends LanguageServerBase {
	constructor() {
		super('nquads', 'N-Quads', new NQuadsLexer(), new NQuadsParser(), true);
	}
}

new NQuadsLanguageServer().start();
