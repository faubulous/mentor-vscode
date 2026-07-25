import { describe, expect, test, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { SettingsFileStore } from '@src/services/core';
import { SettingsFileEntry } from '@src/services/core/settings-file-store';
import { WorkspaceIdentity } from '@src/utilities/vscode/workspace';
import { ShaclProfileSettingsService } from '@src/services/validation/shacl-profile-settings-service';
import { ShapeReferenceRegistryService } from '@src/services/validation/shape-reference-registry-service';

let filesValue: Record<string, SettingsFileEntry> | undefined;
let workspaceValidation: any;
let listeners: Array<(e: vscode.ConfigurationChangeEvent) => void>;

/**
 * A workspace-identity double. `id` is the already-persisted id (undefined when
 * none yet); `ensured` is what `ensureId()` generates on demand.
 */
function identity(opts: { id?: string; ensured?: string; name?: string }): WorkspaceIdentity {
	let current = opts.id;

	return {
		getId: () => current,
		ensureId: async () => (current = current ?? opts.ensured),
		getName: () => opts.name,
	};
}

function createService(id: WorkspaceIdentity) {
	const store = new SettingsFileStore('files');
	const service = new ShapeReferenceRegistryService(store, new ShaclProfileSettingsService(), id);

	return { store, service };
}

beforeEach(() => {
	filesValue = undefined;
	workspaceValidation = undefined;
	listeners = [];

	(vscode.workspace as any).getConfiguration = (section?: string) => ({
		inspect: (key: string) => {
			const full = `${section ?? 'mentor'}.${key}`;

			if (full === 'mentor.files') {
				return { globalValue: filesValue };
			}

			if (full === 'mentor.shacl.validation') {
				return { globalValue: undefined, workspaceValue: workspaceValidation };
			}

			return undefined;
		},
		update: async (key: string, value: any) => {
			if (key === 'files') {
				filesValue = value;
			}
		},
		get: (_key: string, defaultValue?: any) => defaultValue,
	});

	(vscode.workspace as any).onDidChangeConfiguration = (handler: any) => {
		listeners.push(handler);
		return { dispose: () => listeners.splice(listeners.indexOf(handler), 1) };
	};
});

describe('ShapeReferenceRegistryService', () => {
	test('adds this workspace to files its workspace-scoped profiles reference', async () => {
		filesValue = {
			'shapes/x.ttl': { encoding: 'plain', content: 'x' },
			'shapes/y.ttl': { encoding: 'plain', content: 'y' },
		};
		workspaceValidation = { profiles: { p: { shapes: ['user:///shapes/x.ttl'] } } };

		const { store, service } = createService(identity({ id: 'ws-a', name: 'A' }));

		await service.reconcile();

		expect(store.getReferences('shapes/x.ttl')).toEqual([{ id: 'ws-a', name: 'A' }]);
		expect(store.getReferences('shapes/y.ttl')).toEqual([]);
	});

	test('removes this workspace when it no longer references the file, keeping others', async () => {
		filesValue = {
			'shapes/x.ttl': { encoding: 'plain', content: 'x', references: [{ id: 'ws-a', name: 'A' }, { id: 'ws-b', name: 'B' }] },
		};
		workspaceValidation = { profiles: {} };

		const { store, service } = createService(identity({ id: 'ws-a', name: 'A' }));

		await service.reconcile();

		expect(store.getReferences('shapes/x.ttl')).toEqual([{ id: 'ws-b', name: 'B' }]);
	});

	test('refreshes the display name while keeping the stable id (e.g. after a rename)', async () => {
		filesValue = {
			'shapes/x.ttl': { encoding: 'plain', content: 'x', references: [{ id: 'ws-a', name: 'Old Name' }] },
		};
		workspaceValidation = { profiles: { p: { shapes: ['user:///shapes/x.ttl'] } } };

		const { store, service } = createService(identity({ id: 'ws-a', name: 'New Name' }));

		await service.reconcile();

		expect(store.getReferences('shapes/x.ttl')).toEqual([{ id: 'ws-a', name: 'New Name' }]);
	});

	test('generates the workspace id only when a shape is actually referenced', async () => {
		filesValue = { 'shapes/x.ttl': { encoding: 'plain', content: 'x' } };
		workspaceValidation = { profiles: { p: { shapes: ['user:///shapes/x.ttl'] } } };

		const { store, service } = createService(identity({ ensured: 'ws-new', name: 'New' }));

		await service.reconcile();

		expect(store.getReferences('shapes/x.ttl')).toEqual([{ id: 'ws-new', name: 'New' }]);
	});

	test('does not generate an id or write when no shape is referenced', async () => {
		filesValue = { 'shapes/x.ttl': { encoding: 'plain', content: 'x' } };
		workspaceValidation = { profiles: {} };

		const { store, service } = createService(identity({ ensured: 'ws-new', name: 'New' }));

		await service.reconcile();

		expect(store.getReferences('shapes/x.ttl')).toEqual([]);
	});

	test('is a no-op when no workspace id can be established', async () => {
		filesValue = { 'shapes/x.ttl': { encoding: 'plain', content: 'x' } };
		workspaceValidation = { profiles: { p: { shapes: ['user:///shapes/x.ttl'] } } };

		const { store, service } = createService(identity({ /* no id, no ensured → undefined */ }));

		await service.reconcile();

		expect(store.getReferences('shapes/x.ttl')).toEqual([]);
	});
});
