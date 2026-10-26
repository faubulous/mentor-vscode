import { PRESET_GRAPHS } from '@src/services/core/preset-graphs';
import { MentorVfsUri } from '@src/providers/mentor-vfs-uri';
import { DocumentContextService } from './document-context-service';
import { IPresetDocumentService } from './preset-document-service.interface';

/**
 * Loads the read-only documents that show the sources of the preset graphs, such as the
 * framework vocabularies and the preset shape graphs, into document contexts. The contexts
 * provide the source ranges of the resources defined in the preset graphs, so that language
 * features such as go to definition can navigate to them.
 *
 * The documents are loaded on demand rather than at startup, because they are only needed
 * when a resource is not defined in the workspace.
 */
export class PresetDocumentService implements IPresetDocumentService {
	/**
	 * The load in progress, shared by concurrent callers.
	 */
	private _pendingLoad: Promise<void> | undefined;

	/**
	 * @param _contextService The service that holds the loaded document contexts.
	 */
	constructor(private readonly _contextService: Pick<DocumentContextService, 'loadDocumentContent'>) { }

	ensureLoaded(): Promise<void> {
		if (!this._pendingLoad) {
			this._pendingLoad = this._loadDocuments().finally(() => {
				this._pendingLoad = undefined;
			});
		}

		return this._pendingLoad;
	}

	/**
	 * Loads every preset document. Documents that are already loaded are returned by the
	 * context service as they are, so contexts that were removed are loaded again.
	 */
	private async _loadDocuments(): Promise<void> {
		for (const graph of PRESET_GRAPHS) {
			await this._contextService.loadDocumentContent(MentorVfsUri.toUri(graph), graph.source);
		}
	}
}
