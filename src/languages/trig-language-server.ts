import { TrigSyntaxParser } from '@faubulous/mentor-rdf';
import { LanguageServerBase, TokenizationResults, ValidationResults } from './language-server';
import { TextDocument } from 'vscode-languageserver-textdocument';

class TrigLanguageServer extends LanguageServerBase {
	constructor() {
		super('trig', 'TriG');
	}

	protected async parse(content: string): Promise<TokenizationResults> {
		const parser = new TrigSyntaxParser();

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

new TrigLanguageServer().start();