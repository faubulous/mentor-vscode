import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { renderTemplateInteractively } from '@src/languages/triplate/triplate-prompt';

function makeCompiled(overrides: Partial<any> = {}) {
	return {
		schema: { params: [] },
		examples: [],
		previewExample: vi.fn(() => 'EXAMPLE'),
		contextFromStrings: (inputs: Record<string, string | undefined>) => inputs,
		render: vi.fn(() => 'MANUAL'),
		...overrides,
	} as any;
}

beforeEach(() => {
	(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
	(vscode.window as any).showInputBox = vi.fn(async () => '');
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.window as any).showInformationMessage = vi.fn(async () => undefined);
});

describe('renderTemplateInteractively', () => {
	it('renders the chosen example via previewExample', async () => {
		const compiled = makeCompiled({ examples: [{ id: 'people' }] });
		(vscode.window as any).showQuickPick = vi.fn(async () => ({ label: 'people', exampleId: 'people' }));

		const rendered = await renderTemplateInteractively(compiled);

		expect(rendered).toBe('EXAMPLE');
		expect(compiled.previewExample).toHaveBeenCalledWith('people');
		expect(compiled.render).not.toHaveBeenCalled();
	});

	it('renders manually entered values when no examples are declared', async () => {
		const compiled = makeCompiled({
			schema: { params: [{ name: 'type', type: { base: { kind: 'iri' }, array: false, optional: false } }] },
		});
		(vscode.window as any).showInputBox = vi.fn(async () => 'http://example.org/Person');

		const rendered = await renderTemplateInteractively(compiled);

		expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
		expect(rendered).toBe('MANUAL');
		expect(compiled.render).toHaveBeenCalledWith({ type: 'http://example.org/Person' });
	});

	it('returns undefined when the example QuickPick is cancelled', async () => {
		const compiled = makeCompiled({ examples: [{ id: 'people' }] });
		(vscode.window as any).showQuickPick = vi.fn(async () => undefined);

		expect(await renderTemplateInteractively(compiled)).toBeUndefined();
		expect(compiled.previewExample).not.toHaveBeenCalled();
	});

	it('reports a render error and returns undefined', async () => {
		const compiled = makeCompiled({
			examples: [{ id: 'people' }],
			previewExample: vi.fn(() => { throw new Error('boom'); }),
		});
		(vscode.window as any).showQuickPick = vi.fn(async () => ({ label: 'people', exampleId: 'people' }));

		expect(await renderTemplateInteractively(compiled)).toBeUndefined();
		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
	});
});
