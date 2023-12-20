import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';
import { TextDocumentPositionParams, CompletionItem } from 'vscode-languageclient';

class TurtleLanguageServer extends LanguageServerBase {
	constructor() {
		super('turtle', 'Turtle');
	}

	protected async parse(content: string): Promise<TokenizerResult> {
		return await Tokenizer.parseData(content, RdfSyntax.TriG);
	}

	protected onCompletion(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] {
		return [];
	}
}

new TurtleLanguageServer().start();