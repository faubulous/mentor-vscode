import { TurtleLanguageClient } from '@/languages/turtle/turtle-language-client';

export class TrigLanguageClient extends TurtleLanguageClient {
	constructor(languageId = 'trig', languageName = 'TriG') {
		super(languageId, languageName);
	}
}
