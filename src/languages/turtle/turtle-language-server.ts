import { TurtleLexer, TurtleParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from '@src/languages/language-server';

class TurtleLanguageServer extends LanguageServerBase {
	constructor() {
		super('turtle', 'Turtle', new TurtleLexer(), new TurtleParser(), true);
	}
}

new TurtleLanguageServer().start();