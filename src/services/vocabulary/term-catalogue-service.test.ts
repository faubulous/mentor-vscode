import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { OwlReasoner, Store, VocabularyRepository, _OWL, _RDF, _RDFS } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { ITokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { IPrefixLookupService } from '@src/services/document/prefix-lookup-service.interface';
import { createResolvingDocumentContext } from '@src/utilities/mocks/factories';
import { TermSearchTargetType } from './term-search';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PredicateRangeResolver } from './predicate-range-resolver';
import { PropertyShapeIndex } from './property-shape-index';
import { StoreIconResolver } from './store-icon-resolver';
import { TermFitResolver } from './term-fit-resolver';
import { TermCatalogueService } from './term-catalogue-service';

const EX = 'http://example.org/';

const V = 'http://example.org/vocabulary#';

const DOCUMENT_GRAPH = 'http://example.org/document';

const PREAMBLE = `@prefix ex: <${EX}> .\n@prefix v: <${V}> .\n@prefix owl: <${_OWL}> .\n@prefix rdf: <${_RDF}> .\n@prefix rdfs: <${_RDFS}> .\n`;

const LABELS: Record<string, string> = {
	[`${V}Tree`]: 'Tree',
	[`${V}height`]: 'height',
	[`${V}hasLeaf`]: 'has leaf',
	[`${V}Oak`]: 'Oak',
	[`${EX}Plant`]: 'Plant'
};

/**
 * A store with a vocabulary of the workspace and a document that uses it.
 * @returns The store.
 */
function createStore(): Store {
	const store = new Store(new OwlReasoner());

	store.loadTurtle(`${PREAMBLE}
		v:Tree a owl:Class .
		v:height a owl:DatatypeProperty .
		v:hasLeaf a owl:ObjectProperty .
		v:Oak a v:Tree .
		v:Length a rdfs:Datatype .
	`, 'http://example.org/vocabulary', true);
	store.loadTurtle(`${PREAMBLE}
		ex:Plant a owl:Class ;
			ex:grows v:Oak .
	`, DOCUMENT_GRAPH, true);

	return store;
}

/**
 * The catalogue over a store, with a workspace that writes the vocabulary namespace as `v`.
 * @param store The store.
 * @param whenIndexed Resolves once the workspace is indexed.
 * @returns The catalogue.
 */
function createCatalogue(store = createStore(), whenIndexed = () => Promise.resolve()): TermCatalogueService {
	const prefixLookup = { getPrefixForIri: (_document: string, namespace: string, fallback: string) => namespace === V ? 'v' : fallback } as IPrefixLookupService;

	const shapes = new PropertyShapeIndex(store);

	return new TermCatalogueService(new VocabularyRepository(store), prefixLookup, new StoreIconResolver(store), new PredicateRangeResolver(store, shapes), new TermFitResolver(store, shapes), whenIndexed);
}

/**
 * The document the pickers edit.
 * @param namespaces The prefixes it declares.
 * @param syntax The syntax it is written in.
 * @returns The context.
 */
function createDocument(namespaces: Record<string, string> = { ex: EX }, syntax = RdfSyntax.Turtle): ITokenizedDocumentContext {
	return { ...createResolvingDocumentContext({ namespaces, labels: LABELS }), syntax, graphs: [DOCUMENT_GRAPH] } as unknown as ITokenizedDocumentContext;
}

/**
 * Search the catalogue and name the terms found by their IRIs.
 * @param targetType The type of terms.
 * @param text The typed text.
 * @param options The catalogue and the document.
 * @returns The IRIs, best first.
 */
async function find(targetType: TermSearchTargetType, text: string, options: { catalogue?: TermCatalogueService; document?: ITokenizedDocumentContext; limit?: number } = {}): Promise<string[]> {
	const catalogue = options.catalogue ?? createCatalogue();
	const found = await catalogue.search({ targetType, text, limit: options.limit ?? 50 }, options.document ?? createDocument());

	return found.map(option => option.subject.value);
}

describe('TermCatalogueService', () => {
	it('offers the predicates the document uses before those of the workspace', async () => {
		const predicates = await find('predicate', '');

		expect(predicates.indexOf(`${EX}grows`)).toBeLessThan(predicates.indexOf(`${V}height`));
		expect(predicates).toContain(`${V}hasLeaf`);
	});

	it('ranks a name that starts with the text before a word of the label, and that before a name containing it', async () => {
		expect(await find('predicate', 'lea')).toEqual([`${V}hasLeaf`]);
		expect(await find('predicate', 'eigh')).toEqual([`${V}height`]);
		expect(await find('predicate', 'HEI')).toEqual([`${V}height`]);
	});

	it('offers the classes, resources and datatypes of their type', async () => {
		expect(await find('class', 'tr')).toEqual([`${V}Tree`]);
		expect(await find('resource', 'oak')).toEqual([`${V}Oak`]);
		expect(await find('datatype', 'len')).toEqual([`${V}Length`]);
		expect(await find('class', 'oak')).toEqual([]);
	});

	it('offers the resources the document describes and the classes it types them with, though the store does not tell what they are', async () => {
		const store = createStore();
		const gardenGraph = 'http://example.org/garden';

		store.loadTurtle(`${PREAMBLE}
			ex:Garden ex:grows v:Oak .
			ex:Bed a ex:Planter .
		`, gardenGraph, true);

		const options = { catalogue: createCatalogue(store), document: { ...createDocument(), graphs: [DOCUMENT_GRAPH, gardenGraph] } as ITokenizedDocumentContext };

		expect(await find('resource', 'gard', options)).toEqual([`${EX}Garden`]);
		expect(await find('class', 'planter', options)).toEqual([`${EX}Planter`]);
		expect(await find('resource', 'planter', options)).toEqual([`${EX}Planter`]);
		expect(await find('class', 'gard', options)).toEqual([]);
	});

	it('proposes the prefix the workspace uses where the document declares none for the namespace', async () => {
		const [tree] = await createCatalogue().search({ targetType: 'class', text: 'Tree', limit: 1 }, createDocument());

		expect(tree).toMatchObject({ label: 'Tree', prefixedName: 'v:Tree', source: 'workspace', missingPrefix: { prefix: 'v', namespace: V } });
	});

	it('proposes the prefix the workspace uses in a SPARQL query, which declares prefixes too', async () => {
		const [tree] = await createCatalogue().search({ targetType: 'class', text: 'Tree', limit: 1 }, createDocument({}, RdfSyntax.Sparql));

		expect(tree).toMatchObject({ prefixedName: 'v:Tree', missingPrefix: { prefix: 'v', namespace: V } });
	});

	it.each([RdfSyntax.NTriples, RdfSyntax.NQuads])('proposes no prefix in a document written in %s, which writes no prefixed names', async syntax => {
		const [tree] = await createCatalogue().search({ targetType: 'class', text: 'Tree', limit: 1 }, createDocument({}, syntax));

		expect(tree).toMatchObject({ label: 'Tree', source: 'workspace' });
		expect(tree.prefixedName).toBeUndefined();
		expect(tree.missingPrefix).toBeUndefined();
	});

	it('writes a term by the prefixes of the document and ranks it as declared, where the document declares its namespace', async () => {
		const [tree] = await createCatalogue().search({ targetType: 'class', text: 'Tree', limit: 1 }, createDocument({ ex: EX, voc: V }));

		expect(tree).toMatchObject({ prefixedName: 'voc:Tree', source: 'declared' });
		expect(tree.missingPrefix).toBeUndefined();
	});

	it('proposes no prefix the document declares for another namespace', async () => {
		const [tree] = await createCatalogue().search({ targetType: 'class', text: 'Tree', limit: 1 }, createDocument({ v: EX }));

		expect(tree.prefixedName).toBeUndefined();
		expect(tree.missingPrefix).toBeUndefined();
	});

	it('finds a term by the prefixed name it would have with the prefix it proposes', async () => {
		expect(await find('class', 'v:tr')).toEqual([`${V}Tree`]);
	});

	it('writes the terms by the prefixes the document declares now, though the store did not change', async () => {
		const catalogue = createCatalogue();
		const document = createDocument();

		expect((await catalogue.search({ targetType: 'class', text: 'Tree', limit: 1 }, document))[0]).toMatchObject({ source: 'workspace', missingPrefix: { prefix: 'v' } });

		document.namespaces['voc'] = V;

		expect((await catalogue.search({ targetType: 'class', text: 'Tree', limit: 1 }, document))[0]).toMatchObject({ prefixedName: 'voc:Tree', source: 'declared', missingPrefix: undefined });
	});

	it('returns at most as many terms as asked for', async () => {
		expect(await find('predicate', '', { limit: 2 })).toHaveLength(2);
	});

	it('answers only once the workspace is indexed', async () => {
		let indexed!: () => void;
		const whenIndexed = new Promise<void>(resolve => indexed = resolve);
		const catalogue = createCatalogue(createStore(), () => whenIndexed);
		const answered = vi.fn();

		const search = catalogue.search({ targetType: 'class', text: '', limit: 10 }, createDocument()).then(answered);

		await Promise.resolve();
		expect(answered).not.toHaveBeenCalled();

		indexed();
		await search;
		expect(answered).toHaveBeenCalled();
	});

	it('reads the terms anew once the store changed', async () => {
		const store = createStore();
		const catalogue = createCatalogue(store);

		expect(await find('class', 'shrub', { catalogue })).toEqual([]);

		store.loadTurtle(`${PREAMBLE} v:Shrub a owl:Class .`, 'http://example.org/more', true);

		expect(await find('class', 'shrub', { catalogue })).toEqual([`${V}Shrub`]);
	});

	it('tells the languages of the workspace, the most used first, read anew once the store changed', async () => {
		const store = createStore();
		const catalogue = createCatalogue(store);

		store.loadTurtle(`${PREAMBLE} v:Tree rdfs:label "Baum"@de, "Arbre"@fr ; rdfs:comment "Ein Baum"@de .`, 'http://example.org/labels', true);

		expect(await catalogue.getWorkspaceLanguages()).toEqual(['de', 'fr']);

		store.loadTurtle(`${PREAMBLE} v:Oak rdfs:label "Chêne"@fr, "Rouvre"@fr ; rdfs:comment "Le chêne"@fr .`, 'http://example.org/more', true);

		expect(await catalogue.getWorkspaceLanguages()).toEqual(['fr', 'de']);
	});

	it('offers the datatypes of the store by the shape of the values they hold', async () => {
		const [length] = await createCatalogue().search({ targetType: 'datatype', text: 'len', limit: 1 }, createDocument());

		expect(length).toMatchObject({ subject: { value: `${V}Length` }, iconName: 'symbol-text' });
	});

	it('ranks the predicates whose domain the resource of the statement is in first, by the types the caller tells, and tells each its fit', async () => {
		const store = createStore();

		store.loadTurtle(`${PREAMBLE}
			v:height rdfs:domain v:Tree .
			v:hasLeaf rdfs:domain ex:Plant .
		`, 'http://example.org/domains', true);

		const search = { targetType: 'predicate' as const, text: '', limit: 50, statement: { subject: RdfDataFactory.namedNode(`${EX}Elm`) } };
		const options = await createCatalogue(store).search(search, createDocument(), [`${V}Tree`]);
		const fits = Object.fromEntries(options.map(entry => [entry.subject.value, entry.fit]));

		expect(options[0].subject.value).toBe(`${V}height`);
		expect(fits).toMatchObject({ [`${V}height`]: 'fits', [`${V}hasLeaf`]: 'other', [`${EX}grows`]: 'general' });
	});

	it('reads the types of the resource of the statement from the document where the caller tells none', async () => {
		const store = createStore();

		store.loadTurtle(`${PREAMBLE}
			v:height rdfs:domain v:Tree .
		`, 'http://example.org/domains', true);
		store.loadTurtle(`${PREAMBLE}
			ex:Elm a v:Tree .
		`, DOCUMENT_GRAPH, true);

		const search = { targetType: 'predicate' as const, text: 'hei', limit: 5, statement: { subject: RdfDataFactory.namedNode(`${EX}Elm`) } };

		expect((await createCatalogue(store).search(search, createDocument()))[0]).toMatchObject({ subject: { value: `${V}height` }, fit: 'fits' });
	});
});
