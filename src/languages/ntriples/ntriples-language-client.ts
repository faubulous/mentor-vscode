import { TurtleLanguageClient } from '@src/languages/turtle/turtle-language-client';

export class NTriplesLanguageClient extends TurtleLanguageClient {
	constructor(languageId = 'ntriples', languageName = 'N-Triples') {
		super(languageId, languageName);
	}
}
