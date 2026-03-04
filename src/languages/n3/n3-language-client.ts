import { TurtleLanguageClient } from '@src/languages/turtle/turtle-language-client';

export class N3LanguageClient extends TurtleLanguageClient {
	constructor(languageId = 'n3', languageName = 'N3') {
		super(languageId, languageName);
	}
}
