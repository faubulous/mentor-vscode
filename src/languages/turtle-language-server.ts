import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';

class TurtleLanguageServer extends LanguageServerBase {
	constructor() {
		super('turtle', 'Turtle');
	}

	protected async parse(content: string): Promise<TokenizerResult> {
		return await Tokenizer.parseData(content, RdfSyntax.TriG);
	}
}

new TurtleLanguageServer().start();