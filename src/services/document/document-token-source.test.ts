import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IToken } from '@faubulous/mentor-rdf-parsers';

const workspaceMock = vi.hoisted(() => {
    const textDocuments: any[] = [];
    let changeHandler: ((e: any) => void) | undefined;

    return {
        textDocuments,
        fireChange: (e: any) => changeHandler?.(e),
        onDidChangeTextDocument: (handler: any) => {
            changeHandler = handler;
            return { dispose: () => { changeHandler = undefined; } };
        },
    };
});

vi.mock('vscode', async () => {
    const base = await import('@src/utilities/mocks/vscode');
    return {
        ...base,
        workspace: {
            ...base.workspace,
            textDocuments: workspaceMock.textDocuments,
            onDidChangeTextDocument: workspaceMock.onDidChangeTextDocument,
        },
    };
});

import { DocumentTokenSource } from '@src/services/document/document-token-source';
import { TokenDelivery } from '@src/services/document/document-token-source.interface';

/**
 * Creates a fake context whose `parse` produces the given tokens (mirrors
 * TurtleDocument for token-based contexts, or XmlDocument with `[]`).
 */
function makeContext(tokens: IToken[] = [{ image: 'ex:' } as any]) {
    return {
        parse: vi.fn(() => tokens),
    } as any;
}

function makeDocument(uri: string, text = '@prefix ex: <http://example.org/> .') {
    return { uri: { toString: () => uri }, getText: () => text };
}

describe('DocumentTokenSource', () => {
    beforeEach(() => {
        workspaceMock.textDocuments.length = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('waitForTokens', () => {
        it('resolves immediately with locally produced tokens and updates the context', async () => {
            const uri = 'file:///test.ttl';
            const tokens: IToken[] = [{ image: 'ex:' } as any];
            const context = makeContext(tokens);
            const source = new DocumentTokenSource(() => context);

            workspaceMock.textDocuments.push(makeDocument(uri));

            await expect(source.waitForTokens(uri, 5000)).resolves.toBe(tokens);

            // The context parsed the current document text.
            expect(context.parse).toHaveBeenCalledWith(expect.any(String));
        });

        it('fires onDidDeliverTokens with consumed=true for a local delivery', async () => {
            const uri = 'file:///test.ttl';
            const context = makeContext();
            const source = new DocumentTokenSource(() => context);
            const deliveries: TokenDelivery[] = [];

            workspaceMock.textDocuments.push(makeDocument(uri));
            source.onDidDeliverTokens(d => deliveries.push(d));

            await source.waitForTokens(uri, 5000);

            expect(deliveries).toHaveLength(1);
            expect(deliveries[0].consumed).toBe(true);
        });

        it('resolves with an empty token array for structurally parsed documents (RDF/XML)', async () => {
            const uri = 'file:///test.rdf';
            const context = makeContext([]);
            const source = new DocumentTokenSource(() => context);

            workspaceMock.textDocuments.push(makeDocument(uri, '<rdf:RDF/>'));

            await expect(source.waitForTokens(uri, 5000)).resolves.toEqual([]);
            expect(context.parse).toHaveBeenCalledWith('<rdf:RDF/>');
        });

        it('falls back to the delivery protocol when the document is not open', async () => {
            const uri = 'file:///closed.ttl';
            const context = makeContext();
            const source = new DocumentTokenSource(() => context);

            const promise = source.waitForTokens(uri, 5000);

            // No local parse possible — an external delivery resolves the wait.
            const tokens: IToken[] = [];
            source.deliverTokens(uri, tokens);

            await expect(promise).resolves.toBe(tokens);
            expect(context.parse).not.toHaveBeenCalled();
        });

        it('parses a caller-supplied document without searching workspace.textDocuments', async () => {
            const uri = 'file:///indexed.ttl';
            const tokens: IToken[] = [{ image: 'ex:' } as any];
            const context = makeContext(tokens);
            const source = new DocumentTokenSource(() => context);

            // The document is NOT in workspace.textDocuments (as during bulk
            // indexing, when VS Code may have dropped the just-opened document).
            // Passing it directly must still resolve locally instead of waiting
            // for a delivery that never comes.
            const document = makeDocument(uri, '@prefix ex: <http://example.org/> .') as any;

            await expect(source.waitForTokens(uri, 5000, document)).resolves.toBe(tokens);
            expect(context.parse).toHaveBeenCalledWith('@prefix ex: <http://example.org/> .');
        });
    });

    describe('document edits', () => {
        it('re-parses after the debounce delay and fires an unconsumed delivery', () => {
            vi.useFakeTimers();

            const uri = 'file:///test.ttl';
            const context = makeContext();
            const source = new DocumentTokenSource(() => context);
            const deliveries: TokenDelivery[] = [];

            workspaceMock.textDocuments.push(makeDocument(uri));
            source.onDidDeliverTokens(d => deliveries.push(d));

            workspaceMock.fireChange({ document: makeDocument(uri) });

            // Nothing happens until the debounce elapses.
            expect(deliveries).toHaveLength(0);

            vi.advanceTimersByTime(300);

            expect(deliveries).toHaveLength(1);
            expect(deliveries[0].consumed).toBe(false);
            expect(context.parse).toHaveBeenCalled();
        });

        it('coalesces rapid edits into a single re-parse', () => {
            vi.useFakeTimers();

            const uri = 'file:///test.ttl';
            const context = makeContext();
            const source = new DocumentTokenSource(() => context);
            const deliveries: TokenDelivery[] = [];

            workspaceMock.textDocuments.push(makeDocument(uri));
            source.onDidDeliverTokens(d => deliveries.push(d));

            workspaceMock.fireChange({ document: makeDocument(uri) });
            vi.advanceTimersByTime(100);
            workspaceMock.fireChange({ document: makeDocument(uri) });
            vi.advanceTimersByTime(300);

            expect(deliveries).toHaveLength(1);
        });

        it('ignores edits of documents without a loaded context', () => {
            vi.useFakeTimers();

            const uri = 'file:///unknown.txt';
            const source = new DocumentTokenSource(() => undefined);
            const deliveries: TokenDelivery[] = [];

            workspaceMock.textDocuments.push(makeDocument(uri, 'plain text'));
            source.onDidDeliverTokens(d => deliveries.push(d));

            workspaceMock.fireChange({ document: makeDocument(uri) });
            vi.advanceTimersByTime(300);

            expect(deliveries).toHaveLength(0);
        });
    });

    describe('refreshTokens', () => {
        it('re-parses an open document and fires an unconsumed delivery', () => {
            const uri = 'file:///test.ttl';
            const context = makeContext();
            const source = new DocumentTokenSource(() => context);
            const deliveries: TokenDelivery[] = [];

            workspaceMock.textDocuments.push(makeDocument(uri));
            source.onDidDeliverTokens(d => deliveries.push(d));

            expect(source.refreshTokens(uri)).toBe(true);
            expect(context.parse).toHaveBeenCalled();
            expect(deliveries).toHaveLength(1);
            expect(deliveries[0].consumed).toBe(false);
        });

        it('refreshes structurally parsed documents (RDF/XML) locally', () => {
            const uri = 'file:///test.rdf';
            const context = makeContext([]);
            const source = new DocumentTokenSource(() => context);

            workspaceMock.textDocuments.push(makeDocument(uri, '<rdf:RDF/>'));

            expect(source.refreshTokens(uri)).toBe(true);
            expect(context.parse).toHaveBeenCalled();
        });

        it('returns false when the document is not open', () => {
            const uri = 'file:///closed.ttl';
            const source = new DocumentTokenSource(() => makeContext());

            expect(source.refreshTokens(uri)).toBe(false);
        });
    });

    describe('dispose', () => {
        it('cancels pending re-parses and unsubscribes from edits', () => {
            vi.useFakeTimers();

            const uri = 'file:///test.ttl';
            const context = makeContext();
            const source = new DocumentTokenSource(() => context);
            const deliveries: TokenDelivery[] = [];

            workspaceMock.textDocuments.push(makeDocument(uri));
            source.onDidDeliverTokens(d => deliveries.push(d));

            workspaceMock.fireChange({ document: makeDocument(uri) });
            source.dispose();
            vi.advanceTimersByTime(300);

            expect(deliveries).toHaveLength(0);
        });
    });

	describe('waitForTokens (delivery protocol)', () => {
		it('resolves with the delivered tokens', async () => {
			const service = new DocumentTokenSource(() => undefined);
			const uri = 'file:///test.sparql';
			const tokens: IToken[] = [{ image: 'PREFIX' } as any];

			const promise = service.waitForTokens(uri, 5000);
			service.deliverTokens(uri, tokens);

			await expect(promise).resolves.toBe(tokens);
		});

		it('cancels the first call when a second call is made for the same URI', async () => {
			const service = new DocumentTokenSource(() => undefined);
			const uri = 'file:///test.sparql';

			const first = service.waitForTokens(uri, 5000);
			const second = service.waitForTokens(uri, 5000);

			service.deliverTokens(uri, []);

			await expect(first).rejects.toThrow(/superseded/);
			await expect(second).resolves.toBeDefined();
		});

		it('rejects on timeout', async () => {
			vi.useFakeTimers();
			const service = new DocumentTokenSource(() => undefined);
			const uri = 'file:///test.sparql';

			const promise = service.waitForTokens(uri, 200);
			vi.advanceTimersByTime(200);

			await expect(promise).rejects.toThrow(/Timeout/);
		});

		it('does not resolve a waiter for a different URI', async () => {
			vi.useFakeTimers();
			const service = new DocumentTokenSource(() => undefined);

			const promise = service.waitForTokens('file:///a.ttl', 200);
			service.deliverTokens('file:///b.ttl', []);

			vi.advanceTimersByTime(200);

			await expect(promise).rejects.toThrow(/Timeout/);
		});
	});

	describe('deliverTokens', () => {
		it('fires onDidDeliverTokens with consumed=true when a waiter existed', async () => {
			const service = new DocumentTokenSource(() => undefined);
			const uri = 'file:///test.ttl';
			const tokens: IToken[] = [];
			const deliveries: TokenDelivery[] = [];

			service.onDidDeliverTokens(d => deliveries.push(d));

			const promise = service.waitForTokens(uri, 5000);
			service.deliverTokens(uri, tokens);
			await promise;

			expect(deliveries).toHaveLength(1);
			expect(deliveries[0]).toEqual({ uri, tokens, consumed: true });
		});

		it('fires onDidDeliverTokens with consumed=false when no waiter existed', () => {
			const service = new DocumentTokenSource(() => undefined);
			const uri = 'file:///test.ttl';
			const tokens: IToken[] = [];
			const deliveries: TokenDelivery[] = [];

			service.onDidDeliverTokens(d => deliveries.push(d));

			service.deliverTokens(uri, tokens);

			expect(deliveries).toHaveLength(1);
			expect(deliveries[0]).toEqual({ uri, tokens, consumed: false });
		});

		it('does not throw when delivering without any waiter or listener', () => {
			const service = new DocumentTokenSource(() => undefined);

			expect(() => service.deliverTokens('file:///test.ttl', [])).not.toThrow();
		});
	});

	describe('load generations', () => {
		it('starts at 1 and increments per beginLoad', () => {
			const service = new DocumentTokenSource(() => undefined);
			const uri = 'file:///test.ttl';

			expect(service.beginLoad(uri)).toBe(1);
			expect(service.beginLoad(uri)).toBe(2);
		});

		it('tracks generations per URI independently', () => {
			const service = new DocumentTokenSource(() => undefined);

			expect(service.beginLoad('file:///a.ttl')).toBe(1);
			expect(service.beginLoad('file:///b.ttl')).toBe(1);
		});

		it('reports only the newest generation as current', () => {
			const service = new DocumentTokenSource(() => undefined);
			const uri = 'file:///test.ttl';

			const g1 = service.beginLoad(uri);
			const g2 = service.beginLoad(uri);

			expect(service.isCurrentLoad(uri, g1)).toBe(false);
			expect(service.isCurrentLoad(uri, g2)).toBe(true);
		});

		it('reports false for a URI that never began a load', () => {
			const service = new DocumentTokenSource(() => undefined);

			expect(service.isCurrentLoad('file:///unknown.ttl', 1)).toBe(false);
		});
	});

	describe('refreshTokens', () => {
		it('returns false when there is no context to parse', () => {
			const service = new DocumentTokenSource(() => undefined);

			expect(service.refreshTokens('file:///test.ttl')).toBe(false);
		});
	});

	describe('dispose (delivery protocol)', () => {
		it('rejects all pending waitForTokens requests', async () => {
			const service = new DocumentTokenSource(() => undefined);

			const promise = service.waitForTokens('file:///test.sparql', 10000);
			service.dispose();

			await expect(promise).rejects.toThrow(/disposed/);
		});
	});
});
