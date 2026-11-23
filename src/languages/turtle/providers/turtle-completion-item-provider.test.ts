import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// The default prefix declaration resolves its service from the container, which the tests replace.
vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (_target: unknown) => _target,
	inject: () => () => undefined,
	singleton: () => (_target: unknown) => _target
}));

import * as vscode from 'vscode';
import { RDF } from '@faubulous/mentor-rdf';
import { TurtleLexer } from '@faubulous/mentor-rdf-parsers';
import { TurtleCompletionItemProvider } from '@src/languages/turtle/providers/turtle-completion-item-provider';
import { TermCatalogueService } from '@src/services/vocabulary/term-catalogue-service';
import { ResourceOptionData, TermSearch } from '@src/services/vocabulary/term-search';
import { createMockTextDocument } from '@src/utilities/mocks/factories';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const EX = 'http://example.org/';

const V = 'http://example.org/vocabulary#';

const PREAMBLE = `@prefix ex: <${EX}> .\n`;

/**
 * An option of the catalogue for a term of the vocabulary namespace.
 * @param name The local name.
 * @param overrides Other fields of the option.
 * @returns The option.
 */
function option(name: string, overrides: Partial<ResourceOptionData> = {}): ResourceOptionData {
	return { subject: RdfDataFactory.namedNode(V + name), label: name, prefixedName: `v:${name}`, source: 'declared', ...overrides };
}

/**
 * Complete a Turtle text at the position marked by `|`, over a catalogue that answers with the
 * given options and records the searches.
 * @param marked The text with the cursor marked.
 * @param options The options the catalogue answers with.
 * @returns The completion list, the searches made and the edits that declared prefixes.
 */
async function complete(marked: string, options: ResourceOptionData[] = []) {
	const cursor = marked.indexOf('|');
	const text = marked.slice(0, cursor) + marked.slice(cursor + 1);
	const document = createMockTextDocument(text);
	const tokens = new TurtleLexer().tokenize(text).tokens;
	const context = { tokenizeDocument: () => tokens, namespaces: { ex: EX, v: V }, getResourceDescription: (iri: string) => iri === V + 'Tree' ? { value: 'A woody plant.' } : undefined };
	const contextService = { isLoading: () => false, getDocumentContext: () => context };
	const searches: TermSearch[] = [];
	const catalogue = { search: async (search: TermSearch) => (searches.push(search), options) } as unknown as TermCatalogueService;
	const declared: string[] = [];
	const prefixEdits = async (_document: vscode.TextDocument, prefix: string, namespace: string) => (declared.push(`${prefix} ${namespace}`), [vscode.TextEdit.insert(new vscode.Position(0, 0), `@prefix ${prefix}: <${namespace}> .\n`)]);
	const provider = new TurtleCompletionItemProvider(contextService as never, catalogue, prefixEdits);
	const list = await provider.provideCompletionItems(document, document.positionAt(cursor), new vscode.CancellationTokenSource().token, { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }) as vscode.CompletionList | null;

	return { list, searches, declared };
}

describe('TurtleCompletionItemProvider', () => {
	it('searches the predicates that fit the subject for the prefixed name typed, and replaces the name with the one picked', async () => {
		const { list, searches } = await complete(`${PREAMBLE}ex:Oak v:hei|`, [option('height'), option('heightInCm')]);

		expect(searches).toEqual([{ targetType: 'predicate', text: 'v:hei', limit: 50, statement: { subject: RdfDataFactory.namedNode(EX + 'Oak') } }]);
		expect(list!.isIncomplete).toBe(true);
		expect(list!.items.map(item => item.insertText)).toEqual(['v:height', 'v:heightInCm']);
		expect(list!.items[0].range).toEqual(new vscode.Range(1, 7, 1, 12));
		expect(list!.items.map(item => item.sortText)).toEqual(['0000', '0001']);
		expect(list!.items[0].filterText).toBe('v:hei');
	});

	it('searches classes for a bare word typed as the object of a, by their labels too', async () => {
		const { list, searches } = await complete(`${PREAMBLE}ex:Oak a Tre|`, [option('Tree')]);

		expect(searches[0]).toMatchObject({ targetType: 'class', text: 'Tre', statement: { subject: RdfDataFactory.namedNode(EX + 'Oak'), predicate: RDF.type } });
		expect(list!.items[0]).toMatchObject({ insertText: 'v:Tree', range: new vscode.Range(1, 9, 1, 12), detail: 'A woody plant.', kind: vscode.CompletionItemKind.Value });
	});

	it('shows the prefixed name with the label beside it, and the IRI where the term has no prefixed name', async () => {
		const { list } = await complete(`${PREAMBLE}ex:Oak ex:p |`, [option('Tree', { label: 'Tree of life', iconName: 'mentor-rdf-class' }), option('leaf', { prefixedName: undefined })]);

		expect(list!.items[0].label).toEqual({ label: 'v:Tree', description: 'Tree of life' });
		expect(list!.items[0].kind).toBe(vscode.CompletionItemKind.Class);
		expect(list!.items[1].insertText).toBe(`<${V}leaf>`);
	});

	it('searches by the whole word where the lexer reads its last letter as the keyword a', async () => {
		const { list, searches } = await complete(`${PREAMBLE}ex:Oak ex:p ex:o ;\n\tla|`, [option('label')]);

		expect(searches[0]).toMatchObject({ targetType: 'predicate', text: 'la', statement: { subject: RdfDataFactory.namedNode(EX + 'Oak') } });
		expect(list!.items[0].range).toEqual(new vscode.Range(2, 1, 2, 3));
	});

	it('searches datatypes after ^^', async () => {
		const { searches } = await complete(`${PREAMBLE}ex:Oak ex:planted "2024-02-29"^^xs|`);

		expect(searches[0]).toMatchObject({ targetType: 'datatype', text: 'xs' });
	});

	it('declares the prefix of a term of an undeclared namespace as it is accepted', async () => {
		const { list, declared } = await complete(`${PREAMBLE}ex:Oak a sch|`, [option('Thing', { prefixedName: 'schema:Thing', missingPrefix: { prefix: 'schema', namespace: 'https://schema.org/' } })]);

		expect(declared).toEqual(['schema https://schema.org/']);
		expect(list!.items[0].additionalTextEdits).toHaveLength(1);
	});

	it('completes nothing in a literal, on the keyword a, after an object, or in a prefix declaration', async () => {
		expect((await complete(`${PREAMBLE}ex:Oak ex:p "Tre|e" .`)).searches).toEqual([]);
		expect((await complete(`${PREAMBLE}ex:Oak a|`)).list).toBeNull();
		expect((await complete(`${PREAMBLE}ex:Oak ex:p ex:o |`)).list).toBeNull();
		expect((await complete(`@prefix e|`)).list).toBeNull();
	});
});
