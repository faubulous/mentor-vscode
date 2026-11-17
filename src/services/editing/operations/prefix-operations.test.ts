import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { _RDFS, _SKOS, _XSD } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { EditOperation } from '@src/services/editing/edit-operation';
import { EX, SynthesisFixtureOptions, synthesizeDocument } from '@src/utilities/mocks/edit-synthesis-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const BODY = 'ex:s ex:p 1 .\n';

const DOT = '@prefix dct: <http://purl.org/dc/terms/> .';

/**
 * The declarations of the test documents, as `createSynthesisInput` writes them.
 */
const PREAMBLE = `@prefix ex: <${EX}> .\n@prefix rdfs: <${_RDFS}> .\n@prefix xsd: <${_XSD}> .\n\n`;

/**
 * Declare the SKOS namespace as `skos`.
 * @param prefix The prefix, `skos` when omitted.
 * @param namespace The namespace, the SKOS namespace when omitted.
 * @returns The operation.
 */
function declare(prefix = 'skos', namespace = _SKOS): EditOperation {
	return { op: 'declarePrefix', prefix, namespace };
}

/**
 * Declare prefixes in the test document and return it whole.
 * @param operations The operations.
 * @param options How the document is written.
 * @returns The edited document, or the rejection.
 */
function edit(operations: EditOperation[], options: SynthesisFixtureOptions = {}): string {
	return synthesizeDocument(BODY, operations, options);
}

describe('PrefixOperations.declarePrefixes', () => {
	it('declares a prefix after the last declaration, in the form of the declarations', () => {
		expect(edit([declare()])).toBe(`${PREAMBLE.trimEnd()}\n@prefix skos: <${_SKOS}> .\n\n${BODY}`);
	});

	it('keeps sorted declarations sorted where the settings ask for it, and appends to unsorted ones', () => {
		const unsorted = `@prefix xsd: <${_XSD}> .\n@prefix ex: <${EX}> .\n\n`;

		expect(edit([declare()], { style: { sortPrefixes: true } })).toBe(`@prefix ex: <${EX}> .\n@prefix rdfs: <${_RDFS}> .\n@prefix skos: <${_SKOS}> .\n@prefix xsd: <${_XSD}> .\n\n${BODY}`);
		expect(edit([declare()], { style: { sortPrefixes: true }, preamble: unsorted })).toBe(`${unsorted.trimEnd()}\n@prefix skos: <${_SKOS}> .\n\n${BODY}`);
	});

	it('writes the SPARQL form in the case of the declaration it follows', () => {
		const preamble = `PREFIX ex: <${EX}>\nprefix rdfs: <${_RDFS}>\n\n`;

		expect(edit([declare()], { preamble })).toBe(`${preamble.trimEnd()}\nprefix skos: <${_SKOS}>\n\n${BODY}`);
	});

	it('starts a document without declarations with the declaration and an empty line', () => {
		expect(synthesizeDocument(`<${EX}s> <${EX}p> 1 .\n`, [declare()], { preamble: '' })).toBe(`PREFIX skos: <${_SKOS}>\n\n<${EX}s> <${EX}p> 1 .\n`);
	});

	it('inserts after the comment that ends the line of the last declaration, and after a last line without a line break', () => {
		expect(synthesizeDocument('', [declare()], { preamble: `${DOT} # terms\n` })).toBe(`${DOT} # terms\n@prefix skos: <${_SKOS}> .\n`);
		expect(synthesizeDocument('', [declare()], { preamble: DOT })).toBe(`${DOT}\n@prefix skos: <${_SKOS}> .`);
	});

	it('writes the declarations of one action at one place in the order given', () => {
		expect(edit([declare(), declare('dct', 'http://purl.org/dc/terms/')])).toBe(`${PREAMBLE.trimEnd()}\n@prefix skos: <${_SKOS}> .\n@prefix dct: <http://purl.org/dc/terms/> .\n\n${BODY}`);
	});

	it('lets the other operations of the action write their terms with the prefix, wherever it is listed', () => {
		const subject = RdfDataFactory.namedNode(`${EX}s`);
		const values = [{ kind: 'term' as const, term: RdfDataFactory.namedNode(`${_SKOS}Concept`) }];

		expect(edit([{ op: 'setValues', subject, predicate: `${EX}q`, values }, declare()])).toBe(`${PREAMBLE.trimEnd()}\n@prefix skos: <${_SKOS}> .\n\nex:s ex:p 1 ;\n    ex:q skos:Concept .\n`);
	});

	it('changes nothing where the document declares the prefix for the namespace already', () => {
		expect(edit([declare('rdfs', _RDFS)])).toBe(PREAMBLE + BODY);
	});

	it('refuses a prefix the document or the action declares for another namespace', () => {
		expect(edit([declare('rdfs', _SKOS)])).toBe('rejected:prefixTaken');
		expect(edit([declare(), declare('skos', EX)])).toBe('rejected:prefixTaken');
	});

	it('refuses prefixes that are not valid and a syntax without prefixes', () => {
		expect(edit([declare('1x')])).toBe('rejected:invalidPrefix');
		expect(edit([declare('a.')])).toBe('rejected:invalidPrefix');
		expect(edit([declare('skos', 'http://example.org/a b')])).toBe('rejected:invalidIri');
		expect(synthesizeDocument(`<${EX}s> <${EX}p> "1" .\n`, [declare()], { syntax: RdfSyntax.NTriples })).toBe('rejected:prefixesNotSupported');
	});
});
