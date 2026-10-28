import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { FocusHint } from '@src/views/webviews/views/form-editor/form-editor-model';
import { createResolvingDocumentContext, readTurtleQuadContexts } from '@src/utilities/mocks/factories';
import { DOCUMENT_RESOURCE_ID, FocusHintResolver, FocusPoint } from './focus-hint-resolver';
import { ResourceIndexBuilder } from './resource-index-builder';

const EX = 'http://example.org/';
const NAMESPACES = { ex: EX };
const PREAMBLE = `@prefix ex: <${EX}> .\n`;

/**
 * Resolve a focus point at the offset of a fragment of a Turtle body.
 */
function resolve(body: string, fragment: string, target: FocusPoint['target']): FocusHint | undefined {
	const text = PREAMBLE + body;
	const context = createResolvingDocumentContext({ namespaces: NAMESPACES });
	const index = new ResourceIndexBuilder(readTurtleQuadContexts(text), context).build();

	return new FocusHintResolver(index, context).resolve({ offset: text.indexOf(fragment), target });
}

describe('FocusHintResolver', () => {
	it('resolves a subject to its resource', () => {
		expect(resolve('ex:s ex:p ex:a .\nex:t ex:p ex:b .\n', 'ex:t', 'subject')).toEqual({ resourceId: `i:${EX}t`, target: 'subject' });
	});

	it('resolves a predicate to its row', () => {
		expect(resolve('ex:s ex:p ex:a ;\n    ex:q ex:b .\n', 'ex:q', 'predicate')).toEqual({ resourceId: `i:${EX}s`, propertyIndex: 1, target: 'predicate' });
	});

	it('resolves a value to its cell', () => {
		expect(resolve('ex:s ex:p ex:a , ex:b ;\n    ex:q ex:c .\n', 'ex:b', 'value')).toEqual({ resourceId: `i:${EX}s`, propertyIndex: 0, valueIndex: 1, target: 'value' });
	});

	it('hands the focus on a nested node to the node itself', () => {
		const hint = resolve('ex:s ex:p [ ex:q "x" ] .\n', '[', 'value');

		expect(hint).toMatchObject({ parentId: `i:${EX}s`, propertyIndex: 0, valueIndex: 0, target: 'addProperty' });
		expect(hint?.resourceId.startsWith('b:')).toBe(true);
	});

	it('resolves an item of a collection through the value holding it', () => {
		expect(resolve('ex:s ex:p ( ex:a ex:b ) .\n', 'ex:b', 'value')).toEqual({ resourceId: `i:${EX}s`, propertyIndex: 0, valueIndex: 0, itemIndex: 1, target: 'value' });
	});

	it('resolves a comment to the resource it is written above, or to the document when it closes it', () => {
		expect(resolve('# about s\nex:s ex:p ex:a ;\n    # about q\n    ex:q ex:b .\n', '# about q', 'comment')).toEqual({ resourceId: `i:${EX}s`, target: 'comment' });
		expect(resolve('# about s\nex:s ex:p ex:a .\n', '# about s', 'comment')).toEqual({ resourceId: `i:${EX}s`, target: 'comment' });
		expect(resolve('ex:s ex:p ex:a .\n\n# the end\n', '# the end', 'comment')).toEqual({ resourceId: DOCUMENT_RESOURCE_ID, target: 'comment' });
		expect(resolve('ex:s ex:p ex:a .\n', 'ex:p', 'comment')).toBeUndefined();
	});

	it('resolves nothing at an offset without a term of the kind', () => {
		expect(resolve('ex:s ex:p ex:a .\n', 'ex:a', 'predicate')).toBeUndefined();
		expect(resolve('ex:s ex:p ex:a .\n', 'ex:p', 'value')).toBeUndefined();
	});
});
