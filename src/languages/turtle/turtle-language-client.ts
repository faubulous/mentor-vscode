import { LanguageClientBase } from '@/languages';

export class TurtleLanguageClient extends LanguageClientBase {
	constructor() {
		super('turtle', 'Turtle');
	}
}
