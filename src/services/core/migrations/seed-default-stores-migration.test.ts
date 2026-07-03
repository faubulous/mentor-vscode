import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { SeedDefaultStoresMigration } from '@src/services/core/migrations/seed-default-stores-migration';
import { DEFAULT_SEED_STORES } from '@src/languages/sparql/services/default-stores';

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(),
}));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn() },
}));

const SEED_VERSION_KEY = 'mentor.sparql.storesSeedVersion';

/** A fake ExtensionContext whose globalState is backed by a Map. */
function createContext(seedVersion = 0) {
	const store = new Map<string, any>();

	if (seedVersion > 0) {
		store.set(SEED_VERSION_KEY, seedVersion);
	}

	return {
		globalState: {
			get: vi.fn((key: string, def?: any) => (store.has(key) ? store.get(key) : def)),
			update: vi.fn(async (key: string, value: any) => { store.set(key, value); }),
		},
	};
}

/** A config double whose `inspect` reports the given global store value and `update` is recorded. */
function createConfig(globalValue: any) {
	const updates: { key: string; value: any; target: number }[] = [];

	const config = {
		inspect: vi.fn((key: string) => (key === 'sparql.stores' ? { globalValue } : undefined)),
		update: vi.fn(async (key: string, value: any, target: number) => { updates.push({ key, value, target }); }),
	};

	return { config, updates };
}

async function useConfig(config: unknown) {
	const { getConfig } = await import('@src/utilities/vscode/config');
	(getConfig as any).mockReturnValue(config);
}

describe('SeedDefaultStoresMigration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('seeds all default stores into global settings when unset and not yet seeded', async () => {
		const context = createContext(0);
		(container.resolve as any).mockReturnValue(context);

		const { config, updates } = createConfig(undefined);
		await useConfig(config);

		await new SeedDefaultStoresMigration().migrate();

		const write = updates.find(u => u.key === 'sparql.stores' && u.target === vscode.ConfigurationTarget.Global);
		expect(write?.value).toEqual(DEFAULT_SEED_STORES);
		expect(context.globalState.update).toHaveBeenCalledWith(SEED_VERSION_KEY, 1);
	});

	test('is a no-op when the current seed version already ran', async () => {
		const context = createContext(1);
		(container.resolve as any).mockReturnValue(context);

		const { config, updates } = createConfig(undefined);
		await useConfig(config);

		await new SeedDefaultStoresMigration().migrate();

		expect(updates).toHaveLength(0);
		expect(context.globalState.update).not.toHaveBeenCalled();
	});

	test('merges missing built-ins into an existing list while preserving the user entries', async () => {
		const context = createContext(0);
		(container.resolve as any).mockReturnValue(context);

		// User already has a customized jena and an unrelated store; qlever/rdf4j are absent.
		const existingJena = { id: 'jena', label: 'My Jena', queries: { listGraphs: 'SELECT 1' } };
		const myStore = { id: 'mine', label: 'My Store' };
		const { config, updates } = createConfig([existingJena, myStore]);
		await useConfig(config);

		await new SeedDefaultStoresMigration().migrate();

		const write = updates.find(u => u.key === 'sparql.stores' && u.target === vscode.ConfigurationTarget.Global);
		const ids = write!.value.map((s: any) => s.id);
		expect(ids).toContain('qlever');
		expect(ids).toContain('rdf4j');
		// Existing entries are preserved (the user's jena is not replaced by the built-in one).
		expect(write!.value.find((s: any) => s.id === 'jena')).toEqual(existingJena);
		expect(write!.value.find((s: any) => s.id === 'mine')).toEqual(myStore);
		expect(context.globalState.update).toHaveBeenCalledWith(SEED_VERSION_KEY, 1);
	});

	test('writes nothing when every built-in is already present, but records the version', async () => {
		const context = createContext(0);
		(container.resolve as any).mockReturnValue(context);

		const { config, updates } = createConfig(DEFAULT_SEED_STORES.map(s => ({ ...s })));
		await useConfig(config);

		await new SeedDefaultStoresMigration().migrate();

		expect(updates.some(u => u.key === 'sparql.stores')).toBe(false);
		expect(context.globalState.update).toHaveBeenCalledWith(SEED_VERSION_KEY, 1);
	});
});
