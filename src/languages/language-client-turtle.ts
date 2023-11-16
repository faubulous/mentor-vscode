import * as path from 'path';
import { LanguageClientBase } from './language-client';

export class TurtleLanguageClient extends LanguageClientBase {
	get serverPath(): string {
		return path.join('out', 'language-server-turtle.js');
	}

	constructor() {
		super('turtle', 'Turtle');
	}
}
