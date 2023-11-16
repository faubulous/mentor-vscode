import { LanguageServerBase } from './language-server';
import { IToken, W3SpecSparqlParser } from 'millan';
import { TextDocumentPositionParams, CompletionItem } from 'vscode-languageclient';

class SparqlLanguageServer extends LanguageServerBase<W3SpecSparqlParser> {
	constructor() {
		super('sparql', 'SPARQL');
	}

	get parser(): W3SpecSparqlParser {
		return new W3SpecSparqlParser();
	}

	protected parse(content: string): { tokens: IToken[], errors: any[] } {
		const { cst, errors } = this.parser.parse(content);
		const tokens = this.parser.input;

		return { tokens, errors };
	}

	protected onCompletion(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] {
		return [];
	}
}

new SparqlLanguageServer().start();