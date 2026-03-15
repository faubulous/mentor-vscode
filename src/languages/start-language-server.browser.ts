import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { ILexer, IParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from './language-server';

/**
 * Creates and starts a language server in a browser Web Worker context.
 */
export function startBrowserLanguageServer(languageId: string, languageName: string, lexer: ILexer, parser: IParser, isRdfTokenProvider = true) {
	const connection = createConnection(new BrowserMessageReader(self), new BrowserMessageWriter(self));
	new LanguageServerBase(connection, languageId, languageName, lexer, parser, isRdfTokenProvider).start();
}
