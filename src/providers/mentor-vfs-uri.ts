import * as vscode from 'vscode';
import { PresetGraph } from '@src/services/core/preset-graph';
import { PRESET_GRAPHS } from '@src/services/core/preset-graphs';

/**
 * A helper class for the `mentor-vfs:` URI scheme, which addresses the read-only
 * documents that show the sources of the preset graphs shipped with Mentor, such as
 * `mentor-vfs:/vocabularies/rdfs.ttl` or `mentor-vfs:/shapes/ontology-1.0.0.ttl`.
 *
 * Unlike `workspace:///` and `user:///` URIs, a `mentor-vfs:` URI is not a graph IRI:
 * the triples of a preset graph are stored under its own IRI (see {@link PresetGraph.graphIri}).
 */
export class MentorVfsUri {
	/**
	 * The URI scheme of the preset graph documents.
	 */
	static readonly uriScheme = 'mentor-vfs';

	/**
	 * Returns the URI of the document that shows the source of a preset graph.
	 * @param graph The preset graph.
	 */
	static toUri(graph: PresetGraph): vscode.Uri {
		return vscode.Uri.from({ scheme: this.uriScheme, path: '/' + graph.path });
	}

	/**
	 * Returns the preset graph whose source a URI addresses.
	 * @param uri A document URI.
	 * @returns The preset graph, or `undefined` if the URI does not address one.
	 */
	static getGraph(uri: vscode.Uri): PresetGraph | undefined {
		if (uri.scheme !== this.uriScheme) {
			return undefined;
		}

		const path = uri.path.replace(/^\/+/, '');

		return PRESET_GRAPHS.find(graph => graph.path === path);
	}
}
