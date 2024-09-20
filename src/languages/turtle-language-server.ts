import { TurtleSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';

class TurtleLanguageServer extends LanguageServerBase {
	constructor() {
		super('turtle', 'Turtle', new TurtleSyntaxParser(), true);
	}
}

new TurtleLanguageServer().start();