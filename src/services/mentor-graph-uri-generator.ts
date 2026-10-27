import { Quad_Graph } from '@rdfjs/types';
import { GraphUriGenerator } from '@faubulous/mentor-rdf';
import { InferenceUri } from '@src/providers/inference-uri';

/**
 * Names the inference graphs of the store the way Mentor does: `<graph>?inference`, so that an
 * inference graph sorts after its source graph and the prefixes of the source keep working.
 */
export class MentorGraphUriGenerator implements GraphUriGenerator {
	/**
	 * Get the URI of the inference graph of a graph.
	 * @param uri The graph term or URI.
	 * @returns The URI of the inference graph.
	 */
	getGraphUri(uri: string | Quad_Graph): string {
		return InferenceUri.toInferenceUri(MentorGraphUriGenerator._valueOf(uri));
	}

	/**
	 * Check whether a URI names an inference graph.
	 * @param uri The graph term or URI.
	 * @returns `true` if the URI is an inference graph URI, `false` otherwise.
	 */
	isInferenceGraphUri(uri: string | Quad_Graph): boolean {
		return InferenceUri.isInferenceUri(MentorGraphUriGenerator._valueOf(uri));
	}

	/**
	 * Get the URI of a graph term, or the URI itself.
	 */
	private static _valueOf(uri: string | Quad_Graph): string {
		return typeof uri === 'string' ? uri : uri.value;
	}
}
