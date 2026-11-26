import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { RDFS, Store, _OWL, _RDFS } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { ResourceReferenceProvider } from '@src/providers/resource-reference-provider';
import { createTurtleDocument } from '@src/utilities/mocks/factories';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceCardService } from './resource-card-service';
import { ResourceTooltipService } from './resource-tooltip-service';

const EX = 'http://example.org/';

/**
 * A service over a store holding a class and a tree, for a document whose labels and descriptions
 * are `rdfs:label` and `rdfs:comment`.
 * @param revealScope The value of `mentor.tooltips.revealScope`, the default when absent.
 * @returns The service and the document context.
 */
function createService(revealScope?: string) {
	const store = new Store();

	store.loadTurtle(`@prefix ex: <${EX}> .
@prefix owl: <${_OWL}> .
@prefix rdfs: <${_RDFS}> .

ex:Tree a owl:Class ; rdfs:label "Tree" .
ex:Oak a ex:Tree ; rdfs:label "Oak" ; rdfs:comment "An oak." .
`, 'file:///w/vocabulary.ttl', false);

	const references = { countReferencesForIri: () => 2 } as unknown as ResourceReferenceProvider;
	const context = createTurtleDocument('file:///w/data.ttl', RdfSyntax.Turtle, { store });

	context.predicates.label.push(RDFS.label);
	context.predicates.description.push(RDFS.comment);

	vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
		get: (key: string, value?: unknown) => key === 'tooltips.revealScope' ? revealScope ?? value : value,
		inspect: () => undefined
	} as unknown as vscode.WorkspaceConfiguration);

	return { service: new ResourceTooltipService(new ResourceCardService(store, references)), context };
}

/**
 * The arguments of the commands the links of a tooltip run, by the text of each link.
 * @param markdown The Markdown of the tooltip.
 * @returns The arguments of each link.
 */
function linksOf(markdown: string): Record<string, unknown[]> {
	const links: Record<string, unknown[]> = {};

	for (const [, text, command, argumentsText] of markdown.matchAll(/\[([^\]]+)\]\((command:[^?]+)\?([^)]+)\)/g)) {
		expect(command).toBe('command:mentor.command.revealDefinition');

		links[text] = JSON.parse(decodeURIComponent(argumentsText));
	}

	return links;
}

describe('ResourceTooltipService', () => {
	it('gives the compact card of a resource of the store as Markdown, its resources linked to their definitions', () => {
		const { service, context } = createService();
		const tooltip = service.getTooltip(RdfDataFactory.namedNode(`${EX}Oak`), context);

		expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
		expect(tooltip.value).toMatch(/^_\[Tree\]\([^)]+\) · 1 usage_\n\n---\n\n\*\*Oak\*\*\n\nAn oak\\\.\n\n---\n\n\[http:\/\/example\\\.org\/Oak\]\([^)]+\)$/);
		expect(linksOf(tooltip.value)).toEqual({
			'Tree': [`${EX}Tree`, { scope: 'workspace' }],
			'http://example\\.org/Oak': [`${EX}Oak`, { scope: 'workspace' }]
		});
		expect(tooltip.isTrusted).toEqual({ enabledCommands: ['mentor.command.revealDefinition'] });
	});

	it('looks for the definitions where mentor.tooltips.revealScope says', () => {
		const { service, context } = createService('document');

		expect(Object.values(linksOf(service.getTooltip(RdfDataFactory.namedNode(`${EX}Oak`), context).value)).map(([, options]) => options)).toEqual([{ scope: 'document' }, { scope: 'document' }]);
	});

	it('gives the label and the identifier of a resource the store does not know', () => {
		const { service, context } = createService();

		expect(service.getTooltip(RdfDataFactory.namedNode(`${EX}Unknown`), context).value).toMatch(/^\*\*Unknown\*\*\n\n---\n\n\[http:\/\/example\\\.org\/Unknown\]\(command:/);
	});
});
