import { ConfigurationScope } from '@src/utilities/config-scope';
import type { ShaclValidationSettings } from '@src/services/validation/shacl-validation-configuration';

/**
 * The stylesheet id under which `validation.css` is injected once per document,
 * shared by every component of the validation section.
 */
export const VALIDATION_STYLESHEET_ID = 'validation-styles';

/**
 * A single validation profile as edited in the settings UI.
 */
export interface ValidationProfileView {
	/**
	 * The stable profile id (its key in the settings object); empty for a new, unsaved profile.
	 */
	id: string;

	/**
	 * The editable display name; falls back to the id when empty.
	 */
	name: string;

	/**
	 * Shape file URIs referenced by the profile.
	 */
	shapes: string[];

	/**
	 * Path entries (glob patterns or exact paths, `!`-prefixed for exclusions) the profile applies to.
	 */
	paths: string[];

	/**
	 * Optional human-readable description.
	 */
	description: string;

	/**
	 * The configuration scope the profile is stored in.
	 */
	scope: ConfigurationScope;

	/**
	 * Whether the profile is a built-in preset shipped with Mentor (read-only).
	 */
	isProtected?: boolean;
}

/**
 * Reads a per-scope SHACL validation settings object from the section state.
 */
export function readSettings(value: unknown): ShaclValidationSettings {
	return (value && typeof value === 'object' ? value : {}) as ShaclValidationSettings;
}

/**
 * Whether a settings object holds no profiles.
 */
export function isEmptySettings(value: ShaclValidationSettings): boolean {
	return !value.profiles || Object.keys(value.profiles).length === 0;
}

/**
 * Projects a single scope's settings object into profile views tagged with that
 * scope; `isProtected` marks built-in presets shipped via the manifest default.
 */
export function toProfileViews(
	settings: ShaclValidationSettings,
	scope: ConfigurationScope,
	isProtected = false
): ValidationProfileView[] {
	return Object.entries(settings.profiles ?? {}).map(([id, profile]) => ({
		id,
		name: profile?.name ?? '',
		shapes: [...(profile?.shapes ?? [])],
		paths: [...(profile?.paths ?? [])],
		description: profile?.description ?? '',
		scope,
		...(isProtected ? { isProtected: true } : {}),
	}));
}
