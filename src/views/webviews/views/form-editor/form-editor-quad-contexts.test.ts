import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { createTurtleDocument } from '@src/utilities/mocks/factories';
import { FormEditorQuadContexts } from './form-editor-quad-contexts';

const TEXT = '@prefix ex: <http://example.org/> .\nex:a ex:p ex:b .\n';

describe('FormEditorQuadContexts', () => {
	it('reads the statements of a parse once, and hands out copies', () => {
		const context = createTurtleDocument('file:///test.ttl', RdfSyntax.Turtle);
		const quads = new FormEditorQuadContexts();

		context.parse(TEXT);

		const read = vi.spyOn(context, 'getQuadContexts');
		const first = quads.of(context);
		const second = quads.of(context);

		expect(read).toHaveBeenCalledTimes(1);
		expect(second).toEqual(first);
		expect(second).not.toBe(first);
	});

	it('reads the statements again once the document is parsed anew', () => {
		const context = createTurtleDocument('file:///test.ttl', RdfSyntax.Turtle);
		const quads = new FormEditorQuadContexts();

		context.parse(TEXT);
		quads.of(context);
		context.parse('@prefix ex: <http://example.org/> .\nex:a ex:q ex:b .\n');

		expect(quads.of(context).map(quad => quad.predicate.value)).toEqual(['http://example.org/q']);
	});
});
