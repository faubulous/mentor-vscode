/**
 * Built-in SHACL validation presets.
 *
 * A preset is a ready-made starting point for a validation profile: a named
 * set of bundled shape graphs with a description. Presets are defined in code
 * (not in `mentor.shacl.validation`) and are never active on their own — the
 * settings UI instantiates a preset into an ordinary, editable profile.
 *
 * This module is intentionally free of `vscode`, `@faubulous/mentor-rdf` and
 * `.ttl` imports so it can be imported by the settings webview bundle as well
 * as by the shape-graph loader.
 */

/**
 * A built-in starting point for a validation profile.
 */
export interface ValidationPreset {
	/**
	 * Stable identifier, used as a React key and to seed the generated profile id.
	 */
	id: string;

	/**
	 * Display name.
	 */
	name: string;

	/**
	 * Human-readable description of what the preset validates.
	 */
	description: string;

	/**
	 * The bundled shape graph version this preset ships (matches the `owl:versionInfo`
	 * in the shape file and the version segment in {@link getVersionedShapeUri}). Bumped
	 * whenever the shapes change materially.
	 */
	version: string;

	/**
	 * Shape graph URIs the instantiated profile references (the unversioned "latest"
	 * ontology IRIs). The versioned identity is derived on demand via
	 * {@link getVersionedShapeUri}.
	 */
	shapes: string[];
}

/**
 * Graph URI of the bundled "Basic Ontology" SHACL shape graph. A w3id.org
 * permanent identifier that redirects to the bundled file's source on GitHub.
 */
export const ONTOLOGY_SHAPES_URI = 'https://w3id.org/mentor/shacl/profiles/ontology';

/**
 * Graph URI of the bundled "Basic Taxonomy" SHACL shape graph. A w3id.org
 * permanent identifier that redirects to the bundled file's source on GitHub.
 */
export const TAXONOMY_SHAPES_URI = 'https://w3id.org/mentor/shacl/profiles/taxonomy';


/**
 * The path patterns a profile created from a preset applies to by default:
 * all recognized RDF files in the workspace.
 */
export const PRESET_DEFAULT_PATHS = ['**/*'];

/**
 * The built-in validation presets offered in the settings UI.
 */
export const VALIDATION_PRESETS: ValidationPreset[] = [
	{
		id: 'ontology',
		name: 'Ontology',
		description: 'Classes, properties and named individuals must have a label, a comment and a reference to the defining ontology.',
		version: '1.0',
		shapes: [ONTOLOGY_SHAPES_URI],
	},
	{
		id: 'taxonomy',
		name: 'Taxonomy',
		description: 'Concepts and schemes must have a preferred label and a definition. Every concept must belong to a scheme.',
		version: '1.0',
		shapes: [TAXONOMY_SHAPES_URI],
	},
];

/**
 * Derives the version-pinned identity of a shape graph URI, e.g.
 * `https://w3id.org/mentor/shacl/profiles/ontology` + `1.0`
 * → `https://w3id.org/mentor/shacl/profiles/ontology/1.0`.
 *
 * This mirrors the `owl:versionIRI` declared in the bundled shape file and the
 * versioned w3id redirect.
 */
export function getVersionedShapeUri(shapeUri: string, version: string): string {
	return `${shapeUri}/${version}`;
}
