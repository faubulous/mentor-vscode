import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const configuredSettings: Record<string, any> = {};

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (key: string, fallback?: any) => configuredSettings[key] ?? fallback }),
}));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { copySparqlQueryResults } from '@src/commands/sparql/copy-sparql-query-results';

/**
 * Returns an execution context holding a single-row bindings result.
 */
function givenBindings(): any {
	return {
		result: {
			type: 'bindings',
			columns: ['s', 'label'],
			rows: [{
				s: { termType: 'NamedNode', value: 'http://xmlns.com/foaf/0.1/Person' },
				label: { termType: 'Literal', value: 'Alice' },
			}],
			namespaceMap: { 'http://xmlns.com/foaf/0.1/': 'foaf' },
		}
	};
}

/**
 * Returns the text the handler wrote to the clipboard.
 */
function getCopiedText(): string {
	return (vscode.env.clipboard.writeText as any).mock.calls[0][0];
}

beforeEach(() => {
	for (const key of Object.keys(configuredSettings)) {
		delete configuredSettings[key];
	}

	(vscode.env as any).clipboard = { writeText: vi.fn(async () => undefined) };
	(vscode.window as any).setStatusBarMessage = vi.fn(() => undefined);
});

describe('copySparqlQueryResults command', () => {
	it('should have correct id', () => {
		expect(copySparqlQueryResults.id).toBe('mentor.command.copySparqlQueryResults');
	});

	it('should not write to the clipboard when there is no tabular result', async () => {
		await copySparqlQueryResults.handler({ result: undefined } as any);

		expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
	});

	it('should not throw when invoked without a context', async () => {
		await expect(copySparqlQueryResults.handler(undefined)).resolves.toBeUndefined();

		expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
	});

	it('should copy as CSV with full IRIs by default', async () => {
		await copySparqlQueryResults.handler(givenBindings());

		expect(getCopiedText()).toBe('"s","label"\n"http://xmlns.com/foaf/0.1/Person","Alice"');
	});

	it('should honour the configured copy format', async () => {
		configuredSettings['resultsCopyFormat'] = 'markdown';

		await copySparqlQueryResults.handler(givenBindings());

		expect(getCopiedText()).toBe('| s | label |\n| --- | --- |\n| http://xmlns.com/foaf/0.1/Person | Alice |');
	});

	it('should honour the configured IRI format', async () => {
		configuredSettings['resultsCopyFormat'] = 'markdown';
		configuredSettings['resultsIriFormat'] = 'prefixed';

		await copySparqlQueryResults.handler(givenBindings());

		expect(getCopiedText()).toContain('| foaf:Person | Alice |');
	});

	it('should prefer an explicitly passed format over the setting', async () => {
		configuredSettings['resultsCopyFormat'] = 'markdown';

		await copySparqlQueryResults.handler(givenBindings(), 'csv');

		expect(getCopiedText()).toContain('"s","label"');
	});

	it('should copy a boolean result', async () => {
		await copySparqlQueryResults.handler({ result: { type: 'boolean', value: true } } as any);

		expect(getCopiedText()).toBe('true');
	});
});
