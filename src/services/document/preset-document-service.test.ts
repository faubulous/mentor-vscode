import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { MentorVfsUri } from '@src/providers/mentor-vfs-uri';
import { PRESET_GRAPHS } from '@src/services/core/preset-graphs';
import { PresetDocumentService } from '@src/services/document/preset-document-service';

describe('PresetDocumentService', () => {
	let loadDocumentContent: ReturnType<typeof vi.fn>;
	let service: PresetDocumentService;

	beforeEach(() => {
		loadDocumentContent = vi.fn(async () => undefined);
		service = new PresetDocumentService({ loadDocumentContent } as any);
	});

	it('loads the document of every preset graph', async () => {
		await service.ensureLoaded();

		expect(loadDocumentContent).toHaveBeenCalledTimes(PRESET_GRAPHS.length);

		for (const graph of PRESET_GRAPHS) {
			expect(loadDocumentContent).toHaveBeenCalledWith(MentorVfsUri.toUri(graph), graph.source);
		}
	});

	it('shares the load in progress between concurrent callers', async () => {
		await Promise.all([service.ensureLoaded(), service.ensureLoaded()]);

		expect(loadDocumentContent).toHaveBeenCalledTimes(PRESET_GRAPHS.length);
	});

	it('loads the documents again on a later call, so that removed contexts are restored', async () => {
		await service.ensureLoaded();
		await service.ensureLoaded();

		expect(loadDocumentContent).toHaveBeenCalledTimes(2 * PRESET_GRAPHS.length);
	});
});
