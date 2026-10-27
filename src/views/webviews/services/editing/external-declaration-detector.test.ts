import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { _OWL, _RDFS } from '@faubulous/mentor-rdf';
import { createResolvingDocumentContext, readTurtleQuadContexts } from '@src/utilities/mocks/factories';
import { ExternalDeclarationDetector } from './external-declaration-detector';
import { ResourceIndex } from './resource-index';
import { ResourceIndexBuilder } from './resource-index-builder';

const EX = 'http://example.org/';
const NAMESPACES = { ex: EX, rdfs: _RDFS, owl: _OWL };
const PREAMBLE = Object.entries(NAMESPACES).map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .\n`).join('');

/**
 * Build the index and the detector of a Turtle body written after the prefix declarations.
 */
function detectorOf(body: string, namespaces: Record<string, string> = NAMESPACES): { detector: ExternalDeclarationDetector; index: ResourceIndex } {
	const context = createResolvingDocumentContext({ namespaces });
	const index = new ResourceIndexBuilder(readTurtleQuadContexts(PREAMBLE + body), context).build();

	return { detector: new ExternalDeclarationDetector(index, namespaces), index };
}

describe('ExternalDeclarationDetector', () => {
	it('takes the namespace most resources are written in as the document\'s own, foundation vocabularies aside', () => {
		const { detector } = detectorOf('rdfs:label a owl:AnnotationProperty .\nrdfs:comment a owl:AnnotationProperty .\nex:A a owl:Class .\n');

		expect(detector.ownNamespaces).toEqual(new Set([EX]));
	});

	it('takes the namespace of the empty prefix as the document\'s own', () => {
		const { detector } = detectorOf('rdfs:label a owl:AnnotationProperty .\n', { ...NAMESPACES, '': 'http://own.org/ns#' });

		expect(detector.ownNamespaces).toEqual(new Set(['http://own.org/ns#']));
	});

	it('marks the terms of other vocabularies that are only declared, as Protégé writes them', () => {
		const { detector, index } = detectorOf(`
			rdfs:label a owl:AnnotationProperty ; rdfs:comment ""@en ; rdfs:isDefinedBy ex:onto .
			owl:Thing a owl:Class .
			rdfs:seeAlso a owl:AnnotationProperty ; rdfs:comment "Points to more."@en .
			<http://example.org/> a owl:Ontology .
			ex:A a owl:Class .
			ex:B a owl:Class ; rdfs:label "B" .
		`);
		const marked = Object.fromEntries(Array.from(index.entries.values()).map(entry => [entry.id, detector.isExternalDeclaration(entry)]));

		expect(marked).toEqual({
			[`i:${_RDFS}label`]: true,
			[`i:${_OWL}Thing`]: true,
			[`i:${_RDFS}seeAlso`]: false,
			[`i:${EX}`]: true,
			[`i:${EX}A`]: false,
			[`i:${EX}B`]: false
		});
	});

	it('tells a resource that states nothing of its own', () => {
		const { index } = detectorOf('ex:A a owl:Class .\nex:B a owl:Class ; rdfs:label "B" .\n');
		const statesNothing = (id: string) => ExternalDeclarationDetector.statesNothingOfItsOwn(index.entries.get(id)!);

		expect(statesNothing(`i:${EX}A`)).toBe(true);
		expect(statesNothing(`i:${EX}B`)).toBe(false);
	});
});
