import { TrigSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';

class TrigLanguageServer extends LanguageServerBase {
	constructor() {
		super('trig', 'TriG', new TrigSyntaxParser(), true);
	}
}

new TrigLanguageServer().start();