import { LanguageClientBase } from './language-client';

export class TurtleLanguageClient extends LanguageClientBase {
	constructor() {
		super('turtle', 'Turtle');
	}
}
