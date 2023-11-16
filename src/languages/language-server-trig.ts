import { LanguageServerBase } from './language-server';
import { IToken, TrigParser } from 'millan';
import { TextDocumentPositionParams, CompletionItem } from 'vscode-languageclient';

class TrigLanguageServer extends LanguageServerBase<TrigParser> {
	get parser(): TrigParser {
		return new TrigParser();
	}

	constructor() {
		super('trig', 'TriG');
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

new TrigLanguageServer().start();