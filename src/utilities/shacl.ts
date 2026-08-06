import { rdf, sh, SH, Store } from '@faubulous/mentor-rdf';
import { InferenceUri } from '@src/providers/inference-uri';

/**
 * Returns the human-readable label of a SHACL severity IRI (`Violation`,
 * `Warning`, `Info`), or the IRI itself when it is not a known severity.
 */
export function getSeverityLabel(severity: string): string {
	switch (severity) {
		case SH.Violation: return 'Violation';
		case SH.Warning: return 'Warning';
		case SH.Info: return 'Info';
		default: return severity;
	}
}

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
