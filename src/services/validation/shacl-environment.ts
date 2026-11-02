import { DatasetCore } from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';

/**
 * The RDF/JS environment shacl-engine validates with: a data factory of `rdf-data-factory`
 * extended with a `dataset()` method (DatasetCoreFactory).
 *
 * `literal()` must tolerate `null` as the language/datatype argument, because
 * shacl-engine calls `factory.literal(text, message.language || null)` when there
 * is no language tag. The rdf-data-factory implementation treats `null` like
 * `undefined` and returns an `xsd:string` literal.
 */
export const ShaclEnvironment = Object.assign(new DataFactory(), {
	dataset(): DatasetCore {
		return RdfStore.createDefault().asDataset();
	}
});

