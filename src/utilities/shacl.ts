import { rdf, sh, Store } from '@faubulous/mentor-rdf';
import { InferenceUri } from '@src/providers/inference-uri';

/**
 * Returns the sorted URIs of all graphs in the store that contain SHACL shape
 * definitions (`sh:NodeShape` or `sh:PropertyShape`), skipping inference graphs.
 */
export function getShapeGraphCandidates(store: Store): string[] {
	const result: string[] = [];

	for (const graphUri of store.getGraphs().sort()) {
		if (InferenceUri.isInferenceUri(graphUri)) {
			continue;
		}

		const hasShapes =
			store.any(graphUri, null, rdf.type, sh.NodeShape) ||
			store.any(graphUri, null, rdf.type, sh.PropertyShape);

		if (hasShapes) {
			result.push(graphUri);
		}
	}

	return result;
}
