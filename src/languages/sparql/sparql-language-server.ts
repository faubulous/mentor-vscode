import { IToken } from 'millan';
import { SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from '@/languages/language-server';

class SparqlLanguageServer extends LanguageServerBase {
	constructor() {
		super('sparql', 'SPARQL', new SparqlSyntaxParser());
	}

	override getUnquotedLiteralValue(token: IToken): string {
		switch (token?.tokenType?.tokenName) {
			case "STRING_LITERAL1":
			case "STRING_LITERAL2":
				return token.image.substring(1, token.image.length - 1);
			case "STRING_LITERAL_LONG1":
			case "STRING_LITERAL_LONG2":
				return token.image.substring(3, token.image.length - 3);
		}

		return token.image;
	}
}

new SparqlLanguageServer().start();