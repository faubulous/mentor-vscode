import { IToken } from 'millan';
import { TurtleSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from '@src/languages/language-server';

class TurtleLanguageServer extends LanguageServerBase {
	constructor() {
		super('turtle', 'Turtle', new TurtleSyntaxParser(), true);
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

new TurtleLanguageServer().start();