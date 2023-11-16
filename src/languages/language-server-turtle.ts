import { LanguageServerBase } from './language-server';
import { IToken, TurtleParser } from 'millan';
import { TextDocumentPositionParams, CompletionItem } from 'vscode-languageclient';

class TurtleLanguageServer extends LanguageServerBase<TurtleParser> {
	get parser(): TurtleParser {
		return new TurtleParser();
	}

	constructor() {
		super('turtle', 'Turtle');
	}

	protected parse(content: string): { tokens: IToken[], errors: any[] } {
		const { cst, errors } = this.parser.parse(content, 'standard');
		const tokens = this.parser.input;

		return { tokens, errors };
	}

	protected onCompletion(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] {
		return [];
	}
}

new TurtleLanguageServer().start();