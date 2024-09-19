import { TurtleSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase, TokenizationResults, ValidationResults } from './language-server';
import { TextDocument } from 'vscode-languageserver-textdocument';

class TurtleLanguageServer extends LanguageServerBase {
	constructor() {
		super('turtle', 'Turtle');
	}

	protected async parse(content: string): Promise<TokenizationResults> {
		const parser = new TurtleSyntaxParser();

		const { errors, semanticErrors, comments } = parser.parse(content);
		const tokens = [...parser.input, ...comments];

		return { tokens, errors, semanticErrors, comments };
	}

	override async validateTextDocument(document: TextDocument): Promise<ValidationResults> {
		const result = await super.validateTextDocument(document);

		// Note: 'this' might be undefined in this context, so we need to check if it is defined before using it. 
		if (this?.connection) {
			this.connection.sendNotification('mentor/updateContext', { uri: document.uri, tokens: result.tokens });
		}

		return result;
	}
}

new TurtleLanguageServer().start();