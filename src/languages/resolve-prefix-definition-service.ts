import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { TurtlePrefixDefinitionService } from '@src/languages/turtle/services/turtle-prefix-definition-service';

/**
 * Resolves the prefix-definition service that matches a document's language. SPARQL
 * documents use the SPARQL-specific service; all other RDF documents use the Turtle one.
 * @param document The text document to resolve a service for.
 * @returns The matching prefix-definition service.
 */
export function resolvePrefixDefinitionService(document: vscode.TextDocument): TurtlePrefixDefinitionService {
	const token = document.languageId === 'sparql'
		? ServiceToken.SparqlPrefixDefinitionService
		: ServiceToken.TurtlePrefixDefinitionService;

	return container.resolve<TurtlePrefixDefinitionService>(token);
}
