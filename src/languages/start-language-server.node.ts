import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { ILexer, IParser } from '@faubulous/mentor-rdf-parsers';
import { LanguageServerBase } from './language-server';

/**
 * Creates and starts a language server in a Node.js process context.
 */
export function startNodeLanguageServer(languageId: string, languageName: string, lexer: ILexer, parser: IParser, isRdfTokenProvider = true) {
	const connection = createConnection(ProposedFeatures.all);
	new LanguageServerBase(connection, languageId, languageName, lexer, parser, isRdfTokenProvider).start();
}
