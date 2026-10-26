/**
 * Interface for the PresetDocumentService.
 */
export interface IPresetDocumentService {
	/**
	 * Loads the read-only documents that show the sources of the preset graphs into
	 * document contexts, unless they are loaded already.
	 * @returns A promise that resolves when all preset documents are loaded.
	 */
	ensureLoaded(): Promise<void>;
}
