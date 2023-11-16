import * as path from 'path';
import { LanguageClientBase } from './language-client';

export class TrigLanguageClient extends LanguageClientBase {
	get serverPath(): string {
		return path.join('out', 'language-server-trig.js');
	}

	constructor() {
		super('trig', 'TriG');
	}
}
