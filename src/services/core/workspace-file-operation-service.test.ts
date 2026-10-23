import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

import * as vscode from 'vscode';
import { __events } from '@src/utilities/mocks/vscode';
import { WorkspaceFileOperationService } from '@src/services/core/workspace-file-operation-service';

describe('WorkspaceFileOperationService', () => {
	const renames = [{ oldUri: vscode.Uri.parse('file:///w/old'), newUri: vscode.Uri.parse('file:///w/new') }];
	const deletes = [vscode.Uri.parse('file:///w/deleted.ttl')];
	const changes = new Map([['workspace:/old/a.ttl', 'workspace:/new/a.ttl']]);

	let referenceUpdateService: any;
	let documentConnectionService: any;
	let shaclValidationService: any;
	let service: WorkspaceFileOperationService;

	beforeEach(() => {
		__events.reset();

		referenceUpdateService = {
			buildChangesForRenames: vi.fn(() => changes),
			batchUpdate: vi.fn(async () => undefined),
		};
		documentConnectionService = {
			handleFileRenames: vi.fn(async () => undefined),
		};
		shaclValidationService = {
			settingsSync: {
				migrateShaclSettings: vi.fn(async () => undefined),
				handleFileDeletes: vi.fn(async () => undefined),
			},
		};

		service = new WorkspaceFileOperationService(referenceUpdateService, documentConnectionService, shaclValidationService);
	});

	afterEach(() => {
		service.dispose();
	});

	describe('handleRenames', () => {
		it('computes the reference changes before awaiting the settings migrations', async () => {
			await service.handleRenames(renames);

			const buildOrder = referenceUpdateService.buildChangesForRenames.mock.invocationCallOrder[0];

			expect(buildOrder).toBeLessThan(documentConnectionService.handleFileRenames.mock.invocationCallOrder[0]);
			expect(buildOrder).toBeLessThan(shaclValidationService.settingsSync.migrateShaclSettings.mock.invocationCallOrder[0]);
		});

		it('applies the computed reference changes after migrating the settings', async () => {
			await service.handleRenames(renames);

			expect(referenceUpdateService.buildChangesForRenames).toHaveBeenCalledWith(renames);
			expect(documentConnectionService.handleFileRenames).toHaveBeenCalledWith(renames);
			expect(shaclValidationService.settingsSync.migrateShaclSettings).toHaveBeenCalledWith(renames);
			expect(referenceUpdateService.batchUpdate).toHaveBeenCalledExactlyOnceWith(changes);
		});
	});

	describe('handleDeletes', () => {
		it('prunes the SHACL settings of the deleted files', async () => {
			await service.handleDeletes(deletes);

			expect(shaclValidationService.settingsSync.handleFileDeletes).toHaveBeenCalledExactlyOnceWith(deletes);
		});
	});

	describe('workspace events', () => {
		it('handles files renamed in VS Code', async () => {
			__events.fireDidRenameFiles({ files: renames });

			await vi.waitFor(() => expect(referenceUpdateService.batchUpdate).toHaveBeenCalledWith(changes));
		});

		it('handles files deleted in VS Code', async () => {
			__events.fireDidDeleteFiles({ files: deletes });

			await vi.waitFor(() => expect(shaclValidationService.settingsSync.handleFileDeletes).toHaveBeenCalledWith(deletes));
		});

		it('stops handling events when disposed', () => {
			service.dispose();

			__events.fireDidRenameFiles({ files: renames });
			__events.fireDidDeleteFiles({ files: deletes });

			expect(referenceUpdateService.buildChangesForRenames).not.toHaveBeenCalled();
			expect(shaclValidationService.settingsSync.handleFileDeletes).not.toHaveBeenCalled();
		});
	});
});
