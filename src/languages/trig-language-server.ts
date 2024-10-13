import { TrigSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';
import { IToken } from 'millan';

class TrigLanguageServer extends LanguageServerBase {
	constructor() {
		super('trig', 'TriG', new TrigSyntaxParser(), true);
	}

	override getUnquotedLiteralValue(token: IToken): string {
		switch (token?.tokenType?.tokenName) {
			case "STRING_LITERAL_QUOTE":
			case "STRING_LITERAL_SINGLE_QUOTE":
				return token.image.substring(1, token.image.length - 1);
			case "STRING_LITERAL_LONG_QUOTE":
			case "STRING_LITERAL_LONG_SINGLE_QUOTE":
				return token.image.substring(3, token.image.length - 3);
		}

		return token.image;
	}
}

new TrigLanguageServer().start();