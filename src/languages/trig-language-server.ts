import { TokenizerResult, TrigSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';

class TrigLanguageServer extends LanguageServerBase {
	constructor() {
		super('trig', 'TriG');
	}

	protected async parse(content: string): Promise<TokenizerResult> {
		const parser = new TrigSyntaxParser();

		const { errors, semanticErrors, comments } = parser.parse(content);
		const tokens = [...parser.input, ...comments];

		return { tokens, syntaxErrors: errors, semanticErrors };
	}
}

new TrigLanguageServer().start();