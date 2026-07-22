import type { ShaclBrokenReferences } from '@src/services/validation/shacl-validation-configuration';
import type { ScopeKey } from '@src/utilities/config-scope';

/**
 * Messages exchanged between the Validation > Profiles settings section and its
 * host controller.
 */
export type ValidationProfilesMessages =
	| { id: 'GetShapeCandidates' }
	| { id: 'GetShapeCandidatesResult'; candidates: string[] }
	| { id: 'GetValidationHealth' }
	| { id: 'GetValidationHealthResult'; broken: ShaclBrokenReferences }
	| { id: 'GetProfileMatchPreview'; key: string; includeFiles: string[]; excludeFiles: string[] }
	| { id: 'GetProfileMatchPreviewResult'; key: string; count: number; sample: string[] }
	| { id: 'EditPathPattern'; pattern: string }
	| { id: 'EditPathPatternResult'; pattern?: string }
	| { id: 'OpenShapeGraph'; uri: string }
	| { id: 'OpenPresetShapeGraph'; presetId: string }
	| { id: 'WritePresetShapes'; presetId: string }
	| { id: 'WritePresetShapesResult'; presetId: string; uri?: string; error?: string }
	| { id: 'ValidateProfile'; profileId: string }
	| { id: 'DeleteValidationProfile'; profileId: string; name: string; scope: ScopeKey }
	| { id: 'ValidationProfileDeleted'; profileId: string; scope: ScopeKey }
	// Prompts for a file name, creates a user shape file (user:///shapes/…) seeded
	// with a SHACL skeleton and opens it in an editor. The result carries the
	// canonical graph URI, or none when the prompt was dismissed.
	| { id: 'CreateUserShape' }
	| { id: 'CreateUserShapeResult'; uri?: string }
	// Posted by the webview after a profile deletion has been committed; the host
	// checks for newly orphaned user shape files and offers to delete them.
	| { id: 'CheckOrphanedShapes' };
