import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { _RDF } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { DocumentReader } from './document-reader';
import { StyleFallback } from './local-style';
import { LocalStyleDetector } from './local-style-detector';
import { StatementModel } from './statement-model';
import { StatementModelBuilder } from './statement-model-builder';

const EX = 'http://example.org/';
const PREAMBLE = `@prefix ex: <${EX}> .\n@prefix rdf: <${_RDF}> .\n\n`;
const SPACES: StyleFallback = { tabSize: 4, insertSpaces: true };

/**
 * Build the statement model of a Turtle text.
 */
function modelOf(text: string): StatementModel {
	const read = new DocumentReader(RdfSyntax.Turtle).read(text);

	if (!read.ok) {
		throw new Error(read.message);
	}

	return new StatementModelBuilder(text, read.tokens, read.quadContexts).build();
}

describe('LocalStyleDetector', () => {
	it('reads the indentation most predicates of the document are written with', () => {
		const model = modelOf(PREAMBLE + 'ex:s\n  ex:p "x" ;\n  ex:q "y" .\n\nex:t\n    ex:p "z" .\n');

		expect(new LocalStyleDetector(model, SPACES).style.predicateIndent).toBe('  ');
	});

	it('falls back to the editor settings when no predicate is indented', () => {
		const style = new LocalStyleDetector(modelOf(PREAMBLE + 'ex:s ex:p "x" .\n'), SPACES).style;

		expect(style.predicateIndent).toBe('    ');
		expect(style.indentUnit).toBe('    ');
		expect(style.eol).toBe('\n');
	});

	it('indents with tabs when the editor does', () => {
		const style = new LocalStyleDetector(modelOf(PREAMBLE + 'ex:s ex:p "x" .\n'), { tabSize: 4, insertSpaces: false }).style;

		expect(style.predicateIndent).toBe('\t');
		expect(style.indentUnit).toBe('\t');
	});

	it('tells whether rdf:type is written as a', () => {
		expect(new LocalStyleDetector(modelOf(PREAMBLE + 'ex:s a ex:C .\n'), SPACES).style.useTypeKeyword).toBe(true);
		expect(new LocalStyleDetector(modelOf(PREAMBLE + 'ex:s rdf:type ex:C .\n'), SPACES).style.useTypeKeyword).toBe(false);
	});

	it('detects the line ending of the document', () => {
		const text = PREAMBLE.replace(/\n/g, '\r\n') + 'ex:s\r\n    ex:p "x" .\r\n';

		expect(new LocalStyleDetector(modelOf(text), SPACES).style.eol).toBe('\r\n');
	});

	it('takes the line ending the editor settings name', () => {
		expect(new LocalStyleDetector(modelOf(PREAMBLE + 'ex:s ex:p "x" .\n'), { ...SPACES, eol: '\r\n' }).style.eol).toBe('\r\n');
	});
});

describe('LocalStyleDetector.objectsOnePerLine', () => {
	it('tells objects written one per line from objects written on one line', () => {
		const stacked = modelOf(PREAMBLE + 'ex:s ex:p ex:a ,\n    ex:b .\n');
		const inline = modelOf(PREAMBLE + 'ex:s ex:p ex:a , ex:b .\n');

		expect(new LocalStyleDetector(stacked, SPACES).objectsOnePerLine(stacked.blocks[0].groups[0])).toBe(true);
		expect(new LocalStyleDetector(inline, SPACES).objectsOnePerLine(inline.blocks[0].groups[0])).toBe(false);
	});
});

describe('LocalStyleDetector.isSingleLineBlock', () => {
	it('tells a block written on one line from one spanning several', () => {
		const single = modelOf(PREAMBLE + 'ex:s ex:p "x" ; ex:q "y" .\n');
		const multi = modelOf(PREAMBLE + 'ex:s ex:p "x" ;\n    ex:q "y" .\n');

		expect(new LocalStyleDetector(single, SPACES).isSingleLineBlock(single.blocks[0])).toBe(true);
		expect(new LocalStyleDetector(multi, SPACES).isSingleLineBlock(multi.blocks[0])).toBe(false);
	});
});
