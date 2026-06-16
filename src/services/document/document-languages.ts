/**
 * The RDF document language ids Mentor supports as first-class authoring/formatting
 * targets. Single source of truth for everything that needs to enumerate or constrain
 * to these languages (settings webview, formatter, etc.).
 */
export const MENTOR_LANGUAGE_IDS = ['turtle', 'sparql', 'trig', 'n3', 'ntriples', 'nquads'] as const;

/**
 * Union of {@link MENTOR_LANGUAGE_IDS}.
 */
export type LanguageId = typeof MENTOR_LANGUAGE_IDS[number];

/**
 * The subset of {@link MENTOR_LANGUAGE_IDS} for which Mentor provides its own
 * formatter and exposes formatting settings in the Settings webview.
 */
export const FORMATTING_LANGUAGE_IDS = ['turtle', 'sparql'] as const;

/**
 * Union of {@link FORMATTING_LANGUAGE_IDS}.
 */
export type FormattingLanguage = typeof FORMATTING_LANGUAGE_IDS[number];

/**
 * The language IDs whose documents may contain triplate templates — every RDF
 * language Mentor supports except RDF/XML, which is exactly {@link MENTOR_LANGUAGE_IDS}.
 *
 * Single source of truth for registering triplate features (hover, code lens,
 * diagnostics) and for gating template detection.
 */
export const TRIPLATE_LANGUAGE_IDS = new Set<string>(MENTOR_LANGUAGE_IDS);
