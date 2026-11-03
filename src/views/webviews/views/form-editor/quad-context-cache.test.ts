import { describe, expect, it, vi } from 'vitest';
import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { QuadContextCache } from './quad-context-cache';

/**
 * A document context whose tokens can be replaced, reading one quad context per read.
 */
function createContext() {
	const context = {
		tokens: [] as IToken[],
		getQuadContexts: vi.fn((): QuadContext[] => [{} as QuadContext])
	};

	return { context, document: context as unknown as TurtleDocument };
}

describe('QuadContextCache', () => {
	it('reads the quad contexts of a parse once', () => {
		const { context, document } = createContext();
		const cache = new QuadContextCache();
		const first = cache.get(document);

		expect(cache.get(document)).toBe(first);
		expect(context.getQuadContexts).toHaveBeenCalledOnce();
	});

	it('reads them again once the tokens are replaced', () => {
		const { context, document } = createContext();
		const cache = new QuadContextCache();
		const first = cache.get(document);

		context.tokens = [];

		expect(cache.get(document)).not.toBe(first);
		expect(context.getQuadContexts).toHaveBeenCalledTimes(2);
	});
});
