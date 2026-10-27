import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import 'reflect-metadata';
import * as vscode from 'vscode';
import { __events } from '@src/utilities/mocks/vscode';
import { FORM_EDITOR_FILE_PATTERNS, FormEditorAssociations } from './form-editor-associations';

const FORM = 'mentor.formEditor';

/**
 * The configuration of the window as the tests set it up: the form editor settings and the
 * associations of each scope.
 */
interface Configured {
	enabled?: boolean;
	defaultView?: { global?: string; workspace?: string };
	associations?: { global?: Record<string, string>; workspace?: Record<string, string> };
}

/**
 * The updates a test observed, as `[target, value]`.
 */
type Update = [vscode.ConfigurationTarget, Record<string, string> | undefined];

/**
 * Stub the workspace configuration with the given settings and record the updates of the
 * associations.
 */
function configure(configured: Configured): Update[] {
	const updates: Update[] = [];
	const defaultView = configured.defaultView ?? {};
	const associations = configured.associations ?? {};
	const effectiveDefaultView = defaultView.workspace ?? defaultView.global;

	vi.spyOn(vscode.workspace, 'getConfiguration').mockImplementation((section?: string) => ({
		get: (key: string, fallback?: unknown) => {
			if (section === 'mentor.formEditor' && key === 'enabled') {
				return configured.enabled ?? fallback;
			}

			return section === 'mentor.formEditor' && key === 'defaultView' ? effectiveDefaultView : fallback;
		},
		inspect: (key: string) => {
			if (section === 'mentor.formEditor' && key === 'defaultView') {
				return { globalValue: defaultView.global, workspaceValue: defaultView.workspace };
			}

			return section === 'workbench' && key === 'editorAssociations' ? { globalValue: associations.global, workspaceValue: associations.workspace } : undefined;
		},
		update: async (_key: string, value: Record<string, string> | undefined, target: vscode.ConfigurationTarget) => {
			updates.push([target, value]);
		}
	}) as unknown as vscode.WorkspaceConfiguration);

	return updates;
}

/**
 * The associations of the form editor's patterns.
 */
function formAssociations(): Record<string, string> {
	return Object.fromEntries(FORM_EDITOR_FILE_PATTERNS.map(pattern => [pattern, FORM]));
}

/**
 * Let the service apply the configuration.
 */
async function settle(): Promise<void> {
	await new Promise(resolve => setTimeout(resolve, 0));
}

describe('FormEditorAssociations', () => {
	let service: FormEditorAssociations | undefined;

	beforeEach(() => {
		__events.reset();
	});

	afterEach(() => {
		service?.dispose();
		vi.restoreAllMocks();
	});

	it('associates the RDF files with the form editor in the scope the default view is set in', async () => {
		const updates = configure({ enabled: true, defaultView: { global: 'form' }, associations: { global: { '*.md': 'vscode.markdown.preview.editor' } } });

		service = new FormEditorAssociations();
		await settle();

		expect(updates).toEqual([[vscode.ConfigurationTarget.Global, { '*.md': 'vscode.markdown.preview.editor', ...formAssociations() }]]);
	});

	it('associates in the workspace when the workspace sets the default view', async () => {
		const updates = configure({ enabled: true, defaultView: { global: 'text', workspace: 'form' } });

		service = new FormEditorAssociations();
		await settle();

		expect(updates).toEqual([[vscode.ConfigurationTarget.Workspace, formAssociations()]]);
	});

	it('removes its entries from every scope when the text editor is the default, keeping the others', async () => {
		const updates = configure({
			enabled: true,
			defaultView: { global: 'text' },
			associations: { global: { ...formAssociations(), '*.md': 'vscode.markdown.preview.editor' }, workspace: formAssociations() }
		});

		service = new FormEditorAssociations();
		await settle();

		expect(updates).toEqual([
			[vscode.ConfigurationTarget.Global, { '*.md': 'vscode.markdown.preview.editor' }],
			[vscode.ConfigurationTarget.Workspace, undefined]
		]);
	});

	it('removes its entries while the form editor is disabled, whatever the default view', async () => {
		const updates = configure({ enabled: false, defaultView: { global: 'form' }, associations: { global: formAssociations() } });

		service = new FormEditorAssociations();
		await settle();

		expect(updates).toEqual([[vscode.ConfigurationTarget.Global, undefined]]);
	});

	it('leaves an entry alone that points at another editor', async () => {
		const updates = configure({ enabled: true, defaultView: { global: 'text' }, associations: { global: { '*.ttl': 'other.editor', '*.nt': FORM } } });

		service = new FormEditorAssociations();
		await settle();

		expect(updates).toEqual([[vscode.ConfigurationTarget.Global, { '*.ttl': 'other.editor' }]]);
	});

	it('writes nothing when the associations are in step already', async () => {
		const updates = configure({ enabled: true, defaultView: { global: 'form' }, associations: { global: formAssociations() } });

		service = new FormEditorAssociations();
		await settle();

		expect(updates).toEqual([]);
	});

	it('follows a change of the form editor settings', async () => {
		const updates = configure({ enabled: true, defaultView: { global: 'text' } });

		service = new FormEditorAssociations();
		await settle();

		expect(updates).toEqual([]);

		const later = configure({ enabled: true, defaultView: { global: 'form' } });

		__events.fireDidChangeConfiguration({ affectsConfiguration: (section: string) => section === 'mentor.formEditor' });
		await settle();

		expect(later).toEqual([[vscode.ConfigurationTarget.Global, formAssociations()]]);
	});
});
