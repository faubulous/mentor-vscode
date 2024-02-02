import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';

class TrigLanguageServer extends LanguageServerBase {
	constructor() {
		super('trig', 'TriG');
	}

	protected async parse(content: string): Promise<TokenizerResult> {
		return await Tokenizer.parseData(content, RdfSyntax.TriG);
	}
}

new TrigLanguageServer().start();