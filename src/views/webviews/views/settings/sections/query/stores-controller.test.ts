import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { StoresSectionController } from '@src/views/webviews/views/settings/sections/query/stores-controller';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({ container: { resolve: vi.fn() } }));

function makeConnectionService(connections: any[]) {
	return {
		getConnections: vi.fn(() => connections),
		updateConnection: vi.fn(async () => {}),
		deleteConnection: vi.fn(async () => {}),
		saveConfiguration: vi.fn(async () => {}),
	};
}

function setup(connections: any[]) {
	const connectionRegistry = makeConnectionService(connections);
	const storeConfigService = { defaultStoreType: 'sparql' };

	(container.resolve as any).mockImplementation((token: any) =>
		token === ServiceToken.SparqlConnectionRegistry ? connectionRegistry : storeConfigService);

	const controller = new StoresSectionController();
	const post = vi.fn();
	(controller as any)._post = post;

	return { controller, post, connectionRegistry };
}

const deleteMessage = { section: 'query.stores', id: 'DeleteStoreProfile', profileId: 'qlever', label: 'QLever' } as any;

describe('StoresSectionController – DeleteStoreProfile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deletes a store with no connections after a simple confirm', async () => {
		const { controller, post } = setup([{ id: 'c1', endpointUrl: 'http://e1', storeType: 'jena' }]);
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Delete' as any);

		await controller.handleMessage(deleteMessage);

		expect(post).toHaveBeenCalledWith(expect.objectContaining({ id: 'StoreProfileDeleted', profileId: 'qlever' }));
	});

	it('does not delete when the simple confirm is cancelled', async () => {
		const { controller, post } = setup([]);
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

		await controller.handleMessage(deleteMessage);

		expect(post).not.toHaveBeenCalled();
	});

	it('falls connections back to the default store type, then deletes the store', async () => {
		const conns = [
			{ id: 'c1', endpointUrl: 'http://e1', storeType: 'qlever' },
			{ id: 'c2', endpointUrl: 'http://e2', storeType: 'qlever' },
			{ id: 'c3', endpointUrl: 'http://e3', storeType: 'jena' },
		];
		const { controller, post, connectionRegistry } = setup(conns);
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('OK' as any);

		await controller.handleMessage(deleteMessage);

		expect(connectionRegistry.updateConnection).toHaveBeenCalledTimes(2);
		expect(connectionRegistry.updateConnection).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', storeType: 'sparql' }));
		expect(connectionRegistry.updateConnection).toHaveBeenCalledWith(expect.objectContaining({ id: 'c2', storeType: 'sparql' }));
		expect(connectionRegistry.deleteConnection).not.toHaveBeenCalled();
		expect(connectionRegistry.saveConfiguration).toHaveBeenCalledOnce();
		expect(post).toHaveBeenCalledWith(expect.objectContaining({ id: 'StoreProfileDeleted', profileId: 'qlever' }));
	});

	it('deletes the affected connections, then deletes the store', async () => {
		const conns = [
			{ id: 'c1', endpointUrl: 'http://e1', storeType: 'qlever' },
			{ id: 'c2', endpointUrl: 'http://e2', storeType: 'jena' },
		];
		const { controller, post, connectionRegistry } = setup(conns);
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Delete Connections' as any);

		await controller.handleMessage(deleteMessage);

		expect(connectionRegistry.deleteConnection).toHaveBeenCalledTimes(1);
		expect(connectionRegistry.deleteConnection).toHaveBeenCalledWith('c1');
		expect(connectionRegistry.updateConnection).not.toHaveBeenCalled();
		expect(connectionRegistry.saveConfiguration).toHaveBeenCalledOnce();
		expect(post).toHaveBeenCalledWith(expect.objectContaining({ id: 'StoreProfileDeleted', profileId: 'qlever' }));
	});

	it('leaves the store and connections untouched when the choice dialog is cancelled', async () => {
		const conns = [{ id: 'c1', endpointUrl: 'http://e1', storeType: 'qlever' }];
		const { controller, post, connectionRegistry } = setup(conns);
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

		await controller.handleMessage(deleteMessage);

		expect(connectionRegistry.updateConnection).not.toHaveBeenCalled();
		expect(connectionRegistry.deleteConnection).not.toHaveBeenCalled();
		expect(connectionRegistry.saveConfiguration).not.toHaveBeenCalled();
		expect(post).not.toHaveBeenCalled();
	});
});

describe('StoresSectionController – StoreScopeChanged', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const scopeChangeMessage = { section: 'query.stores', id: 'StoreScopeChanged', storeId: 'my-store', label: 'My Store', newScope: 'user' } as any;

	it('warns naming connections in the other scope that still reference the store', async () => {
		const conns = [
			{ id: 'c1', endpointUrl: 'http://e1', storeType: 'my-store', configScope: ConfigurationScope.Workspace },
			{ id: 'c2', endpointUrl: 'http://e2', storeType: 'jena', configScope: ConfigurationScope.Workspace },
		];
		const { controller } = setup(conns);
		const warn = vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

		await controller.handleMessage(scopeChangeMessage);

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toContain('http://e1');
		expect(warn.mock.calls[0][0]).not.toContain('http://e2');
	});

	it('does not warn when every referencing connection is in the new scope', async () => {
		const conns = [
			{ id: 'c1', endpointUrl: 'http://e1', storeType: 'my-store', configScope: ConfigurationScope.User },
		];
		const { controller } = setup(conns);
		const warn = vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

		await controller.handleMessage(scopeChangeMessage);

		expect(warn).not.toHaveBeenCalled();
	});

	it('ignores protected connections', async () => {
		const conns = [
			{ id: 'workspace', endpointUrl: 'workspace:', storeType: 'my-store', configScope: ConfigurationScope.Workspace, isProtected: true },
		];
		const { controller } = setup(conns);
		const warn = vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined);

		await controller.handleMessage(scopeChangeMessage);

		expect(warn).not.toHaveBeenCalled();
	});
});
