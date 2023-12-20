import { RdfSyntax, Tokenizer, TokenizerResult } from '@faubulous/mentor-rdf';
import { LanguageServerBase } from './language-server';
import { TextDocumentPositionParams, CompletionItem } from 'vscode-languageclient';

class SparqlLanguageServer extends LanguageServerBase {
	constructor() {
		super('sparql', 'SPARQL');
	}

	protected async parse(content: string): Promise<TokenizerResult>{
		return Tokenizer.parseData(content, RdfSyntax.Sparql);
	}

	protected onCompletion(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] {
		return [];
	}
}

new SparqlLanguageServer().start();