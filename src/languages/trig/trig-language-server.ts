import { TrigLexer, TrigParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

class TrigLanguageServer extends LanguageServerBase {
	constructor() {
		super('trig', 'TriG', new TrigLexer(), new TrigParser(), true);
	}
}

new TrigLanguageServer().start();