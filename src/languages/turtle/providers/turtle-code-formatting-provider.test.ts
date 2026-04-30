import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockGetConfig } = vi.hoisted(() => ({
	mockGetConfig: vi.fn(() => ({ get: (_k: string, d?: any) => d })),
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: mockGetConfig,
}));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({
	TurtleFormatter: class TurtleFormatterMock {
		formatFromText(text: string, _options?: any) {
			return { output: text };
		}
	},
}));

import { TurtleCodeFormattingProvider } from '@src/languages/turtle/providers/turtle-code-formatting-provider';

function makeDocument(text: string) {
	return {
		getText: () => text,
		positionAt: (offset: number) => ({ line: 0, character: offset }),
	} as any;
}

function makeOptions(insertSpaces = true, tabSize = 2): any {
	return { insertSpaces, tabSize };
}

describe('TurtleCodeFormattingProvider', () => {
	let provider: TurtleCodeFormattingProvider;

	beforeEach(() => {
		mockGetConfig.mockImplementation(() => ({ get: (_k: string, d?: any) => d }));
		provider = new TurtleCodeFormattingProvider();
	});

	it('constructs without throwing', () => {
		expect(() => new TurtleCodeFormattingProvider()).not.toThrow();
	});

	it('returns a single TextEdit replacing the full document range', () => {
		const doc = makeDocument('@prefix ex: <http://example.org/> .');
		const edits = provider.provideDocumentFormattingEdits(doc, makeOptions(), {} as any);
		expect(Array.isArray(edits)).toBe(true);
		expect(edits).toHaveLength(1);
	});

	it('passes indent based on insertSpaces and tabSize to the formatter', () => {
		const freshProvider = new TurtleCodeFormattingProvider();
		const spy = vi.spyOn((freshProvider as any)._formatter, 'formatFromText');
		const doc = makeDocument('some text');
		freshProvider.provideDocumentFormattingEdits(doc, makeOptions(true, 4), {} as any);

		expect(spy).toHaveBeenCalledWith(
			'some text',
			expect.objectContaining({ indent: '    ' })
		);
	});

	it('uses tab character when insertSpaces is false', () => {
		const freshProvider = new TurtleCodeFormattingProvider();
		const spy = vi.spyOn((freshProvider as any)._formatter, 'formatFromText');
		const doc = makeDocument('some text');
		freshProvider.provideDocumentFormattingEdits(doc, makeOptions(false, 4), {} as any);

		expect(spy).toHaveBeenCalledWith(
			'some text',
			expect.objectContaining({ indent: '\t' })
		);
	});

	it('reads maxLineWidth from config', () => {
		mockGetConfig.mockImplementation(() => ({
			get: (k: string, d?: any) => k === 'maxLineWidth' ? 80 : d,
		}));

		const freshProvider = new TurtleCodeFormattingProvider();
		const spy = vi.spyOn((freshProvider as any)._formatter, 'formatFromText');
		freshProvider.provideDocumentFormattingEdits(makeDocument('text'), makeOptions(), {} as any);

		expect(spy).toHaveBeenCalledWith(
			'text',
			expect.objectContaining({ maxLineWidth: 80 })
		);
	});
});

