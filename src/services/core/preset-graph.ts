/**
 * A graph that ships with Mentor and is loaded into the store at startup, such as
 * a framework vocabulary (RDFS, OWL, …) or a preset SHACL shape graph.
 */
export interface PresetGraph {
	/**
	 * The path of the read-only document that shows the graph source, relative to
	 * the root of the `mentor-vfs:` file system (e.g. `vocabularies/rdfs.ttl`).
	 */
	path: string;

	/**
	 * The IRI of the graph the source is loaded into.
	 */
	graphIri: string;

	/**
	 * The Turtle source of the graph.
	 */
	source: string;

	/**
	 * Indicates whether the inference is executed on the graph when it is loaded.
	 */
	executeInference: boolean;
}
