import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { getIriResourceId } from './resource-id';
import { DocumentReader } from './document-reader';
import { StatementModel, TokenSpan } from './statement-model';
import { StatementModelBuilder } from './statement-model-builder';

const EX = 'http://example.org/';
const PREAMBLE = `@prefix ex: <${EX}> .\n\n`;

/**
 * Build the statement model of a Turtle body written after the prefix declarations.
 */
function modelOf(body: string): StatementModel {
	const text = PREAMBLE + body;
	const read = new DocumentReader(RdfSyntax.Turtle).read(text);

	if (!read.ok) {
		throw new Error(read.message);
	}

	return new StatementModelBuilder(text, read.tokens, read.quadContexts).build();
}

/**
 * The text a span covers.
 */
function textOf(model: StatementModel, span: TokenSpan): string {
	return model.text.slice(span.start, span.end);
}

describe('StatementModelBuilder', () => {
	it('groups the statements of a subject by predicate in document order', () => {
		const model = modelOf('ex:s ex:p ex:a , ex:b ;\n    ex:q "x" .\n');
		const [block] = model.blocks;

		expect(model.blocks).toHaveLength(1);
		expect(block.subjectId).toBe(getIriResourceId(`${EX}s`));
		expect(block.groups.map(group => group.predicateIri)).toEqual([`${EX}p`, `${EX}q`]);
		expect(block.groups[0].objects.map(object => textOf(model, object))).toEqual(['ex:a', 'ex:b']);
		expect(block.groups[1].objects.map(object => textOf(model, object))).toEqual(['"x"']);
		expect(block.terminator?.image).toBe('.');
	});

	it('lists every block of a subject written more than once', () => {
		const model = modelOf('ex:s ex:p ex:a .\nex:t ex:p ex:b .\nex:s ex:q ex:c .\n');

		expect(model.blocks).toHaveLength(3);
		expect(model.blocksBySubject.get(getIriResourceId(`${EX}s`))).toHaveLength(2);
		expect(model.blocksBySubject.get(getIriResourceId(`${EX}t`))).toHaveLength(1);
	});

	it('marks a blank node written inside its parent as nested', () => {
		const model = modelOf('ex:s ex:p [ ex:q "x" ] .\n');
		const parent = model.blocks.find(block => !block.nested);
		const nested = model.blocks.find(block => block.nested);

		expect(parent?.groups[0].objects[0].quad.object.termType).toBe('BlankNode');
		expect(nested?.subject.termType).toBe('BlankNode');
		expect(nested?.groups.map(group => group.predicateIri)).toEqual([`${EX}q`]);
		expect(nested?.leadingComments).toEqual([]);
	});

	it('keeps the items of a collection in order', () => {
		const model = modelOf('ex:s ex:p ( ex:a ex:b ex:c ) .\n');
		const parent = model.blocks.find(block => !block.nested && block.subject.termType === 'NamedNode');
		const object = parent?.groups[0].objects[0];

		expect(object?.items?.map(item => textOf(model, item))).toEqual(['ex:a', 'ex:b', 'ex:c']);
		expect(model.collections.size).toBe(1);
	});

	it('attaches the comments above a predicate to its group', () => {
		const model = modelOf('ex:s\n    # the label\n    ex:p "x" .\n');

		expect(model.blocks[0].groups[0].leadingComments.map(token => token.image)).toEqual(['# the label']);
	});

	it('attaches the comments above a subject to its block and keeps the closing ones for the document', () => {
		const model = modelOf('# about s\nex:s ex:p "x" .\n\n# the end\n');

		expect(model.blocks[0].leadingComments.map(token => token.image)).toEqual(['# about s']);
		expect(model.documentComments.map(token => token.image)).toEqual(['# the end']);
	});

	it('records the semicolons that trail the last statement of a block', () => {
		const model = modelOf('ex:s ex:p "x" ; .\n');

		expect(model.blocks[0].trailingSemicolons.map(token => token.image)).toEqual([';']);
		expect(model.blocks[0].terminator?.image).toBe('.');
	});

	it('builds an empty model for a document without statements', () => {
		const model = modelOf('');

		expect(model.blocks).toEqual([]);
		expect(model.blocksBySubject.size).toBe(0);
		expect(model.documentComments).toEqual([]);
	});
});
