import * as vscode from 'vscode';
import { VocabularyRepository } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { ResourceDefinitionProvider } from '@src/providers';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';

export interface ShapeDefinitionLocations {
	editor: vscode.TextEditor;
	locations: vscode.Location[];
}

function toLocationKey(location: vscode.Location): string {
	const uri = location.uri.toString();
	const start = location.range.start;
	const end = location.range.end;

	return `${uri}:${start.line}:${start.character}:${end.line}:${end.character}`;
}

function compareLocations(a: vscode.Location, b: vscode.Location): number {
	const uriA = a.uri.toString();
	const uriB = b.uri.toString();

	if (uriA !== uriB) {
		return uriA.localeCompare(uriB);
	}

	if (a.range.start.line !== b.range.start.line) {
		return a.range.start.line - b.range.start.line;
	}

	if (a.range.start.character !== b.range.start.character) {
		return a.range.start.character - b.range.start.character;
	}

	if (a.range.end.line !== b.range.end.line) {
		return a.range.end.line - b.range.end.line;
	}

	return a.range.end.character - b.range.end.character;
}

export async function resolveShapeDefinitionLocations(arg: DefinitionTreeNode | string): Promise<ShapeDefinitionLocations | undefined> {
	const iri = getIriFromArgument(arg);
	const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	const editor = await contextService.activateDocument();

	if (!iri || !editor || !contextService.activeContext) {
		return undefined;
	}

	const vocabulary = container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
	const shapeUris = [...new Set(vocabulary.getShapes(contextService.activeContext.graphs, iri, { includeBlankNodes: true }))];

	if (shapeUris.length === 0) {
		return undefined;
	}

	const definitionProvider = new ResourceDefinitionProvider();
	const locationsByKey = new Map<string, vscode.Location>();

	for (const shapeUri of shapeUris) {
		const location = definitionProvider.provideDefinitionForResource(contextService.activeContext, shapeUri);

		if (location instanceof vscode.Location) {
			locationsByKey.set(toLocationKey(location), location);
		}
	}

	const locations = [...locationsByKey.values()].sort(compareLocations);

	if (locations.length === 0) {
		return undefined;
	}

	return {
		editor,
		locations,
	};
}