import { Store } from '@faubulous/mentor-rdf';
import { getSeverityLabel } from '@src/utilities/shacl';
import { rdfDataFactory } from '@src/utilities/rdf';
import { ShaclValidationResult } from './shacl-validator-engine';

/**
 * Formats a validation result as a plain-text report.
 */
export function formatReportAsText(result: ShaclValidationResult): string {
	const lines: string[] = [];
	lines.push(`SHACL Validation Report`);
	lines.push(`Conforms: ${result.conforms}`);
	lines.push(`Results: ${result.results.length}`);
	lines.push('');

	for (const r of result.results) {
		lines.push(`  Focus Node: ${r.focusNode}`);
		lines.push(`  Severity:   ${getSeverityLabel(r.severity)}`);
		if (r.path) {
			lines.push(`  Path:       ${r.path}`);
		}
		for (const msg of r.messages) {
			lines.push(`  Message:    ${msg}`);
		}
		if (r.value) {
			lines.push(`  Value:      ${r.value}`);
		}
		lines.push(`  Shape:      ${r.sourceShape}`);
		lines.push('');
	}

	return lines.join('\n');
}

/**
 * Serializes a validation result's report dataset as Turtle. The dataset is
 * copied into a temporary store graph because the serializer operates on named
 * graphs of a store rather than on bare datasets.
 */
export async function serializeReportAsTurtle(result: ShaclValidationResult): Promise<string> {
	const tempStore = new Store();
	const tempGraphUri = 'urn:shacl:report';

	for (const q of result.reportDataset) {
		tempStore.add(rdfDataFactory.quad(q.subject, q.predicate, q.object, rdfDataFactory.namedNode(tempGraphUri)));
	}

	return tempStore.serializeGraph(tempGraphUri, 'text/turtle', undefined, {
		'sh': 'http://www.w3.org/ns/shacl#',
		'xsd': 'http://www.w3.org/2001/XMLSchema#',
		'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
	});
}
