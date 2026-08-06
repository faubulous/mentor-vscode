import * as vscode from 'vscode';
import { RdfToken, TokenType } from '@faubulous/mentor-rdf-parsers';
import { TurtleDocument } from '@src/languages';
import { TurtlePrefixDefinitionService } from '@src/languages/turtle/services/turtle-prefix-definition-service';

/**
 * A service for declaring prefixes in SPARQL documents. SPARQL only supports the
 * `PREFIX ns: <iri>` declaration form (no `@prefix` and no trailing dot), so the
 * syntax-specific seams of {@link TurtlePrefixDefinitionService} are overridden.
 */
export class SparqlPrefixDefinitionService extends TurtlePrefixDefinitionService {
	protected override getPrefixTokenType(_document: vscode.TextDocument, _context: TurtleDocument): TokenType {
		return RdfToken.PREFIX;
	}

	protected override getPrefixDefinition(_tokenType: TokenType, upperCase: boolean, prefix: string, namespaceIri: string): string {
		return `${upperCase ? 'PREFIX' : 'prefix'} ${prefix}: <${namespaceIri}>`;
	}
}
