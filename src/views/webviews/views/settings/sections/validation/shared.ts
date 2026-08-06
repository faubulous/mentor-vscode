import { ConfigurationScope } from '@src/utilities/config-scope';

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
	 * Glob/path patterns the profile applies to.
	 */
	includeFiles: string[];

	/**
	 * Glob/path patterns excluded from the profile.
	 */
	excludeFiles: string[];

	/**
	 * Optional human-readable description.
	 */
	description: string;

	/**
	 * Whether the profile's matched files are validated automatically after
	 * workspace indexing.
	 */
	validateOnStartup: boolean;

	/**
	 * Whether matched documents are re-validated automatically as they are edited.
	 */
	validateOnChange: boolean;

	/**
	 * The configuration scope the profile is stored in.
	 */
	scope: ConfigurationScope;
}
