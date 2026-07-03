import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
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
	const connectionService = makeConnectionService(connections);
	const storeConfigService = { defaultStoreType: 'sparql' };

	(container.resolve as any).mockImplementation((token: any) =>
		token === ServiceToken.SparqlConnectionService ? connectionService : storeConfigService);

	const controller = new StoresSectionController();
	const post = vi.fn();
	(controller as any)._post = post;

	return { controller, post, connectionService };
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
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined as any);

		await controller.handleMessage(deleteMessage);

		expect(post).not.toHaveBeenCalled();
	});

	it('falls connections back to the default store type, then deletes the store', async () => {
		const conns = [
			{ id: 'c1', endpointUrl: 'http://e1', storeType: 'qlever' },
			{ id: 'c2', endpointUrl: 'http://e2', storeType: 'qlever' },
			{ id: 'c3', endpointUrl: 'http://e3', storeType: 'jena' },
		];
		const { controller, post, connectionService } = setup(conns);
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('OK' as any);

		await controller.handleMessage(deleteMessage);

		expect(connectionService.updateConnection).toHaveBeenCalledTimes(2);
		expect(connectionService.updateConnection).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', storeType: 'sparql' }));
		expect(connectionService.updateConnection).toHaveBeenCalledWith(expect.objectContaining({ id: 'c2', storeType: 'sparql' }));
		expect(connectionService.deleteConnection).not.toHaveBeenCalled();
		expect(connectionService.saveConfiguration).toHaveBeenCalledOnce();
		expect(post).toHaveBeenCalledWith(expect.objectContaining({ id: 'StoreProfileDeleted', profileId: 'qlever' }));
	});

	it('deletes the affected connections, then deletes the store', async () => {
		const conns = [
			{ id: 'c1', endpointUrl: 'http://e1', storeType: 'qlever' },
			{ id: 'c2', endpointUrl: 'http://e2', storeType: 'jena' },
		];
		const { controller, post, connectionService } = setup(conns);
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Delete Connections' as any);

		await controller.handleMessage(deleteMessage);

		expect(connectionService.deleteConnection).toHaveBeenCalledTimes(1);
		expect(connectionService.deleteConnection).toHaveBeenCalledWith('c1');
		expect(connectionService.updateConnection).not.toHaveBeenCalled();
		expect(connectionService.saveConfiguration).toHaveBeenCalledOnce();
		expect(post).toHaveBeenCalledWith(expect.objectContaining({ id: 'StoreProfileDeleted', profileId: 'qlever' }));
	});

	it('leaves the store and connections untouched when the choice dialog is cancelled', async () => {
		const conns = [{ id: 'c1', endpointUrl: 'http://e1', storeType: 'qlever' }];
		const { controller, post, connectionService } = setup(conns);
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined as any);

		await controller.handleMessage(deleteMessage);

		expect(connectionService.updateConnection).not.toHaveBeenCalled();
		expect(connectionService.deleteConnection).not.toHaveBeenCalled();
		expect(connectionService.saveConfiguration).not.toHaveBeenCalled();
		expect(post).not.toHaveBeenCalled();
	});
});
