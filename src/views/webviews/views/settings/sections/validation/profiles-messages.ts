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
	| { id: 'GetProfileMatchPreview'; key: string; paths: string[] }
	| { id: 'GetProfileMatchPreviewResult'; key: string; count: number; sample: string[] }
	| { id: 'EditPathPattern'; pattern: string }
	| { id: 'EditPathPatternResult'; pattern?: string }
	| { id: 'OpenShapeGraph'; uri: string }
	| { id: 'DeleteValidationProfile'; profileId: string; name: string; scope: ScopeKey }
	| { id: 'ValidationProfileDeleted'; profileId: string; scope: ScopeKey };
