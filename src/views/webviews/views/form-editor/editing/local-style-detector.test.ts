import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { readDocument } from './document-reader';
import { detectLocalStyle, isSingleLineBlock, objectsOnePerLine, StyleFallback } from './local-style-detector';
import { StatementModel } from './statement-model';
import { buildStatementModel } from './statement-model-builder';

const EX = 'http://example.org/';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const PREAMBLE = `@prefix ex: <${EX}> .\n@prefix rdf: <${RDF}> .\n\n`;
const SPACES: StyleFallback = { tabSize: 4, insertSpaces: true };

/**
 * Build the statement model of a Turtle text.
 */
function modelOf(text: string): StatementModel {
	const read = readDocument(RdfSyntax.Turtle, text);

	if (!read.ok) {
		throw new Error(read.message);
	}

	return buildStatementModel(text, read.tokens, read.quadContexts);
}

describe('detectLocalStyle', () => {
	it('reads the indentation most predicates of the document are written with', () => {
		const model = modelOf(PREAMBLE + 'ex:s\n  ex:p "x" ;\n  ex:q "y" .\n\nex:t\n    ex:p "z" .\n');

		expect(detectLocalStyle(model, SPACES).predicateIndent).toBe('  ');
	});

	it('falls back to the editor settings when no predicate is indented', () => {
		const style = detectLocalStyle(modelOf(PREAMBLE + 'ex:s ex:p "x" .\n'), SPACES);

		expect(style.predicateIndent).toBe('    ');
		expect(style.indentUnit).toBe('    ');
		expect(style.eol).toBe('\n');
	});

	it('indents with tabs when the editor does', () => {
		const style = detectLocalStyle(modelOf(PREAMBLE + 'ex:s ex:p "x" .\n'), { tabSize: 4, insertSpaces: false });

		expect(style.predicateIndent).toBe('\t');
		expect(style.indentUnit).toBe('\t');
	});

	it('tells whether rdf:type is written as a', () => {
		expect(detectLocalStyle(modelOf(PREAMBLE + 'ex:s a ex:C .\n'), SPACES).useTypeKeyword).toBe(true);
		expect(detectLocalStyle(modelOf(PREAMBLE + 'ex:s rdf:type ex:C .\n'), SPACES).useTypeKeyword).toBe(false);
	});

	it('detects the line ending of the document', () => {
		const text = PREAMBLE.replace(/\n/g, '\r\n') + 'ex:s\r\n    ex:p "x" .\r\n';

		expect(detectLocalStyle(modelOf(text), SPACES).eol).toBe('\r\n');
	});

	it('takes the line ending the editor settings name', () => {
		expect(detectLocalStyle(modelOf(PREAMBLE + 'ex:s ex:p "x" .\n'), { ...SPACES, eol: '\r\n' }).eol).toBe('\r\n');
	});
});

describe('objectsOnePerLine', () => {
	it('tells objects written one per line from objects written on one line', () => {
		const stacked = modelOf(PREAMBLE + 'ex:s ex:p ex:a ,\n    ex:b .\n');
		const inline = modelOf(PREAMBLE + 'ex:s ex:p ex:a , ex:b .\n');

		expect(objectsOnePerLine(stacked, stacked.blocks[0].groups[0])).toBe(true);
		expect(objectsOnePerLine(inline, inline.blocks[0].groups[0])).toBe(false);
	});
});

describe('isSingleLineBlock', () => {
	it('tells a block written on one line from one spanning several', () => {
		const single = modelOf(PREAMBLE + 'ex:s ex:p "x" ; ex:q "y" .\n');
		const multi = modelOf(PREAMBLE + 'ex:s ex:p "x" ;\n    ex:q "y" .\n');

		expect(isSingleLineBlock(single, single.blocks[0])).toBe(true);
		expect(isSingleLineBlock(multi, multi.blocks[0])).toBe(false);
	});
});
