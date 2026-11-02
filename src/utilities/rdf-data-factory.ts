import { DataFactory } from 'rdf-data-factory';

/**
 * The shared RDF/JS data factory of the extension and its webviews. It is the factory of
 * `rdf-data-factory`, which the store, the Mentor parsers and serializers create their terms with,
 * so terms created here compare equal to theirs. The module imports nothing else, so webviews can
 * use it.
 */
export const RdfDataFactory = new DataFactory();
