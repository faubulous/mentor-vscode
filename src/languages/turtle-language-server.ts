import { TokenizerResult, TurtleSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase, ValidationResults } from './language-server';
import { TextDocument } from 'vscode-languageserver-textdocument';

class TurtleLanguageServer extends LanguageServerBase {
	constructor() {
		super('turtle', 'Turtle');
	}

	protected async parse(content: string): Promise<TokenizerResult> {
		const parser = new TurtleSyntaxParser();

		const { errors, semanticErrors, comments } = parser.parse(content);
		const tokens = [...parser.input, ...comments];

		return { tokens, syntaxErrors: errors, semanticErrors };
	}

	override async validateTextDocument(document: TextDocument): Promise<ValidationResults> {
		const result = await super.validateTextDocument(document);

		this.connection.sendNotification('mentor/updateContext', { uri: document.uri, tokens: result.tokens });

		return result;
	}
}

new TurtleLanguageServer().start();