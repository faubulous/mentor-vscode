import { TurtleLanguageClient } from '@src/languages/turtle/turtle-language-client';

export class NQuadsLanguageClient extends TurtleLanguageClient {
	constructor(languageId = 'nquads', languageName = 'N-Quads') {
		super(languageId, languageName);
	}
}
